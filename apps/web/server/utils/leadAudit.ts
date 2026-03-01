/** On-page HTML snapshot for lead audit. */

export interface OnPageSnapshot {
  url: string
  fetchedAt: string
  statusCode?: number
  title?: string
  titleLength?: number
  metaDescription?: string
  metaDescriptionLength?: number
  h1?: string
  h1Count?: number
  h2Count?: number
  h3Count?: number
  wordCount?: number
  hasCanonical?: boolean
  viewportMeta?: boolean
  issues?: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getWordCount(html: string): number {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const text = m ? stripHtml(m[1]) : stripHtml(html)
  return text.split(/\s+/).filter(Boolean).length
}

function extractMeta(html: string, name: string): string | undefined {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('<meta[^>]+(?:name|property)=["\']' + esc + '["\'][^>]+content=["\']([^"\']*)["\']', 'i')
  const m = html.match(re)
  if (m) return m[1]
  const re2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:name|property)=["\']' + esc + '["\']', 'i')
  const m2 = html.match(re2)
  return m2 ? m2[1] : undefined
}

export async function runOnPageSnapshot(inputUrl: string): Promise<OnPageSnapshot> {
  const url = inputUrl.trim().toLowerCase().startsWith('http') ? inputUrl : 'https://' + inputUrl
  const issues: string[] = []
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'WebRankingReports/1.0' } })
  const html = await res.text()
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : undefined
  if (!title) issues.push('Missing title tag')
  const titleLength = title?.length ?? 0
  if (titleLength > 60) issues.push('Title may be too long')
  const metaDescription = extractMeta(html, 'description')
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
  const canonical = extractMeta(html, 'canonical') || html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1]
  const hasCanonical = !!canonical
  if (!hasCanonical) issues.push('No canonical link')
  const viewportMeta = !!html.match(/<meta[^>]+name=["']viewport["']/i)
  if (!viewportMeta) issues.push('No viewport meta tag')
  const wordCount = getWordCount(html)
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
