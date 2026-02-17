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

export function hasWooCommerceConfig(integration: WooCommerceIntegrationRecord | null): boolean {
  const url = integration?.config_json?.store_url
  return Boolean(typeof url === 'string' && url.trim().length > 0)
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
  if (!integration?.config_json?.store_url) {
    throw createError({
      statusCode: 400,
      message: 'WooCommerce not configured. Add your store URL and API keys in Integrations (cog).',
    })
  }
  const storeUrl = (integration.config_json.store_url as string).trim().replace(/\/+$/, '')
  const consumer_key = integration.config_json.consumer_key as string
  const consumer_secret = integration.config_json.consumer_secret as string
  if (!consumer_key?.trim() || !consumer_secret?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'WooCommerce API keys missing. Update credentials in Integrations (cog).',
    })
  }
  return { store_url: storeUrl, consumer_key: consumer_key.trim(), consumer_secret: consumer_secret.trim() }
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
  const base = config.store_url.replace(/\/+$/, '') + '/wp-json/wc/v3'
  const allParams = {
    ...query,
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
  }
  const url = buildWcUrl(base, path, allParams)
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const text = await res.text()
    let msg = `WooCommerce API error: ${res.status}`
    try {
      const json = JSON.parse(text)
      if (json?.message) msg = json.message
      else if (json?.code) msg = `${json.code}: ${json.message || text}`
    } catch {
      if (text) msg = text.slice(0, 200)
    }
    throw createError({ statusCode: 502, message: msg })
  }
  return (await res.json()) as T
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
