import type { PocketBase } from 'pocketbase'
import type { Integration, IntegrationRecord, IntegrationProvider, IntegrationStatus } from '~/types'

const PROVIDERS: IntegrationProvider[] = [
  'google_analytics',
  'google_search_console',
  'lighthouse',
  'google_business_profile',
  'google_ads',
  'woocommerce',
  'bing_webmaster',
]

export function getProviderList(): IntegrationProvider[] {
  return [...PROVIDERS]
}

export async function listIntegrationsBySite(
  pb: PocketBase,
  siteId: string
): Promise<IntegrationRecord[]> {
  const records = await pb.collection('integrations').getFullList<IntegrationRecord>({
    filter: `site = "${siteId}"`,
    sort: 'provider',
  })
  return records
}

/** Get or create integration for site + provider. Returns existing or new record with status disconnected. */
export async function ensureIntegration(
  pb: PocketBase,
  siteId: string,
  provider: IntegrationProvider
): Promise<IntegrationRecord> {
  const existing = await pb.collection('integrations').getFullList<IntegrationRecord>({
    filter: `site = "${siteId}" && provider = "${provider}"`,
    $autoCancel: false,
  })
  if (existing.length > 0) return existing[0]

  return await pb.collection('integrations').create<IntegrationRecord>({
    site: siteId,
    provider,
    status: 'disconnected',
    config_json: {},
  })
}

/** Connect (stub): set status to connected and store placeholder config. */
export async function connectIntegration(
  pb: PocketBase,
  id: string,
  config?: Record<string, unknown>
): Promise<IntegrationRecord> {
  return await pb.collection('integrations').update<IntegrationRecord>(id, {
    status: 'connected',
    connected_at: new Date().toISOString(),
    config_json: config ?? { stub: true, connectedAt: new Date().toISOString() },
  })
}

/** Disconnect: set status to disconnected, clear config. */
export async function disconnectIntegration(
  pb: PocketBase,
  id: string
): Promise<IntegrationRecord> {
  return await pb.collection('integrations').update<IntegrationRecord>(id, {
    status: 'disconnected',
    connected_at: null,
    config_json: {},
  })
}

export function getProviderLabel(provider: IntegrationProvider): string {
  const labels: Record<IntegrationProvider, string> = {
    google_analytics: 'Google Analytics',
    google_search_console: 'Google Search Console',
    lighthouse: 'Lighthouse',
    google_business_profile: 'Google Business Profile',
    google_ads: 'Google Ads',
    woocommerce: 'WooCommerce',
    bing_webmaster: 'Bing Webmaster Tools',
  }
  return labels[provider] ?? provider
}

export function getStatusLabel(status: IntegrationStatus): string {
  const labels: Record<IntegrationStatus, string> = {
    disconnected: 'Disconnected',
    pending: 'Pending',
    connected: 'Connected',
    error: 'Error',
  }
  return labels[status] ?? status
}
