import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { runLighthouseForUrl, getPageSpeedApiKey } from '~/server/utils/lighthouse'

/** Inline on-page snapshot to avoid leadAudit import resolution issues in Nitro bundle. */
async function runOnPageSnapshot(inputUrl: string): Promise<Record<string, unknown>> {
  const url = inputUrl.trim().toLowerCase().startsWith('http') ? inputUrl : 'https://' + inputUrl
  const issues: string[] = []
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'WebRankingReports/1.0' } })
  const html = await res.text()
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : undefined
  if (!title) issues.push('Missing title tag')
  const titleLength = title?.length ?? 0
  if (titleLength > 60) issues.push('Title may be too long')
  const descRe = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  const descM = html.match(descRe) || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const metaDescription = descM ? descM[1] : undefined
  if (!metaDescription) issues.push('Missing meta description')
  const metaDescriptionLength = metaDescription?.length ?? 0
  if (metaDescriptionLength > 160) issues.push('Meta description may be too long')
  const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi
  const h1s: string[] = []
  let hm
  while ((hm = h1Re.exec(html)) !== null) h1s.push(hm[1].replace(/<[^>]+>/g, '').trim())
  const h1 = h1s[0]
  const h1Count = h1s.length
  if (h1Count === 0) issues.push('No H1 found')
  if (h1Count > 1) issues.push('Multiple H1 tags')
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length
  const canonicalRe = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i
  const hasCanonical = !!(html.match(/<meta[^>]+name=["']canonical["'][^>]+content=["']([^"']*)["']/i) || html.match(canonicalRe))
  if (!hasCanonical) issues.push('No canonical link')
  const viewportMeta = !!html.match(/<meta[^>]+name=["']viewport["']/i)
  if (!viewportMeta) issues.push('No viewport meta tag')
  const bodyM = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const stripHtml = (s: string) => s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const text = bodyM ? stripHtml(bodyM[1]) : stripHtml(html)
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return {
    url: res.url || url,
    fetchedAt: new Date().toISOString(),
    statusCode: res.status,
    title,
    titleLength,
    metaDescription,
    metaDescriptionLength,
    h1,
    h1Count,
    h2Count,
    h3Count,
    wordCount,
    hasCanonical,
    viewportMeta,
    issues: issues.length ? issues : undefined,
  }
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  const submissionId = getRouterParam(event, 'submissionId')
  if (!siteId || !submissionId) throw createError({ statusCode: 400, message: 'Site id and submission id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  const submission = await pb.collection('lead_submissions').getOne(submissionId, { expand: 'form' })
  const form = submission.expand?.form as { site?: string } | undefined
  if (form?.site !== siteId) throw createError({ statusCode: 404, message: 'Lead not found' })
  const url = (submission as { lead_website?: string }).lead_website
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    await pb.collection('lead_submissions').update(submissionId, { status: 'error', error_text: 'No valid website URL to audit' })
    return { ok: true, status: 'error', message: 'No valid website URL' }
  }
  await pb.collection('lead_submissions').update(submissionId, { status: 'processing', error_text: null })
  const audit: Record<string, unknown> = {}
  try {
    audit.onPage = await runOnPageSnapshot(url)
  } catch (e: unknown) {
    audit.onPageError = (e as Error).message
  }
  const apiKey = await getPageSpeedApiKey(pb)
  try {
    audit.lighthouseMobile = await runLighthouseForUrl(url, 'mobile', apiKey)
  } catch (e: unknown) {
    audit.lighthouseMobileError = (e as Error).message
  }
  try {
    audit.lighthouseDesktop = await runLighthouseForUrl(url, 'desktop', apiKey)
  } catch (e: unknown) {
    audit.lighthouseDesktopError = (e as Error).message
  }
  await pb.collection('lead_submissions').update(submissionId, { status: 'ready', audit_json: audit, error_text: null })
  return { ok: true, status: 'ready', audit }
})
