import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { refreshAccessToken } from '~/server/utils/googleOauth'

const GOOGLE_ANCHOR = 'google_analytics'
const GOOGLE_PROVIDERS = ['google_analytics', 'google_search_console', 'lighthouse', 'google_business_profile', 'google_ads'] as const

interface IntegrationRow {
  id: string
  provider: string
  status: string
  config_json?: {
    google?: {
      access_token?: string
      refresh_token?: string
      expires_at?: string
      email?: string
      scope?: string
    }
    linked_to?: string
    property_id?: string
    property_name?: string
    gsc_site_url?: string
    gsc_site_name?: string
    gbp_account_id?: string
    gbp_location_id?: string
    gbp_location_name?: string
    ads_customer_id?: string
    ads_customer_name?: string
  }
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'siteId required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const list = await pb.collection('integrations').getFullList<IntegrationRow>({
    filter: `site = "${siteId}"`,
  })
  const byProvider = Object.fromEntries(list.map((r) => [r.provider, r]))
  const anchor = byProvider[GOOGLE_ANCHOR]
  const ga = byProvider['google_analytics']
  const gsc = byProvider['google_search_console']
  const lighthouse = byProvider['lighthouse']
  const gbp = byProvider['google_business_profile']
  const googleAds = byProvider['google_ads']

  let connected = false
  let email: string | null = null
  const providers: Record<string, { status: string; hasScope: boolean }> = {
    google_analytics: { status: ga?.status ?? 'disconnected', hasScope: false },
    google_search_console: { status: gsc?.status ?? 'disconnected', hasScope: false },
    lighthouse: { status: lighthouse?.status ?? (anchor?.status === 'connected' ? 'connected' : 'disconnected'), hasScope: false },
    google_business_profile: { status: gbp?.status ?? (anchor?.status === 'connected' ? 'connected' : 'disconnected'), hasScope: false },
    google_ads: { status: googleAds?.status ?? (anchor?.status === 'connected' ? 'connected' : 'disconnected'), hasScope: false },
  }

  if (anchor?.status === 'connected' && anchor.config_json?.google) {
    const google = anchor.config_json.google
    email = google.email ?? null
    const scopes = (google.scope ?? '').split(' ')
    providers.google_analytics.hasScope = scopes.some((s) => s.includes('analytics'))
    providers.google_search_console.hasScope = scopes.some((s) => s.includes('webmasters'))
    providers.google_business_profile.hasScope = scopes.some((s) => s.includes('business.manage'))
    providers.google_ads.hasScope = scopes.some((s) => s.includes('adwords'))

    let accessToken = google.access_token
    let expiresAt = google.expires_at
    const refreshToken = google.refresh_token
    const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0
    const needRefresh = refreshToken && (Date.now() >= expiresMs - 60 * 1000)

    if (needRefresh) {
      try {
        let settings: { client_id: string; client_secret: string; redirect_uri: string }
        const row = await pb.collection('app_settings').getFirstListItem<{ value: typeof settings }>('key="google_oauth"')
        settings = row?.value as typeof settings
        const refreshed = await refreshAccessToken(settings, refreshToken)
        accessToken = refreshed.access_token
        const newExpires = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString()
        await pb.collection('integrations').update(anchor.id, {
          config_json: {
            ...anchor.config_json,
            google: {
              ...google,
              access_token: accessToken,
              expires_at: newExpires,
            },
          },
        })
        expiresAt = newExpires
      } catch (e) {
        console.error('Google token refresh failed', e)
        await pb.collection('integrations').update(anchor.id, {
          status: 'error',
          config_json: {
            ...anchor.config_json,
            google: {
              ...google,
              last_error: String(e),
            },
          },
        })
        providers.google_analytics.status = 'error'
        providers.google_search_console.status = 'error'
      }
    }

    if (
      providers.google_analytics.status === 'connected' ||
      providers.google_search_console.status === 'connected' ||
      providers.google_business_profile.status === 'connected' ||
      providers.google_ads.status === 'connected'
    ) {
      connected = true
    }
  }

  const selectedProperty =
    anchor?.config_json?.property_id != null
      ? {
          id: anchor.config_json.property_id as string,
          name: (anchor.config_json.property_name as string) || (anchor.config_json.property_id as string),
        }
      : null

  const selectedSearchConsoleSite =
    anchor?.config_json?.gsc_site_url != null
      ? {
          siteUrl: anchor.config_json.gsc_site_url as string,
          name: (anchor.config_json.gsc_site_name as string) || (anchor.config_json.gsc_site_url as string),
        }
      : null

  const selectedBusinessProfileLocation =
    anchor?.config_json?.gbp_location_id != null
      ? {
          locationId: anchor.config_json.gbp_location_id as string,
          accountId: (anchor.config_json.gbp_account_id as string) || '',
          name: (anchor.config_json.gbp_location_name as string) || (anchor.config_json.gbp_location_id as string),
        }
      : null

  const selectedAdsCustomer =
    anchor?.config_json?.ads_customer_id != null && anchor.config_json.ads_customer_id !== ''
      ? {
          customerId: anchor.config_json.ads_customer_id as string,
          name: (anchor.config_json.ads_customer_name as string) || (anchor.config_json.ads_customer_id as string),
        }
      : null

  return {
    connected,
    providers,
    email,
    selectedProperty,
    selectedSearchConsoleSite,
    selectedBusinessProfileLocation,
    selectedAdsCustomer,
  }
})
