/**
 * Wappalyzer-style tech detection for site homepage.
 * Focus: WordPress, and WRR integrations (Analytics, Tag Manager, Cloudflare, WooCommerce).
 */

const FETCH_TIMEOUT_MS = 15_000
const MAX_HTML_CHARS = 300_000

export interface DetectedTech {
  id: string
  name: string
}

export interface TechDetectionResult {
  url: string
  fetchedAt: string
  detected: DetectedTech[]
}

export interface FetchResult {
  html: string
  headers: Record<string, string>
  finalUrl: string
}

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .trim()
}

export async function fetchSiteForTechDetection(domain: string): Promise<FetchResult> {
  const normalized = normalizeDomain(domain)
  const url = `https://${normalized}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  const res = await fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WRR-TechDetection/1.0)' },
    redirect: 'follow',
  })
  clearTimeout(timeout)

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  const html = text.length > MAX_HTML_CHARS ? text.slice(0, MAX_HTML_CHARS) : text

  const headers: Record<string, string> = {}
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  return { html, headers, finalUrl: res.url }
}

const DETECTORS: Array<{
  id: string
  name: string
  test: (html: string, headers: Record<string, string>) => boolean
}> = [
  {
    id: 'wordpress',
    name: 'WordPress',
    test: (html) =>
      /<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*WordPress/i.test(html) ||
      /wp-content\//i.test(html) ||
      /wp-includes\//i.test(html) ||
      /wp-embed\.min\.js/i.test(html),
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    test: (html) =>
      /googletagmanager\.com\/gtag\/js/i.test(html) ||
      /google-analytics\.com\/analytics\.js/i.test(html) ||
      /gtag\s*\(\s*["']config["']\s*,\s*["'](G-[A-Z0-9]+|UA-\d+-\d+)["']/i.test(html) ||
      /googleanalytics\.com\/ga\.js/i.test(html),
  },
  {
    id: 'google_tag_manager',
    name: 'Google Tag Manager',
    test: (html) =>
      /googletagmanager\.com\/gtm\.js/i.test(html) ||
      /googletagmanager\.com\/ns\.html/i.test(html),
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    test: (html, headers) => {
      const server = headers['server'] ?? ''
      const cfRay = headers['cf-ray'] ?? ''
      const setCookie = headers['set-cookie'] ?? ''
      if (/cloudflare/i.test(server) || cfRay.length > 0) return true
      if (/__cf_bm|cf_clearance/i.test(setCookie)) return true
      return /cloudflare|rocket-loader|cf-browser/i.test(html)
    },
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    test: (html) =>
      /wp-content\/plugins\/woocommerce/i.test(html) ||
      /woocommerce\.min\.js|woocommerce\.js/i.test(html) ||
      /body[^>]*class="[^"]*woocommerce/i.test(html) ||
      /"woocommerce-/i.test(html) ||
      /WooCommerce/i.test(html),
  },
]

export function runTechDetection(html: string, headers: Record<string, string>): DetectedTech[] {
  const detected: DetectedTech[] = []
  for (const d of DETECTORS) {
    if (d.test(html, headers)) detected.push({ id: d.id, name: d.name })
  }
  return detected
}

export async function detectSiteTechnologies(domain: string): Promise<TechDetectionResult> {
  const { html, headers, finalUrl } = await fetchSiteForTechDetection(domain)
  const detected = runTechDetection(html, headers)
  return {
    url: finalUrl,
    fetchedAt: new Date().toISOString(),
    detected,
  }
}
