import type PocketBase from 'pocketbase'
import { createError } from 'h3'
import { getClaudeConfig, runClaudeSiteAudit, type SiteAuditResult } from '~/server/utils/claude'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { fetchDomainRankedKeywords } from '~/server/utils/dataforseoLabs'
import { getDomainInfo, type DomainInfoResult } from '~/server/utils/domainInfo'
import { runOnPageSnapshot, type OnPageSnapshot } from '~/server/utils/leadAudit'
import {
  getPageSpeedApiKey,
  runLighthouseForUrl,
  type LighthouseReportPayload,
} from '~/server/utils/lighthouse'
import { detectSiteTechnologies, type TechDetectionResult } from '~/server/utils/techDetection'
import { normalizeDomain } from '~/server/utils/prospectResearch'

export const WORKSPACE_PROSPECT_AUDITS_KEY = 'workspace_prospect_audits'
export const MAX_PROSPECT_AUDITS = 30

export type ProspectLighthouseSummary = {
  strategy: 'mobile' | 'desktop'
  fetchTime?: string
  scores: {
    performance: number | null
    accessibility: number | null
    bestPractices: number | null
    seo: number | null
  }
  metrics: {
    lcp?: string
    cls?: string
    inp?: string
    fcp?: string
    ttfb?: string
    speedIndex?: string
  }
}

export type ProspectAiCrawlResult = {
  llmsTxt: { found: boolean; url: string; preview?: string }
  llmTxt: { found: boolean; url: string; preview?: string }
  robotsTxt: {
    found: boolean
    url: string
    preview?: string
    aiBots: Array<{ name: string; allowed: boolean | null; rule?: string }>
  }
}

export type ProspectKeywordHit = {
  keyword: string
  position: number
  searchVolume?: number | null
  url?: string
}

export type ProspectAudit = {
  id: string
  domain: string
  status: 'ready' | 'partial' | 'failed'
  createdAt: string
  updatedAt: string
  whois?: DomainInfoResult
  tech?: TechDetectionResult
  onPage?: OnPageSnapshot
  lighthouseMobile?: ProspectLighthouseSummary
  lighthouseDesktop?: ProspectLighthouseSummary
  claudeAudit?: SiteAuditResult
  keywords?: {
    totalKeywordCount?: number
    items: ProspectKeywordHit[]
  }
  aiCrawl?: ProspectAiCrawlResult
  talkingPoints?: string[]
  errors: Record<string, string>
  leadId?: string | null
}

function newId(): string {
  return `pa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function scoreOf(payload: LighthouseReportPayload, key: string): number | null {
  const raw = payload.categories[key as keyof typeof payload.categories]?.score
  if (typeof raw !== 'number' || Number.isNaN(raw)) return null
  return Math.round(raw * 100)
}

function metricDisplay(payload: LighthouseReportPayload, id: string): string | undefined {
  const v = payload.audits[id]?.displayValue
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function summarizeLighthouse(payload: LighthouseReportPayload): ProspectLighthouseSummary {
  return {
    strategy: payload.strategy,
    fetchTime: payload.fetchTime,
    scores: {
      performance: scoreOf(payload, 'performance'),
      accessibility: scoreOf(payload, 'accessibility'),
      bestPractices: scoreOf(payload, 'best-practices'),
      seo: scoreOf(payload, 'seo'),
    },
    metrics: {
      lcp: metricDisplay(payload, 'largest-contentful-paint'),
      cls: metricDisplay(payload, 'cumulative-layout-shift'),
      inp: metricDisplay(payload, 'interaction-to-next-paint'),
      fcp: metricDisplay(payload, 'first-contentful-paint'),
      ttfb: metricDisplay(payload, 'server-response-time'),
      speedIndex: metricDisplay(payload, 'speed-index'),
    },
  }
}

async function getWhoisApiKey(pb: PocketBase): Promise<string | null> {
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: { api_key?: string } }>('key="apilayer_whois"')
    return row?.value?.api_key?.trim() || null
  } catch {
    return null
  }
}

async function fetchTextIfExists(url: string): Promise<{ found: boolean; text?: string }> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'WebRankingReports-ProspectAudit/1.0' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return { found: false }
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const text = await res.text()
    if (!text.trim()) return { found: false }
    if (ct.includes('text/html') && /<html/i.test(text) && !/llms\.txt|llm\.txt/i.test(url)) {
      // Likely a soft-404 HTML page for missing txt
      if (text.length > 2000 && /<body/i.test(text)) return { found: false }
    }
    return { found: true, text: text.slice(0, 4000) }
  } catch {
    return { found: false }
  }
}

const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'GoogleOther',
  'Bytespider',
  'CCBot',
  'PerplexityBot',
  'Applebot-Extended',
]

function parseAiBotRules(robotsTxt: string): Array<{ name: string; allowed: boolean | null; rule?: string }> {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim())
  const blocks: Array<{ agents: string[]; rules: string[] }> = []
  let current: { agents: string[]; rules: string[] } | null = null

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const ua = line.match(/^user-agent:\s*(.+)$/i)
    if (ua) {
      const agent = ua[1].trim()
      if (!current || current.rules.length) {
        current = { agents: [agent], rules: [] }
        blocks.push(current)
      } else {
        current.agents.push(agent)
      }
      continue
    }
    if (/^(allow|disallow):/i.test(line)) {
      if (!current) {
        current = { agents: ['*'], rules: [] }
        blocks.push(current)
      }
      current.rules.push(line)
    }
  }

  return AI_BOTS.map((name) => {
    const match = blocks.find((b) => b.agents.some((a) => a.toLowerCase() === name.toLowerCase()))
    if (!match) {
      const star = blocks.find((b) => b.agents.some((a) => a === '*'))
      if (!star) return { name, allowed: null }
      const disallowAll = star.rules.some((r) => /^disallow:\s*\/\s*$/i.test(r))
      return { name, allowed: disallowAll ? false : true, rule: star.rules[0] }
    }
    const disallowAll = match.rules.some((r) => /^disallow:\s*\/\s*$/i.test(r))
    const allowRoot = match.rules.some((r) => /^allow:\s*\/?\s*$/i.test(r))
    if (disallowAll && !allowRoot) return { name, allowed: false, rule: match.rules.find((r) => /^disallow:/i.test(r)) }
    if (match.rules.some((r) => /^disallow:\s*\S+/i.test(r))) {
      return { name, allowed: false, rule: match.rules.find((r) => /^disallow:/i.test(r)) }
    }
    return { name, allowed: true, rule: match.rules[0] }
  })
}

export async function runAiCrawlChecks(domain: string): Promise<ProspectAiCrawlResult> {
  const base = `https://${normalizeDomain(domain)}`
  const [llms, llm, robots] = await Promise.all([
    fetchTextIfExists(`${base}/llms.txt`),
    fetchTextIfExists(`${base}/llm.txt`),
    fetchTextIfExists(`${base}/robots.txt`),
  ])
  return {
    llmsTxt: { found: llms.found, url: `${base}/llms.txt`, preview: llms.text?.slice(0, 500) },
    llmTxt: { found: llm.found, url: `${base}/llm.txt`, preview: llm.text?.slice(0, 500) },
    robotsTxt: {
      found: robots.found,
      url: `${base}/robots.txt`,
      preview: robots.text?.slice(0, 500),
      aiBots: robots.found && robots.text ? parseAiBotRules(robots.text) : AI_BOTS.map((name) => ({ name, allowed: null })),
    },
  }
}

function buildTalkingPoints(audit: ProspectAudit): string[] {
  const points: string[] = []
  const mob = audit.lighthouseMobile?.scores.performance
  const desk = audit.lighthouseDesktop?.scores.performance
  if (mob != null) points.push(`Mobile PageSpeed performance is ${mob}/100.`)
  if (desk != null) points.push(`Desktop PageSpeed performance is ${desk}/100.`)
  if (audit.whois?.whois?.domainAgeYears != null) {
    points.push(`Domain is about ${audit.whois.whois.domainAgeYears} years old${audit.whois.whois.registrar ? ` (registrar: ${audit.whois.whois.registrar})` : ''}.`)
  }
  const techNames = audit.tech?.detected?.map((t) => t.name) || []
  if (techNames.length) points.push(`Detected stack: ${techNames.join(', ')}.`)
  if (!techNames.some((n) => /analytics|tag manager/i.test(n))) {
    points.push('No clear GA4/GTM detection — measurement setup may be a pitch angle.')
  }
  if (audit.onPage?.issues?.length) {
    points.push(`On-page: ${audit.onPage.issues.slice(0, 3).join('; ')}.`)
  }
  if (audit.aiCrawl) {
    if (!audit.aiCrawl.llmsTxt.found && !audit.aiCrawl.llmTxt.found) {
      points.push('No llms.txt found — opportunity to improve AI discoverability.')
    }
    const blocked = audit.aiCrawl.robotsTxt.aiBots.filter((b) => b.allowed === false).map((b) => b.name)
    if (blocked.length) points.push(`robots.txt appears to block AI crawlers: ${blocked.slice(0, 4).join(', ')}.`)
  }
  if (audit.keywords?.items?.length) {
    const top = audit.keywords.items.slice(0, 3).map((k) => k.keyword).join(', ')
    points.push(`Already ranking for keywords like: ${top}.`)
  }
  if (audit.claudeAudit?.issues?.length) {
    const errs = audit.claudeAudit.issues.filter((i) => i.severity === 'error').length
    const warns = audit.claudeAudit.issues.filter((i) => i.severity === 'warning').length
    points.push(`Technical SEO review found ${errs} error${errs === 1 ? '' : 's'} and ${warns} warning${warns === 1 ? '' : 's'}.`)
  }
  return points.slice(0, 8)
}

async function settled<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `${label}: ${msg}` }
  }
}

export async function runProspectAudit(
  pb: PocketBase,
  domainRaw: string,
  options?: { keywordLimit?: number },
): Promise<ProspectAudit> {
  const domain = normalizeDomain(domainRaw)
  if (!domain || !domain.includes('.')) {
    throw createError({ statusCode: 400, message: 'Enter a valid domain (e.g. prospect.com).' })
  }

  const url = `https://${domain}`
  const now = new Date().toISOString()
  const errors: Record<string, string> = {}
  const keywordLimit = Math.min(Math.max(options?.keywordLimit ?? 50, 10), 100)

  const whoisKey = await getWhoisApiKey(pb)
  const pageSpeedKey = await getPageSpeedApiKey(pb)
  const claudeConfig = await getClaudeConfig(pb)
  const dfsCreds = await getDataForSeoCredentials(pb)

  const [
    whoisRes,
    techRes,
    onPageRes,
    lhMobileRes,
    lhDesktopRes,
    aiCrawlRes,
    keywordsRes,
    claudeRes,
  ] = await Promise.all([
    whoisKey
      ? settled('WHOIS', () => getDomainInfo(domain, whoisKey, true))
      : Promise.resolve({ ok: false as const, error: 'WHOIS: API key not configured (Admin → Integrations).' }),
    settled('Tech', () => detectSiteTechnologies(domain)),
    settled('On-page', () => runOnPageSnapshot(url)),
    settled('Lighthouse mobile', () => runLighthouseForUrl(url, 'mobile', pageSpeedKey)),
    settled('Lighthouse desktop', () => runLighthouseForUrl(url, 'desktop', pageSpeedKey)),
    settled('AI crawl files', () => runAiCrawlChecks(domain)),
    dfsCreds
      ? settled('Keywords', async () => {
          const fetched = await fetchDomainRankedKeywords(dfsCreds, domain, { limit: keywordLimit })
          if (fetched.error) throw new Error(fetched.error)
          return fetched
        })
      : Promise.resolve({ ok: false as const, error: 'Keywords: DataForSEO not configured.' }),
    claudeConfig
      ? settled('Claude audit', async () => {
          // Reuse homepage HTML from tech fetch when possible
          let html = ''
          try {
            const { fetchSiteForTechDetection } = await import('~/server/utils/techDetection')
            const page = await fetchSiteForTechDetection(domain)
            html = page.html.slice(0, 80_000)
          } catch {
            const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'WebRankingReports/1.0' } })
            html = (await res.text()).slice(0, 80_000)
          }
          return runClaudeSiteAudit(claudeConfig, { url, htmlSnippet: html })
        })
      : Promise.resolve({ ok: false as const, error: 'Claude audit: Claude not configured (Admin → Integrations).' }),
  ])

  const audit: ProspectAudit = {
    id: newId(),
    domain,
    status: 'failed',
    createdAt: now,
    updatedAt: now,
    errors,
  }

  if (whoisRes.ok) audit.whois = whoisRes.value
  else errors.whois = whoisRes.error

  if (techRes.ok) audit.tech = techRes.value
  else errors.tech = techRes.error

  if (onPageRes.ok) audit.onPage = onPageRes.value
  else errors.onPage = onPageRes.error

  if (lhMobileRes.ok && lhMobileRes.value) audit.lighthouseMobile = summarizeLighthouse(lhMobileRes.value)
  else errors.lighthouseMobile = lhMobileRes.ok ? 'Lighthouse mobile returned empty.' : lhMobileRes.error

  if (lhDesktopRes.ok && lhDesktopRes.value) audit.lighthouseDesktop = summarizeLighthouse(lhDesktopRes.value)
  else errors.lighthouseDesktop = lhDesktopRes.ok ? 'Lighthouse desktop returned empty.' : lhDesktopRes.error

  if (aiCrawlRes.ok) audit.aiCrawl = aiCrawlRes.value
  else errors.aiCrawl = aiCrawlRes.error

  if (keywordsRes.ok) {
    audit.keywords = {
      totalKeywordCount: keywordsRes.value.totalCount,
      items: keywordsRes.value.keywords.slice(0, keywordLimit).map((k) => ({
        keyword: k.keyword,
        position: k.position,
        searchVolume: k.searchVolume,
        url: k.url || undefined,
      })),
    }
  } else {
    errors.keywords = keywordsRes.error
  }

  if (claudeRes.ok) audit.claudeAudit = claudeRes.value
  else errors.claudeAudit = claudeRes.error

  audit.talkingPoints = buildTalkingPoints(audit)

  const modulesOk = [
    audit.whois,
    audit.tech,
    audit.onPage,
    audit.lighthouseMobile,
    audit.lighthouseDesktop,
    audit.aiCrawl,
    audit.keywords,
    audit.claudeAudit,
  ].filter(Boolean).length

  audit.status = modulesOk === 0 ? 'failed' : Object.keys(errors).length ? 'partial' : 'ready'
  audit.updatedAt = new Date().toISOString()
  return audit
}

function isProspectAudit(value: unknown): value is ProspectAudit {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.domain === 'string' && typeof v.status === 'string'
}

export async function listProspectAudits(pb: PocketBase, ownerId: string): Promise<ProspectAudit[]> {
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: Record<string, unknown> }>(`key="${WORKSPACE_PROSPECT_AUDITS_KEY}"`)
    const items = row?.value?.[ownerId]
    if (!Array.isArray(items)) return []
    return items.filter(isProspectAudit).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  } catch {
    return []
  }
}

export async function saveProspectAudit(
  pb: PocketBase,
  ownerId: string,
  audit: ProspectAudit,
): Promise<ProspectAudit[]> {
  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(
        `key="${WORKSPACE_PROSPECT_AUDITS_KEY}"`,
      )
  } catch {
    row = null
  }

  const current: Record<string, unknown> = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  const existing = Array.isArray(current[ownerId]) ? (current[ownerId] as unknown[]).filter(isProspectAudit) : []
  const domainKey = normalizeDomain(audit.domain)
  const next = [
    audit,
    ...existing.filter((item) => item.id !== audit.id && normalizeDomain(item.domain) !== domainKey),
  ].slice(0, MAX_PROSPECT_AUDITS)
  current[ownerId] = next

  if (row) await pb.collection('app_settings').update(row.id, { value: current })
  else await pb.collection('app_settings').create({ key: WORKSPACE_PROSPECT_AUDITS_KEY, value: current })
  return next
}

export async function getProspectAudit(
  pb: PocketBase,
  ownerId: string,
  auditId: string,
): Promise<ProspectAudit | null> {
  const items = await listProspectAudits(pb, ownerId)
  return items.find((a) => a.id === auditId) || null
}

export function formatProspectAuditNotes(audit: ProspectAudit): string {
  const lines: string[] = []
  lines.push(`Prospect audit: ${audit.domain}`)
  lines.push(`Status: ${audit.status}`)
  lines.push(`Updated: ${new Date(audit.updatedAt).toLocaleString()}`)
  lines.push('')

  if (audit.talkingPoints?.length) {
    lines.push('Talking points:')
    for (const p of audit.talkingPoints) lines.push(`- ${p}`)
    lines.push('')
  }

  if (audit.lighthouseMobile || audit.lighthouseDesktop) {
    lines.push('PageSpeed:')
    if (audit.lighthouseMobile) {
      const s = audit.lighthouseMobile.scores
      lines.push(
        `- Mobile: Perf ${s.performance ?? '—'} · SEO ${s.seo ?? '—'} · A11y ${s.accessibility ?? '—'} · BP ${s.bestPractices ?? '—'}`,
      )
      if (audit.lighthouseMobile.metrics.lcp) lines.push(`  LCP ${audit.lighthouseMobile.metrics.lcp}`)
    }
    if (audit.lighthouseDesktop) {
      const s = audit.lighthouseDesktop.scores
      lines.push(
        `- Desktop: Perf ${s.performance ?? '—'} · SEO ${s.seo ?? '—'} · A11y ${s.accessibility ?? '—'} · BP ${s.bestPractices ?? '—'}`,
      )
    }
    lines.push('')
  }

  if (audit.whois?.whois) {
    const w = audit.whois.whois
    lines.push('WHOIS:')
    if (w.registrar) lines.push(`- Registrar: ${w.registrar}`)
    if (w.createdAt) lines.push(`- Created: ${w.createdAt}`)
    if (w.expiresAt) lines.push(`- Expires: ${w.expiresAt}`)
    if (w.registrantOrg) lines.push(`- Org: ${w.registrantOrg}`)
    if (w.domainAgeYears != null) lines.push(`- Age: ~${w.domainAgeYears} years`)
    lines.push('')
  }

  if (audit.tech?.detected?.length) {
    lines.push(`Tech: ${audit.tech.detected.map((t) => t.name).join(', ')}`)
    lines.push('')
  }

  if (audit.aiCrawl) {
    lines.push('AI crawl readiness:')
    lines.push(`- llms.txt: ${audit.aiCrawl.llmsTxt.found ? 'found' : 'missing'}`)
    lines.push(`- llm.txt: ${audit.aiCrawl.llmTxt.found ? 'found' : 'missing'}`)
    lines.push(`- robots.txt: ${audit.aiCrawl.robotsTxt.found ? 'found' : 'missing'}`)
    const blocked = audit.aiCrawl.robotsTxt.aiBots.filter((b) => b.allowed === false)
    if (blocked.length) lines.push(`- Blocked bots: ${blocked.map((b) => b.name).join(', ')}`)
    lines.push('')
  }

  if (audit.onPage) {
    lines.push('On-page:')
    if (audit.onPage.title) lines.push(`- Title: ${audit.onPage.title}`)
    if (audit.onPage.metaDescription) lines.push(`- Meta: ${audit.onPage.metaDescription}`)
    if (audit.onPage.issues?.length) lines.push(`- Issues: ${audit.onPage.issues.join('; ')}`)
    lines.push('')
  }

  if (audit.claudeAudit?.summary) {
    lines.push('Technical SEO summary:')
    lines.push(audit.claudeAudit.summary)
    lines.push('')
    for (const issue of (audit.claudeAudit.issues || []).slice(0, 8)) {
      lines.push(`- [${issue.severity}] ${issue.title}`)
    }
    lines.push('')
  }

  if (audit.keywords?.items?.length) {
    lines.push(`Top keywords (${audit.keywords.items.length}${audit.keywords.totalKeywordCount ? ` of ~${audit.keywords.totalKeywordCount}` : ''}):`)
    for (const k of audit.keywords.items.slice(0, 20)) {
      const bits = [k.keyword, `#${k.position}`]
      if (k.searchVolume != null) bits.push(`vol ${k.searchVolume}`)
      lines.push(`- ${bits.join(' · ')}`)
    }
  }

  return lines.join('\n').trim()
}

export function defaultLeadNameFromAudit(audit: ProspectAudit): string {
  const org = audit.whois?.whois?.registrantOrg?.trim()
  if (org) return org
  return audit.domain.replace(/\.[a-z.]+$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
