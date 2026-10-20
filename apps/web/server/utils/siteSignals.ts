/** Free HTTP checks (no paid APIs) to enrich prospect / embed audits. */

export type SiteSignalsResult = {
  sitemapFound: boolean
  sitemapUrl: string
  sitemapUrlCount: number | null
  httpsWorks: boolean
  httpRedirectsToHttps: boolean | null
}

const FETCH_OPTS: RequestInit = {
  redirect: 'follow',
  headers: { 'User-Agent': 'WebRankingReports/1.0 (website audit)' },
  signal: AbortSignal.timeout(12_000),
}

function countSitemapLocs(xml: string): number {
  const matches = xml.match(/<loc>/gi)
  return matches ? matches.length : 0
}

export async function runSiteSignals(domain: string): Promise<SiteSignalsResult> {
  const host = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim()
  const sitemapUrl = `https://${host}/sitemap.xml`
  let sitemapFound = false
  let sitemapUrlCount: number | null = null

  try {
    const res = await fetch(sitemapUrl, { ...FETCH_OPTS, method: 'GET' })
    if (res.ok) {
      const text = (await res.text()).slice(0, 500_000)
      if (text.includes('<urlset') || text.includes('<sitemapindex') || text.includes('<loc>')) {
        sitemapFound = true
        sitemapUrlCount = countSitemapLocs(text)
      }
    }
  } catch {
    // ignore
  }

  let httpsWorks = false
  let httpRedirectsToHttps: boolean | null = null
  try {
    const httpsRes = await fetch(`https://${host}/`, { ...FETCH_OPTS, method: 'HEAD' })
    httpsWorks = httpsRes.ok || httpsRes.status === 405
  } catch {
    httpsWorks = false
  }

  try {
    const httpRes = await fetch(`http://${host}/`, { ...FETCH_OPTS, method: 'HEAD', redirect: 'manual' })
    if (httpRes.status >= 300 && httpRes.status < 400) {
      const loc = httpRes.headers.get('location') || ''
      httpRedirectsToHttps = loc.startsWith('https://')
    } else {
      httpRedirectsToHttps = false
    }
  } catch {
    httpRedirectsToHttps = null
  }

  return {
    sitemapFound,
    sitemapUrl,
    sitemapUrlCount,
    httpsWorks,
    httpRedirectsToHttps,
  }
}
