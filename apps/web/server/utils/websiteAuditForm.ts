import { randomBytes } from 'node:crypto'
import { createError } from 'h3'
import type PocketBase from 'pocketbase'
import {
  DEFAULT_BRANDING,
  brandingKeyForOwner,
  normalizeHex,
  type BrandingColors,
} from '~/server/utils/branding'
import {
  formatProspectAuditNotes,
  runProspectAudit,
  type ProspectAudit,
} from '~/server/utils/prospectAudit'
import { normalizeDomain } from '~/server/utils/prospectResearch'
import { ensureDefaultPipelineStages } from '~/server/services/crm/pipelineStages'
import { assertPlanLimit } from '~/server/utils/planGuard'
import { sendTransactionalEmail } from '~/server/utils/sendTransactionalEmail'
import { userCanUseAgencyWhiteLabel } from '~/server/services/subscriptions'
import { lighthouseScoresSummary } from '~/utils/lighthouseScoreMatrix'

export const WEBSITE_AUDIT_FORM_SETTINGS_KEY = 'website_audit_form'
export const WEBSITE_AUDIT_FORM_INDEX_KEY = 'website_audit_form_index'

export type WebsiteAuditLeadStatus = 'received' | 'processing' | 'ready' | 'error'

export interface WebsiteAuditFormSettings {
  enabled: boolean
  publicKey: string
  headline: string
  subheadline: string
  buttonLabel: string
  successMessage: string
  /** After a successful submit, send the visitor here (embed + hosted form). */
  redirectUrl: string
  collectPhone: boolean
  notifyOwnerEmail: boolean
  ownerNotifyEmail: string
}

export interface WebsiteAuditLeadRecord {
  id: string
  user: string
  name?: string | null
  email: string
  phone?: string | null
  website: string
  status: WebsiteAuditLeadStatus
  public_token: string
  audit_json?: ProspectAudit | null
  crm_client?: string | null
  error_text?: string | null
  received_at: string
  email_sent_at?: string | null
  payload_json?: Record<string, unknown> | null
}

export function defaultWebsiteAuditFormSettings(publicKey?: string): WebsiteAuditFormSettings {
  return {
    enabled: true,
    publicKey: publicKey || newPublicKey(),
    headline: 'Free website audit',
    subheadline: 'Enter your details and we’ll email a full SEO and performance report.',
    buttonLabel: 'Get my free audit',
    successMessage: 'Thanks! We’re generating your report and will email it shortly.',
    redirectUrl: '',
    collectPhone: true,
    notifyOwnerEmail: true,
    ownerNotifyEmail: '',
  }
}

export function newPublicKey(): string {
  return `waf_${randomBytes(18).toString('base64url')}`
}

export function newReportToken(): string {
  return `war_${randomBytes(24).toString('base64url')}`
}

export function settingsKeyForOwner(ownerId: string): string {
  return `${WEBSITE_AUDIT_FORM_SETTINGS_KEY}:${ownerId}`
}

function escFilter(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function isSettings(value: unknown): value is WebsiteAuditFormSettings {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.publicKey === 'string' && v.publicKey.trim().length > 0
}

export function normalizeRedirectUrl(raw: string): string {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return u.toString()
  } catch {
    return ''
  }
}

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withProto)
    if (!u.hostname || !u.hostname.includes('.')) return ''
    return u.toString()
  } catch {
    return ''
  }
}

async function upsertAppSetting(
  pb: PocketBase,
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ id: string }>(`key="${escFilter(key)}"`)
    await pb.collection('app_settings').update(row.id, { value })
  } catch {
    await pb.collection('app_settings').create({ key, value })
  }
}

async function getAppSettingValue(pb: PocketBase, key: string): Promise<Record<string, unknown> | null> {
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: Record<string, unknown> }>(`key="${escFilter(key)}"`)
    return row?.value && typeof row.value === 'object' ? row.value : null
  } catch {
    return null
  }
}

/** Map publicKey → ownerId for public embed lookup. */
async function setIndexEntry(pb: PocketBase, publicKey: string, ownerId: string): Promise<void> {
  const current = (await getAppSettingValue(pb, WEBSITE_AUDIT_FORM_INDEX_KEY)) || {}
  // Drop stale keys for this owner
  for (const [k, v] of Object.entries(current)) {
    if (v === ownerId && k !== publicKey) delete current[k]
  }
  current[publicKey] = ownerId
  await upsertAppSetting(pb, WEBSITE_AUDIT_FORM_INDEX_KEY, current)
}

export async function getWebsiteAuditFormSettings(
  pb: PocketBase,
  ownerId: string,
): Promise<WebsiteAuditFormSettings> {
  const value = await getAppSettingValue(pb, settingsKeyForOwner(ownerId))
  if (isSettings(value)) {
    return { ...defaultWebsiteAuditFormSettings(value.publicKey), ...value, publicKey: value.publicKey }
  }
  const created = defaultWebsiteAuditFormSettings()
  await upsertAppSetting(pb, settingsKeyForOwner(ownerId), created as unknown as Record<string, unknown>)
  await setIndexEntry(pb, created.publicKey, ownerId)
  return created
}

export async function saveWebsiteAuditFormSettings(
  pb: PocketBase,
  ownerId: string,
  patch: Partial<WebsiteAuditFormSettings> & { rotateKey?: boolean },
): Promise<WebsiteAuditFormSettings> {
  const current = await getWebsiteAuditFormSettings(pb, ownerId)
  const next: WebsiteAuditFormSettings = {
    ...current,
    enabled: patch.enabled !== undefined ? !!patch.enabled : current.enabled,
    headline: patch.headline !== undefined ? String(patch.headline).trim() || current.headline : current.headline,
    subheadline:
      patch.subheadline !== undefined ? String(patch.subheadline).trim() : current.subheadline,
    buttonLabel:
      patch.buttonLabel !== undefined
        ? String(patch.buttonLabel).trim() || current.buttonLabel
        : current.buttonLabel,
    successMessage:
      patch.successMessage !== undefined
        ? String(patch.successMessage).trim() || current.successMessage
        : current.successMessage,
    redirectUrl:
      patch.redirectUrl !== undefined
        ? normalizeRedirectUrl(String(patch.redirectUrl))
        : current.redirectUrl,
    collectPhone: patch.collectPhone !== undefined ? !!patch.collectPhone : current.collectPhone,
    notifyOwnerEmail:
      patch.notifyOwnerEmail !== undefined ? !!patch.notifyOwnerEmail : current.notifyOwnerEmail,
    ownerNotifyEmail:
      patch.ownerNotifyEmail !== undefined
        ? String(patch.ownerNotifyEmail).trim()
        : current.ownerNotifyEmail,
    publicKey: patch.rotateKey ? newPublicKey() : current.publicKey,
  }
  await upsertAppSetting(pb, settingsKeyForOwner(ownerId), next as unknown as Record<string, unknown>)
  await setIndexEntry(pb, next.publicKey, ownerId)
  return next
}

export async function resolveOwnerIdByPublicKey(
  pb: PocketBase,
  publicKey: string,
): Promise<string | null> {
  const key = String(publicKey || '').trim()
  if (!key) return null
  const index = await getAppSettingValue(pb, WEBSITE_AUDIT_FORM_INDEX_KEY)
  const ownerId = index?.[key]
  return typeof ownerId === 'string' && ownerId.trim() ? ownerId.trim() : null
}

export async function getPublicBrandingForOwner(
  pb: PocketBase,
  ownerId: string,
): Promise<{
  name: string
  colors: BrandingColors
  whiteLabel: boolean
}> {
  const whiteLabel = await userCanUseAgencyWhiteLabel(pb, ownerId)
  let name = ''
  let colors: BrandingColors = { ...DEFAULT_BRANDING }
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: Partial<BrandingColors> & { name?: string } }>(
        `key="${escFilter(brandingKeyForOwner(ownerId))}"`,
      )
    const value = row?.value ?? {}
    name = typeof value.name === 'string' ? value.name.trim() : ''
    colors = {
      primary: normalizeHex(value.primary) || DEFAULT_BRANDING.primary,
      accent: normalizeHex(value.accent) || DEFAULT_BRANDING.accent,
      text: normalizeHex(value.text) || DEFAULT_BRANDING.text,
      surface: normalizeHex(value.surface) || DEFAULT_BRANDING.surface,
    }
  } catch {
    // defaults
  }
  return { name, colors, whiteLabel }
}

export function publicFormDto(
  settings: WebsiteAuditFormSettings,
  branding: Awaited<ReturnType<typeof getPublicBrandingForOwner>>,
  logoUrl: string,
) {
  return {
    enabled: settings.enabled,
    headline: settings.headline,
    subheadline: settings.subheadline,
    buttonLabel: settings.buttonLabel,
    successMessage: settings.successMessage,
    redirectUrl: settings.redirectUrl || '',
    collectPhone: settings.collectPhone,
    branding: {
      name: branding.name || 'Website audit',
      colors: branding.colors,
      logoUrl,
    },
  }
}

export async function createCrmLeadForWebsiteAudit(
  pb: PocketBase,
  ownerId: string,
  input: { name: string; email: string; phone?: string | null; website: string; domain: string },
): Promise<{ id: string; name: string }> {
  await assertPlanLimit(pb, ownerId, 'contacts', 1)
  const stages = await ensureDefaultPipelineStages(pb, ownerId)
  const pipelineStage = stages.find((s) => s.key === 'new')?.key || stages[0]?.key || 'new'
  const name =
    input.name.trim() ||
    input.email.split('@')[0] ||
    input.domain.replace(/\.[a-z.]+$/i, '').replace(/[-_]/g, ' ')

  const client = await pb.collection('crm_clients').create({
    user: ownerId,
    name,
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    company: input.domain,
    status: 'lead',
    pipeline_stage: pipelineStage,
    source: 'Website audit form',
    notes: `Website audit requested for ${input.website}\nStatus: processing`,
    tags_json: ['website-audit', input.domain],
    last_activity_at: new Date().toISOString(),
  })
  return { id: client.id, name: String(client.name || name) }
}

export async function createWebsiteAuditLead(
  pb: PocketBase,
  ownerId: string,
  input: {
    name: string
    email: string
    phone?: string | null
    website: string
    payload?: Record<string, unknown>
  },
): Promise<WebsiteAuditLeadRecord> {
  const website = normalizeWebsiteUrl(input.website)
  if (!website) throw createError({ statusCode: 400, message: 'A valid website URL is required.' })
  const email = String(input.email || '').trim()
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'A valid email is required.' })
  }
  const domain = normalizeDomain(website)
  const crm = await createCrmLeadForWebsiteAudit(pb, ownerId, {
    name: String(input.name || '').trim(),
    email,
    phone: input.phone,
    website,
    domain,
  })
  const publicToken = newReportToken()
  const record = await pb.collection('website_audit_leads').create({
    user: ownerId,
    name: String(input.name || '').trim() || null,
    email,
    phone: input.phone?.trim() || null,
    website,
    status: 'processing',
    public_token: publicToken,
    crm_client: crm.id,
    received_at: new Date().toISOString(),
    payload_json: input.payload || null,
  })
  return record as unknown as WebsiteAuditLeadRecord
}

function appBaseUrl(): string {
  const config = useRuntimeConfig()
  return String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
}

export function reportUrlForToken(token: string): string {
  return `${appBaseUrl()}/a/${encodeURIComponent(token)}`
}

function scoreLine(audit: ProspectAudit): string {
  return lighthouseScoresSummary(audit.lighthouseMobile?.scores, audit.lighthouseDesktop?.scores)
}

export async function processWebsiteAuditLead(pb: PocketBase, leadId: string): Promise<void> {
  const lead = (await pb.collection('website_audit_leads').getOne(leadId)) as unknown as WebsiteAuditLeadRecord
  const ownerId = String(lead.user)
  await pb.collection('website_audit_leads').update(leadId, {
    status: 'processing',
    error_text: null,
  })

  let audit: ProspectAudit
  try {
    audit = await runProspectAudit(pb, lead.website)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await pb.collection('website_audit_leads').update(leadId, {
      status: 'error',
      error_text: msg,
    })
    if (lead.crm_client) {
      await pb
        .collection('crm_clients')
        .update(lead.crm_client, {
          notes: `Website audit failed for ${lead.website}\n${msg}`,
          last_activity_at: new Date().toISOString(),
        })
        .catch(() => {})
    }
    return
  }

  const notes = formatProspectAuditNotes(audit)
  const reportUrl = reportUrlForToken(lead.public_token)

  await pb.collection('website_audit_leads').update(leadId, {
    status: 'ready',
    audit_json: audit,
    error_text: null,
  })

  if (lead.crm_client) {
    await pb
      .collection('crm_clients')
      .update(lead.crm_client, {
        notes: `${notes}\n\nPublic report: ${reportUrl}`,
        last_activity_at: new Date().toISOString(),
        tags_json: ['website-audit', audit.domain, audit.status],
      })
      .catch(() => {})
  }

  const branding = await getPublicBrandingForOwner(pb, ownerId)
  const agencyName = branding.name || 'Your agency'
  const leadName = (lead.name || '').trim() || 'there'
  const appUrl = appBaseUrl()
  let appName = 'Web Ranking Reports'
  try {
    const s = (await pb.settings.getAll()) as { meta?: { appName?: string } }
    if (s.meta?.appName) appName = s.meta.appName
  } catch {
    // ignore
  }

  try {
    await sendTransactionalEmail(pb, 'website_audit_report', lead.email, {
      APP_NAME: appName,
      APP_URL: appUrl,
      LEAD_NAME: leadName,
      AGENCY_NAME: agencyName,
      WEBSITE: lead.website,
      DOMAIN: audit.domain,
      SCORE_SUMMARY: scoreLine(audit),
      REPORT_URL: reportUrl,
      TALKING_POINTS: (audit.talkingPoints || []).slice(0, 5).map((p) => `• ${p}`).join('<br/>') || 'See your full report for recommendations.',
    })
    await pb.collection('website_audit_leads').update(leadId, {
      email_sent_at: new Date().toISOString(),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[website-audit] failed to email lead report:', msg)
    await pb.collection('website_audit_leads').update(leadId, {
      error_text: `Report ready but email failed: ${msg}`,
    })
  }

  const settings = await getWebsiteAuditFormSettings(pb, ownerId)
  if (settings.notifyOwnerEmail) {
    const ownerEmail =
      settings.ownerNotifyEmail.trim() ||
      (await pb
        .collection('users')
        .getOne<{ email?: string }>(ownerId)
        .then((u) => u.email || '')
        .catch(() => ''))
    if (ownerEmail) {
      try {
        await sendTransactionalEmail(pb, 'website_audit_owner_notify', ownerEmail, {
          APP_NAME: appName,
          APP_URL: appUrl,
          AGENCY_NAME: agencyName,
          LEAD_NAME: leadName,
          LEAD_EMAIL: lead.email,
          WEBSITE: lead.website,
          REPORT_URL: reportUrl,
          CRM_URL: `${appUrl}/crm/website-audit`,
        })
      } catch (e: unknown) {
        console.error('[website-audit] failed to notify owner:', e)
      }
    }
  }
}

/** Fire-and-forget audit + email after the HTTP response is sent. */
export function scheduleWebsiteAuditProcessing(pb: PocketBase, leadId: string): void {
  setTimeout(() => {
    void processWebsiteAuditLead(pb, leadId).catch((err) => {
      console.error('[website-audit] background processing failed:', err)
    })
  }, 0)
}

export function toPublicReportDto(
  lead: WebsiteAuditLeadRecord,
  branding: Awaited<ReturnType<typeof getPublicBrandingForOwner>>,
  logoUrl: string,
) {
  const audit = lead.audit_json && typeof lead.audit_json === 'object' ? lead.audit_json : null
  return {
    status: lead.status,
    website: lead.website,
    emailSent: !!lead.email_sent_at,
    error: lead.status === 'error' ? lead.error_text || 'Audit failed.' : null,
    branding: {
      name: branding.name || 'Website audit',
      colors: branding.colors,
      logoUrl,
    },
    audit: audit
      ? {
          domain: audit.domain,
          status: audit.status,
          talkingPoints: audit.talkingPoints || [],
          lighthouseMobile: audit.lighthouseMobile || null,
          lighthouseDesktop: audit.lighthouseDesktop || null,
          onPage: audit.onPage
            ? {
                title: audit.onPage.title,
                metaDescription: audit.onPage.metaDescription,
                h1: audit.onPage.h1,
                h1Count: audit.onPage.h1Count,
                wordCount: audit.onPage.wordCount,
                issues: audit.onPage.issues || [],
              }
            : null,
          tech: audit.tech?.detected?.map((t) => t.name) || [],
          aiCrawl: audit.aiCrawl
            ? {
                llmsTxt: audit.aiCrawl.llmsTxt.found,
                llmTxt: audit.aiCrawl.llmTxt.found,
                robotsTxt: audit.aiCrawl.robotsTxt.found,
                aiBotsBlocked: audit.aiCrawl.robotsTxt.aiBots
                  .filter((b) => b.allowed === false)
                  .map((b) => b.name)
                  .slice(0, 8),
              }
            : null,
          keywords: (audit.keywords?.items || []).slice(0, 15).map((k) => ({
            keyword: k.keyword,
            position: k.position,
            searchVolume: k.searchVolume ?? null,
          })),
          claudeSummary: audit.claudeAudit?.summary || null,
          claudeIssues: (audit.claudeAudit?.issues || []).slice(0, 12).map((i) => ({
            severity: i.severity,
            title: i.title,
          })),
          whois: audit.whois?.whois
            ? {
                registrar: audit.whois.whois.registrar || null,
                domainAgeYears: audit.whois.whois.domainAgeYears ?? null,
              }
            : null,
        }
      : null,
  }
}
