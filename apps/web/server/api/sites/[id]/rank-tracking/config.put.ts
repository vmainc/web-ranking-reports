/**
 * PUT /api/sites/:id/rank-tracking/config
 * Saves ranking location/context, marks results stale, background-refreshes keywords.
 */
import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import {
  formatRankContextLabel,
  normalizeSiteRankTrackingConfig,
  parsePositiveInt,
  resolveSiteRankContext,
  siteRankConfigToContext,
  type SiteRankTrackingConfig,
} from '~/server/utils/siteRankContext'
import { getCachedDfsLocations } from '~/server/utils/dataforseoLocations'
import { ensureSitesRankTrackingConfigField } from '~/server/utils/ensureRankTrackingConfigField'
import { markRankKeywordsContextStale, runRankFetchForSite } from '~/server/utils/rankTrackingFetch'
import { formatRankLocationDisplayName } from '~/utils/rankTrackingDisplay'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PUT' && getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const body = (await readBody(event).catch(() => ({}))) as {
    location_code?: number | string
    location_name?: string
    location_type?: string
    country_iso?: string
    language_code?: string
    device?: 'desktop' | 'mobile'
    os?: string
    include_subdomains?: boolean
  }

  const locationCode = parsePositiveInt(body.location_code)
  if (!locationCode) {
    throw createError({ statusCode: 400, message: 'location_code is required' })
  }

  let locationName = typeof body.location_name === 'string' ? body.location_name.trim() : ''
  let locationType = typeof body.location_type === 'string' ? body.location_type : undefined
  let countryIso = typeof body.country_iso === 'string' ? body.country_iso : undefined
  try {
    const { locations } = await getCachedDfsLocations(pb)
    const match = locations.find((l) => l.location_code === locationCode)
    if (match) {
      locationName = match.location_name
      locationType = match.location_type || locationType
      countryIso = match.country_iso_code || countryIso
    }
  } catch {
    // require client-provided name if catalog unavailable
  }
  if (!locationName) {
    throw createError({
      statusCode: 400,
      message: 'location_name is required when location catalog is unavailable',
    })
  }

  const prevConfig = normalizeSiteRankTrackingConfig(
    (site as { rank_tracking_config?: unknown }).rank_tracking_config,
  )
  const nextConfig: SiteRankTrackingConfig = normalizeSiteRankTrackingConfig({
    ...prevConfig,
    location_code: locationCode,
    location_name: locationName,
    location_type: locationType,
    country_iso: countryIso,
    language_code: body.language_code ?? prevConfig.language_code,
    device: body.device === 'mobile' ? 'mobile' : body.device === 'desktop' ? 'desktop' : prevConfig.device,
    os: body.os ?? prevConfig.os,
    include_subdomains:
      typeof body.include_subdomains === 'boolean' ? body.include_subdomains : prevConfig.include_subdomains,
    search_engine: 'google',
  })

  const identityChanged =
    prevConfig.location_code !== nextConfig.location_code ||
    prevConfig.language_code !== nextConfig.language_code ||
    prevConfig.device !== nextConfig.device

  try {
    await ensureSitesRankTrackingConfigField(pb)
  } catch (e) {
    console.error('[rank-tracking] could not ensure rank_tracking_config field', e)
  }

  await pb.collection('sites').update(siteId, {
    rank_tracking_config: nextConfig,
  })

  const savedSite = await pb.collection('sites').getOne(siteId)
  const persisted = normalizeSiteRankTrackingConfig(
    (savedSite as { rank_tracking_config?: unknown }).rank_tracking_config,
  )
  if (persisted.location_code !== locationCode) {
    throw createError({
      statusCode: 500,
      message:
        'Ranking location did not save. The sites collection may be missing the rank_tracking_config field — run create-collections.mjs or PocketBase migrations, then try again.',
    })
  }

  let refreshPending = false
  if (identityChanged) {
    await markRankKeywordsContextStale(pb, siteId)
    const domain = typeof site.domain === 'string' ? site.domain.trim() : ''
    if (domain) {
      refreshPending = true
      const sid = siteId
      const cfg = nextConfig
      void (async () => {
        try {
          const { getAdminPb, adminAuth } = await import('~/server/utils/pbServer')
          const bgPb = getAdminPb()
          await adminAuth(bgPb)
          await runRankFetchForSite(bgPb, sid, domain, {
            siteRecord: { rank_tracking_config: cfg, domain },
            rankContext: resolveSiteRankContext({ rank_tracking_config: cfg }),
          })
        } catch (e) {
          console.error('[rank-tracking] background refresh after location change failed', e)
        }
      })()
    }
  }

  const context = siteRankConfigToContext(nextConfig)
  return {
    config: nextConfig,
    context: {
      locationCode: context.locationCode,
      locationName: context.locationName,
      locationDisplayName: formatRankLocationDisplayName(context.locationName),
      languageCode: context.languageCode,
      device: context.device,
      os: context.os,
      includeSubdomains: context.includeSubdomains,
      searchEngine: context.searchEngine,
    },
    label: formatRankContextLabel(context),
    identityChanged,
    refreshPending,
    message: identityChanged
      ? 'Ranking location updated. Refreshing keyword rankings for the new location…'
      : 'Ranking settings saved.',
  }
})
