/**
 * Server-side: get WooCommerce config for a site and call WooCommerce REST API.
 */

import type PocketBase from 'pocketbase'

const PROVIDER = 'woocommerce'

export interface WooCommerceConfig {
  store_url: string
  consumer_key: string
  consumer_secret: string
}

export interface WooCommerceIntegrationRecord {
  id: string
  site: string
  provider: string
  status: string
  config_json?: {
    store_url?: string
    consumer_key?: string
    consumer_secret?: string
  }
}

/** Normalize domain to a store URL (https, no trailing slash). */
function domainToStoreUrl(domain: string): string {
  const d = (domain || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (!d) return ''
  return `https://${d}`
}

export function hasWooCommerceConfig(integration: WooCommerceIntegrationRecord | null): boolean {
  const cfg = integration?.config_json
  const hasUrl = typeof cfg?.store_url === 'string' && cfg.store_url.trim().length > 0
  const hasKeys = typeof cfg?.consumer_key === 'string' && typeof cfg?.consumer_secret === 'string'
  return Boolean(hasUrl || (hasKeys && cfg?.consumer_key?.trim() && cfg?.consumer_secret?.trim()))
}

export async function getWooCommerceIntegration(
  pb: PocketBase,
  siteId: string
): Promise<WooCommerceIntegrationRecord | null> {
  const list = await pb.collection('integrations').getFullList<WooCommerceIntegrationRecord>({
    filter: `site = "${siteId}" && provider = "${PROVIDER}"`,
  })
  return list[0] ?? null
}

export async function getWooCommerceConfig(
  pb: PocketBase,
  siteId: string
): Promise<WooCommerceConfig> {
  const integration = await getWooCommerceIntegration(pb, siteId)
  const cfg = integration?.config_json
  if (!cfg?.consumer_key?.trim() || !cfg?.consumer_secret?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'WooCommerce not configured. Add your API keys (consumer key and secret) in Integrations (cog).',
    })
  }
  let storeUrl = typeof cfg.store_url === 'string' ? cfg.store_url.trim().replace(/\/+$/, '') : ''
  if (!storeUrl) {
    const site = await pb.collection('sites').getOne<{ domain?: string }>(siteId)
    const domain = site?.domain?.trim()
    if (!domain) {
      throw createError({
        statusCode: 400,
        message: 'Store URL is missing and the site has no domain. Add a store URL in Integrations (cog) or set the site domain.',
      })
    }
    storeUrl = domainToStoreUrl(domain)
  }
  if (!storeUrl.startsWith('http://') && !storeUrl.startsWith('https://')) {
    storeUrl = 'https://' + storeUrl.replace(/^\/+/, '')
  }
  return { store_url: storeUrl, consumer_key: cfg.consumer_key.trim(), consumer_secret: cfg.consumer_secret.trim() }
}

function buildWcUrl(baseUrl: string, path: string, params: Record<string, string>): string {
  const url = new URL(path, baseUrl)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

/** Fetch from WooCommerce REST API (GET). Uses query string auth. */
export async function wcGet<T>(
  config: WooCommerceConfig,
  path: string,
  query: Record<string, string> = {}
): Promise<T> {
  // Base must end with / so new URL(path, base) resolves to .../v3/orders not .../wc/orders
  const base = config.store_url.replace(/\/+$/, '') + '/wp-json/wc/v3/'
  const allParams = {
    ...query,
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
  }
  const url = buildWcUrl(base, path, allParams)
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  const text = await res.text()
  if (!res.ok) {
    let msg = `WooCommerce API error: ${res.status}`
    if (text && !text.trimStart().startsWith('<')) {
      try {
        const json = JSON.parse(text)
        if (json?.message) msg = json.message
        else if (json?.code) msg = `${json.code}: ${json.message || text}`
      } catch {
        if (text.length <= 300) msg = text
        else msg = text.slice(0, 200)
      }
    } else {
      msg = 'The store returned an HTML page instead of JSON. Enable pretty permalinks (WordPress → Settings → Permalinks → Post name), ensure the Store URL is correct (or leave blank to use this site’s domain), and that WooCommerce REST API is enabled.'
    }
    if (/no route was found|rest_no_route/i.test(msg)) {
      msg += ' Use Post name permalinks, check the Store URL, and ensure the WooCommerce REST API is enabled.'
    }
    throw createError({ statusCode: 502, message: msg })
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw createError({
      statusCode: 502,
      message: 'The store returned an HTML page instead of JSON. Enable pretty permalinks (WordPress → Settings → Permalinks → Post name) and check the Store URL.',
    })
  }
}

/** WooCommerce order (minimal fields we use). */
export interface WcOrder {
  id: number
  status: string
  total: string
  date_created: string
  line_items?: Array<{ name: string; product_id: number; quantity: number; total: string }>
}

/** Fetch orders with pagination. */
export async function fetchOrdersInRange(
  config: WooCommerceConfig,
  after: string,
  before: string
): Promise<WcOrder[]> {
  const all: WcOrder[] = []
  let page = 1
  const perPage = 100
  while (true) {
    const list = await wcGet<WcOrder[]>(config, 'orders', {
      after: after + 'T00:00:00',
      before: before + 'T23:59:59',
      per_page: String(perPage),
      page: String(page),
      orderby: 'date',
      order: 'asc',
    })
    if (!Array.isArray(list) || list.length === 0) break
    all.push(...list)
    if (list.length < perPage) break
    page += 1
  }
  return all
}

/** Aggregate orders into report: revenue by day, orders by day, order count, top products. */
export function aggregateOrders(orders: WcOrder[]) {
  const revenueByDay: Record<string, number> = {}
  const ordersByDay: Record<string, number> = {}
  const completedStatuses = new Set(['completed', 'processing'])
  let totalRevenue = 0
  let totalOrders = 0
  const productCount: Record<number, { name: string; quantity: number; revenue: number }> = {}

  for (const order of orders) {
    const isCompleted = completedStatuses.has(order.status)
    if (isCompleted) {
      const total = parseFloat(order.total) || 0
      totalRevenue += total
      totalOrders += 1
      const day = order.date_created.slice(0, 10)
      revenueByDay[day] = (revenueByDay[day] || 0) + total
      ordersByDay[day] = (ordersByDay[day] || 0) + 1
    }

    if (order.line_items && isCompleted) {
      for (const item of order.line_items) {
        const pid = item.product_id
        const rev = parseFloat(item.total) || 0
        const qty = item.quantity || 1
        if (!productCount[pid]) {
          productCount[pid] = { name: item.name || `Product #${pid}`, quantity: 0, revenue: 0 }
        }
        productCount[pid].quantity += qty
        productCount[pid].revenue += rev
      }
    }
  }

  const revenueByDaySorted = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))

  const ordersByDaySorted = Object.entries(ordersByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  const topProducts = Object.entries(productCount)
    .map(([id, data]) => ({ id: Number(id), ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return {
    totalRevenue,
    totalOrders,
    revenueByDay: revenueByDaySorted,
    ordersByDay: ordersByDaySorted,
    topProducts,
  }
}
