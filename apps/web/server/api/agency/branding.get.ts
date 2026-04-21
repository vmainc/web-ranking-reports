import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { BRANDING_KEY, DEFAULT_BRANDING, normalizeHex } from '~/server/utils/branding'
import { resolveTimeZoneFromAddress, isValidIanaTimeZone } from '~/server/utils/timezoneByAddress'

interface BrandingColors {
  primary: string
  accent: string
  text: string
  surface: string
  name?: string
  address?: string
  phone?: string
  timezone?: string
}

export default defineEventHandler(async () => {
  const pb = getAdminPb()
  await adminAuth(pb)

  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: Partial<BrandingColors> }>(`key="${BRANDING_KEY}"`)
    const value = row?.value ?? {}
    const address = typeof value.address === 'string' ? value.address.trim() : ''
    const timezoneRaw = typeof value.timezone === 'string' ? value.timezone.trim() : ''
    const timezone = isValidIanaTimeZone(timezoneRaw)
      ? timezoneRaw
      : await resolveTimeZoneFromAddress(address)
    return {
      name: typeof value.name === 'string' ? value.name.trim() : '',
      address,
      phone: typeof value.phone === 'string' ? value.phone.trim() : '',
      timezone,
      colors: {
        primary: normalizeHex(value.primary) || DEFAULT_BRANDING.primary,
        accent: normalizeHex(value.accent) || DEFAULT_BRANDING.accent,
        text: normalizeHex(value.text) || DEFAULT_BRANDING.text,
        surface: normalizeHex(value.surface) || DEFAULT_BRANDING.surface,
      },
    }
  } catch {
    return { name: '', address: '', phone: '', timezone: 'America/Chicago', colors: DEFAULT_BRANDING }
  }
})

