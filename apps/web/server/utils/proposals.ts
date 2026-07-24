import type PocketBase from 'pocketbase'
import { crmRowOwnedByUser, extractPocketBaseRelationId } from '~/server/utils/workspace'
import {
  BRANDING_KEY,
  DEFAULT_BRANDING,
  brandingKeyForOwner,
  normalizeHex,
  type AgencyBrandingSettings,
} from '~/server/utils/branding'
import type {
  CrmIntake,
  Proposal,
  ProposalAcceptanceOptions,
  ProposalItem,
  ProposalSnapshot,
  ProposalStatus,
} from '~/types'

export const DEFAULT_ACCEPTANCE_OPTIONS: Required<ProposalAcceptanceOptions> = {
  mark_deal_won: true,
  convert_lead_to_client: true,
  promote_site_to_active: true,
  create_onboarding_tasks: true,
  log_activity: true,
  set_pipeline_stage_won: true,
}

export const EDITABLE_PROPOSAL_STATUSES: ProposalStatus[] = ['draft']

export const PUBLIC_VIEWABLE_STATUSES: ProposalStatus[] = ['sent', 'viewed', 'accepted', 'declined']

export function newPublicToken(): string {
  return `prop_${crypto.randomUUID().replace(/-/g, '')}`
}

export function calcItemsTotal(items: Array<{ qty: number; unit_price: number }>): number {
  return items.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.unit_price || 0), 0)
}

export async function assertProposalOwned(
  pb: PocketBase,
  proposalId: string,
  crmOwnerId: string,
) {
  const record = await pb.collection('proposals').getOne(proposalId).catch(() => null)
  if (!record || !crmRowOwnedByUser(record as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 404, message: 'Proposal not found' })
  }
  return record
}

export async function findProposalByPublicToken(pb: PocketBase, token: string) {
  const t = token.trim()
  if (!t || !t.startsWith('prop_')) return null
  const esc = t.replace(/"/g, '\\"')
  const list = await pb
    .collection('proposals')
    .getFullList({
      filter: `public_token = "${esc}"`,
      expand: 'client,sale,site',
      batch: 1,
    })
    .catch(() => [])
  return (list[0] as Proposal | undefined) ?? null
}

export async function listProposalItems(pb: PocketBase, proposalId: string): Promise<ProposalItem[]> {
  const esc = proposalId.replace(/"/g, '\\"')
  return await pb.collection('proposal_items').getFullList<ProposalItem>({
    filter: `proposal = "${esc}"`,
    sort: 'sort_order',
  })
}

export async function replaceProposalItems(
  pb: PocketBase,
  crmOwnerId: string,
  proposalId: string,
  items: Array<{
    source?: string
    product?: string | null
    external_product_id?: string | null
    sku?: string | null
    name: string
    description?: string | null
    qty: number
    unit_price: number
    billing_interval?: string | null
    metadata_json?: Record<string, unknown> | null
  }>,
) {
  const existing = await listProposalItems(pb, proposalId)
  for (const row of existing) {
    await pb.collection('proposal_items').delete(row.id)
  }
  const created = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const name = String(it.name || '').trim()
    if (!name) continue
    const source = ['woo', 'manual', 'package'].includes(String(it.source)) ? it.source : 'manual'
    const billing =
      it.billing_interval && ['one_time', 'month', 'year', 'custom'].includes(it.billing_interval)
        ? it.billing_interval
        : 'one_time'
    const payload: Record<string, unknown> = {
      user: crmOwnerId,
      proposal: proposalId,
      sort_order: i,
      source,
      external_product_id: it.external_product_id?.trim() || null,
      sku: it.sku?.trim() || null,
      name,
      description: it.description?.trim() || null,
      qty: Number(it.qty) || 0,
      unit_price: Number(it.unit_price) || 0,
      billing_interval: billing,
      metadata_json: it.metadata_json ?? null,
    }
    if (it.product) payload.product = it.product
    created.push(await pb.collection('proposal_items').create(payload))
  }
  const total = calcItemsTotal(created.map((c) => ({ qty: Number(c.qty), unit_price: Number(c.unit_price) })))
  await pb.collection('proposals').update(proposalId, { subtotal: total, total })
  return created
}

export async function logProposalActivity(
  pb: PocketBase,
  crmOwnerId: string,
  clientId: string,
  kind: string,
  summary: string,
) {
  try {
    await pb.collection('crm_contact_points').create({
      user: crmOwnerId,
      client: clientId,
      kind,
      happened_at: new Date().toISOString(),
      summary,
    })
  } catch {
    await pb.collection('crm_contact_points').create({
      user: crmOwnerId,
      client: clientId,
      kind: 'note',
      happened_at: new Date().toISOString(),
      summary,
    })
  }
}

export async function loadFrozenBranding(pb: PocketBase, ownerId: string) {
  const key = brandingKeyForOwner(ownerId)
  let value: Partial<AgencyBrandingSettings> = {}
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: Partial<AgencyBrandingSettings> }>(
      `key="${key.replace(/"/g, '\\"')}"`,
    )
    value = row?.value ?? {}
  } catch {
    try {
      const row = await pb.collection('app_settings').getFirstListItem<{ value?: Partial<AgencyBrandingSettings> }>(
        `key="${BRANDING_KEY}"`,
      )
      value = row?.value ?? {}
    } catch {
      value = {}
    }
  }

  let logoUrl: string | null = null
  try {
    const agencyRows = await pb.collection('agency').getFullList<{ id: string; logo?: string | string[] }>({
      limit: 1,
    })
    const logo = agencyRows[0]?.logo
    const filename = Array.isArray(logo) ? String(logo[0] || '') : typeof logo === 'string' ? logo : ''
    if (filename && agencyRows[0]?.id) {
      logoUrl = pb.files.getUrl(agencyRows[0], filename)
    }
  } catch {
    logoUrl = null
  }

  return {
    name: typeof value.name === 'string' ? value.name.trim() : '',
    address: typeof value.address === 'string' ? value.address.trim() : '',
    phone: typeof value.phone === 'string' ? value.phone.trim() : '',
    logo_url: logoUrl,
    colors: {
      primary: normalizeHex(value.primary) || DEFAULT_BRANDING.primary,
      accent: normalizeHex(value.accent) || DEFAULT_BRANDING.accent,
      text: normalizeHex(value.text) || DEFAULT_BRANDING.text,
      surface: normalizeHex(value.surface) || DEFAULT_BRANDING.surface,
    },
    frozen_at: new Date().toISOString(),
  }
}

/** Capture Digital Snapshot + available site scan fields. Strips internal_note from public-safe intake. */
export async function buildProposalSnapshot(
  pb: PocketBase,
  clientId: string,
  siteId?: string | null,
): Promise<ProposalSnapshot> {
  const escClient = clientId.replace(/"/g, '\\"')
  const intakeRows = await pb
    .collection('crm_intake')
    .getFullList<CrmIntake>({ filter: `client = "${escClient}"`, batch: 1 })
    .catch(() => [])
  const intake = intakeRows[0]
  let website_url = intake?.website_url || undefined
  let lighthouse: Record<string, unknown> | null = null
  let tech: Record<string, unknown> | null = null
  let seo_basic: Record<string, unknown> | null = null

  if (siteId) {
    const site = await pb
      .collection('sites')
      .getOne<{
        domain?: string
        site_audit_result?: Record<string, unknown> | null
      }>(siteId)
      .catch(() => null)
    if (site?.domain && !website_url) website_url = site.domain
    if (site?.site_audit_result && typeof site.site_audit_result === 'object') {
      seo_basic = site.site_audit_result
      const maybeLh = site.site_audit_result.lighthouse
      if (maybeLh && typeof maybeLh === 'object') lighthouse = maybeLh as Record<string, unknown>
      const maybeTech = site.site_audit_result.technologies || site.site_audit_result.tech
      if (maybeTech && typeof maybeTech === 'object') tech = maybeTech as Record<string, unknown>
    }
  }

  const intakePublic: Partial<CrmIntake> | undefined = intake
    ? {
        id: intake.id,
        snapshot_at: intake.snapshot_at,
        website_url: intake.website_url,
        homepage_notes: intake.homepage_notes,
        local_visibility_notes: intake.local_visibility_notes,
        ads_presence_notes: intake.ads_presence_notes,
        analytics_notes: intake.analytics_notes,
        mobile_speed_notes: intake.mobile_speed_notes,
      }
    : undefined

  return {
    captured_at: new Date().toISOString(),
    website_url,
    intake: intakePublic,
    lighthouse,
    tech,
    seo_basic,
    keywords_limited: null,
  }
}

export async function freezeProposalSnapshot(
  pb: PocketBase,
  proposal: { id: string; client?: unknown; site?: unknown; user?: unknown },
  ownerId: string,
) {
  const clientId = extractPocketBaseRelationId(proposal.client)
  const siteId = extractPocketBaseRelationId(proposal.site) || null
  if (!clientId) throw createError({ statusCode: 400, message: 'Proposal has no client' })
  const snapshot_json = await buildProposalSnapshot(pb, clientId, siteId)
  const branding_json = await loadFrozenBranding(pb, ownerId)
  return await pb.collection('proposals').update(proposal.id, { snapshot_json, branding_json })
}

/** Clone a sent proposal into a new draft version; mark prior as superseded. */
export async function createSupersedingDraft(
  pb: PocketBase,
  crmOwnerId: string,
  source: Proposal & { id: string },
) {
  const saleId = extractPocketBaseRelationId(source.sale)
  const clientId = extractPocketBaseRelationId(source.client)
  if (!saleId || !clientId) throw createError({ statusCode: 400, message: 'Invalid proposal relations' })

  const existingVersions = await pb.collection('proposals').getFullList({
    filter: `sale = "${saleId.replace(/"/g, '\\"')}"`,
    fields: 'id,version,status',
    sort: '-version',
  })
  const nextVersion = existingVersions.length
    ? Number((existingVersions[0] as { version?: number }).version || 0) + 1
    : 1

  for (const row of existingVersions) {
    const st = String((row as { status?: string }).status || '')
    if (['sent', 'viewed'].includes(st)) {
      await pb.collection('proposals').update((row as { id: string }).id, { status: 'superseded' })
      await logProposalActivity(
        pb,
        crmOwnerId,
        clientId,
        'proposal_superseded',
        `Proposal superseded: ${source.title} (v${(row as { version?: number }).version})`,
      )
    }
  }

  const draft = await pb.collection('proposals').create({
    user: crmOwnerId,
    client: clientId,
    sale: saleId,
    site: extractPocketBaseRelationId(source.site) || null,
    version: nextVersion,
    status: 'draft',
    title: source.title,
    intro_html: source.intro_html || null,
    terms_html: source.terms_html || null,
    currency: source.currency || 'USD',
    subtotal: source.subtotal ?? 0,
    total: source.total ?? 0,
    valid_until: source.valid_until || null,
    acceptance_options_json: source.acceptance_options_json || DEFAULT_ACCEPTANCE_OPTIONS,
    snapshot_json: null,
    branding_json: null,
    public_token: null,
  })

  const items = await listProposalItems(pb, source.id)
  if (items.length) {
    await replaceProposalItems(
      pb,
      crmOwnerId,
      draft.id,
      items.map((it) => ({
        source: it.source,
        external_product_id: it.external_product_id,
        sku: it.sku,
        name: it.name,
        description: it.description,
        qty: it.qty,
        unit_price: it.unit_price,
        billing_interval: it.billing_interval,
        metadata_json: it.metadata_json,
      })),
    )
  }

  await logProposalActivity(
    pb,
    crmOwnerId,
    clientId,
    'proposal_created',
    `Proposal draft v${nextVersion} created from v${source.version}`,
  )

  return draft
}

export function toPublicProposalDto(proposal: Proposal, items: ProposalItem[]) {
  const branding = (proposal.branding_json || {}) as Record<string, unknown>
  let snapshot = proposal.snapshot_json ? { ...proposal.snapshot_json } : null
  if (snapshot?.intake) {
    const { internal_note: _drop, user: _u, client: _c, ...rest } = snapshot.intake as Record<string, unknown>
    snapshot = { ...snapshot, intake: rest }
  }
  return {
    id: proposal.id,
    title: proposal.title,
    version: proposal.version,
    status: proposal.status,
    intro_html: proposal.intro_html,
    terms_html: proposal.terms_html,
    currency: proposal.currency,
    subtotal: proposal.subtotal,
    total: proposal.total,
    valid_until: proposal.valid_until,
    sent_at: proposal.sent_at,
    viewed_at: proposal.viewed_at,
    accepted_at: proposal.accepted_at,
    declined_at: proposal.declined_at,
    snapshot_json: snapshot,
    branding_json: branding,
    client_name: proposal.expand?.client?.name || proposal.expand?.client?.company || null,
    items: items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      qty: it.qty,
      unit_price: it.unit_price,
      billing_interval: it.billing_interval,
      sort_order: it.sort_order,
    })),
  }
}

export const ONBOARDING_TASK_TEMPLATES = [
  { title: 'Connect Google Analytics', priority: 'high' as const, days: 3 },
  { title: 'Connect Google Search Console', priority: 'high' as const, days: 3 },
  { title: 'Confirm reporting schedule & branding', priority: 'med' as const, days: 7 },
  { title: 'Review keyword list for rank tracking', priority: 'med' as const, days: 7 },
]
