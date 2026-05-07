import type PocketBase from 'pocketbase'
import { getZoneAnalytics, getZones } from '~/server/services/cloudflare'
import { cloudflareSetupError, isMissingCloudflareCollectionError } from '~/server/utils/cloudflareSetup'

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const maybe = err as { data?: { message?: string }; statusMessage?: string; message?: string }
    if (typeof maybe.data?.message === 'string' && maybe.data.message.trim()) return maybe.data.message.trim()
    if (typeof maybe.statusMessage === 'string' && maybe.statusMessage.trim()) return maybe.statusMessage.trim()
    if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message.trim()
  }
  return String(err || 'Unknown error')
}

export async function syncCloudflareDataForUser(
  pb: PocketBase,
  userId: string,
): Promise<{ zones: number; failedZones?: number; errors?: string[] }> {
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

  let synced = 0
  const errors: string[] = []

  for (const zone of zones) {
    let metrics: Awaited<ReturnType<typeof getZoneAnalytics>>
    try {
      metrics = await getZoneAnalytics(token, zone.zone_id)
    } catch (e) {
      errors.push(`${zone.name}: ${errorMessage(e)}`)
      continue
    }
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
    synced += 1
  }

  if (zones.length > 0 && synced === 0 && errors.length > 0) {
    throw createError({
      statusCode: 400,
      message: `Cloudflare sync failed for all zones. ${errors[0]}`,
    })
  }

  return {
    zones: synced,
    ...(errors.length ? { failedZones: errors.length, errors: errors.slice(0, 5) } : {}),
  }
}

