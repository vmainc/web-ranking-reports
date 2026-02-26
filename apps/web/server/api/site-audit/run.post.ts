import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getClaudeConfig, runClaudeSiteAudit, saveSiteAuditResult } from '~/server/utils/claude'

const FETCH_TIMEOUT_MS = 15000
const MAX_HTML_CHARS = 80_000

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .trim()
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const domain = (site.domain || '').trim()
  if (!domain) throw createError({ statusCode: 400, message: 'Site has no domain configured' })

  const normalized = normalizeDomain(domain)
  const url = `https://${normalized}`

  let html: string
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WRR-SiteAudit/1.0)' },
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    html = text.length > MAX_HTML_CHARS ? text.slice(0, MAX_HTML_CHARS) : text
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({
      statusCode: 502,
      message: `Could not fetch site: ${msg}. Check the domain and that the site is reachable.`,
    })
  }

  const config = await getClaudeConfig(pb)
  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Claude API is not configured. An admin can add an API key in Admin → Integrations (Claude – Site Audit).',
    })
  }

  const result = await runClaudeSiteAudit(config, { url, htmlSnippet: html })
  try {
    await saveSiteAuditResult(pb, siteId, result)
  } catch (e) {
    console.error('[site-audit] Failed to save result to app_settings:', e)
  }
  return result
})
