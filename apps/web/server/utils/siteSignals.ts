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

function hostOnly(domain: string): string {
  return domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim()
}

async function homepageReachable(host: string): Promise<boolean> {
  const attempts: Array<{ method: 'HEAD' | 'GET'; headers?: Record<string, string> }> = [
    { method: 'HEAD' },
    { method: 'GET', headers: { Range: 'bytes=0-0' } },
  ]
  for (const attempt of attempts) {
    try {
      const res = await fetch(`https://${host}/`, {
        ...FETCH_OPTS,
        method: attempt.method,
        headers: { ...(FETCH_OPTS.headers as Record<string, string>), ...attempt.headers },
      })
      if (res.ok || res.status === 405 || res.status === 206) return true
    } catch {
      // try next method or retry below
    }
  }
  return false
}

async function fetchWithRetry(url: string, attempts = 2): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...FETCH_OPTS, method: 'GET' })
      return res
    } catch {
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400))
    }
  }
  return null
}

export async function runSiteSignals(domain: string): Promise<SiteSignalsResult> {
  const host = hostOnly(domain)
  const sitemapUrl = `https://${host}/sitemap.xml`
  let sitemapFound = false
  let sitemapUrlCount: number | null = null

  const sitemapCandidates = [sitemapUrl]
  try {
    const robotsRes = await fetchWithRetry(`https://${host}/robots.txt`, 1)
    if (robotsRes?.ok) {
      const robots = (await robotsRes.text()).slice(0, 50_000)
      for (const line of robots.split('\n')) {
        const m = line.match(/^\s*Sitemap:\s*(\S+)/i)
        if (m?.[1]) sitemapCandidates.push(m[1].trim())
      }
    }
  } catch {
    // ignore
  }

  for (const candidate of [...new Set(sitemapCandidates)]) {
    const sitemapRes = await fetchWithRetry(candidate)
    if (!sitemapRes?.ok) continue
    const text = (await sitemapRes.text()).slice(0, 500_000)
    if (text.includes('<urlset') || text.includes('<sitemapindex') || text.includes('<loc>')) {
      sitemapFound = true
      sitemapUrlCount = countSitemapLocs(text)
      break
    }
  }

  let httpsWorks = await homepageReachable(host)
  if (!httpsWorks) {
    await new Promise((r) => setTimeout(r, 500))
    httpsWorks = await homepageReachable(host)
  }

  let httpRedirectsToHttps: boolean | null = null
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