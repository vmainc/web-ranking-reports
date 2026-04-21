import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

type AccuLocation = { Key?: string; LocalizedName?: string; Country?: { LocalizedName?: string } }
type AccuCurrent = {
  WeatherText?: string
  WeatherIcon?: number
  IsDayTime?: boolean
  Temperature?: { Metric?: { Value?: number; Unit?: string } }
  MobileLink?: string
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  let apiKey = ''
  let address = ''
  try {
    const k = await pb.collection('app_settings').getFirstListItem<{ value?: { api_key?: string } }>('key="accuweather"')
    apiKey = k?.value?.api_key?.trim?.() ?? ''
  } catch {}
  try {
    const b = await pb.collection('app_settings').getFirstListItem<{ value?: { address?: string } }>('key="agency_branding"')
    address = b?.value?.address?.trim?.() ?? ''
  } catch {}

  if (!apiKey) return { enabled: false, reason: 'missing_api_key' }
  if (!address) return { enabled: false, reason: 'missing_address' }

  const locRes = await $fetch<AccuLocation[]>('https://dataservice.accuweather.com/locations/v1/cities/search', {
    query: { apikey: apiKey, q: address, details: 'false' },
  }).catch(() => [])
  const loc = Array.isArray(locRes) ? locRes[0] : undefined
  if (!loc?.Key) return { enabled: false, reason: 'location_not_found' }

  const currRes = await $fetch<AccuCurrent[]>(`https://dataservice.accuweather.com/currentconditions/v1/${encodeURIComponent(loc.Key)}`, {
    query: { apikey: apiKey, details: 'false' },
  }).catch(() => [])
  const current = Array.isArray(currRes) ? currRes[0] : undefined
  if (!current) return { enabled: false, reason: 'current_conditions_unavailable' }

  const iconNum = typeof current.WeatherIcon === 'number' ? current.WeatherIcon : 1
  const iconCode = String(iconNum).padStart(2, '0')
  const iconUrl = `https://developer.accuweather.com/sites/default/files/${iconCode}-s.png`

  return {
    enabled: true,
    location: [loc.LocalizedName, loc.Country?.LocalizedName].filter(Boolean).join(', '),
    weatherText: current.WeatherText ?? '',
    isDayTime: current.IsDayTime ?? true,
    tempMetric: current.Temperature?.Metric?.Value ?? null,
    tempUnit: current.Temperature?.Metric?.Unit ?? 'C',
    iconUrl,
    mobileLink: current.MobileLink ?? '',
  }
})

