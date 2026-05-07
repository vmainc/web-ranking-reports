import type PocketBase from 'pocketbase'
import { getZoneAnalytics, getZones } from '~/server/services/cloudflare'
import { cloudflareSetupError, isMissingCloudflareCollectionError } from '~/server/utils/cloudflareSetup'

export async function syncCloudflareDataForUser(pb: PocketBase, userId: string): Promise<{ zones: number }> {
  let rows: Array<{ id: string; api_token?: string; connected?: boolean }> = []
  try {
    rows = await pb.collection('cloudflare_integrations').getFullList<{
      id: string
      api_token?: string
      connected?: boolean
    }>({ filter: `user = "${userId}"`, sort: '-updated' })
  } catch (e) {
    if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
    throw e
  }

  const cfg = rows[0]
  const token = typeof cfg?.api_token === 'string' ? cfg.api_token.trim() : ''
  if (!cfg?.connected || !token) {
    throw createError({ statusCode: 400, message: 'Cloudflare is not connected.' })
  }

  const zones = await getZones(token)
  const today = new Date().toISOString().slice(0, 10)
  const dayIso = `${today}T00:00:00.000Z`

  for (const zone of zones) {
    const metrics = await getZoneAnalytics(token, zone.zone_id)
    let existing: { id: string } | null = null
    try {
      existing = await pb.collection('cloudflare_data').getFirstListItem<{ id: string }>(
        `user = "${userId}" && zone_id = "${zone.zone_id}" && date = "${dayIso}"`,
      )
    } catch (e) {
      if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
      existing = null
    }
    const payload = {
      user: userId,
      zone_id: zone.zone_id,
      domain: zone.name,
      requests: metrics.requests,
      bandwidth: metrics.bandwidth,
      threats: metrics.threats,
      cached_percent: metrics.cached_percent,
      date: dayIso,
    }
    if (existing?.id) {
      try {
        await pb.collection('cloudflare_data').update(existing.id, payload)
      } catch (e) {
        if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
        throw e
      }
    } else {
      try {
        await pb.collection('cloudflare_data').create(payload)
      } catch (e) {
        if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
        throw e
      }
    }
  }

  return { zones: zones.length }
}

