import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { BRANDING_KEY, DEFAULT_BRANDING, normalizeHex, brandingKeyForOwner } from '~/server/utils/branding'
import { resolveTimeZoneFromAddress, isValidIanaTimeZone } from '~/server/utils/timezoneByAddress'
import { getWorkspaceContext } from '~/server/utils/workspace'

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

const VMA_ADMIN_EMAIL = 'admin@vma.agency'

export default defineEventHandler(async (event) => {
  const pb = getAdminPb()
  await adminAuth(pb)
  let ownerId = ''

  let hasCustomLogo = false
  try {
    const userId = await getUserIdFromRequest(event).catch(() => null)
    if (userId) {
      const ctx = await getWorkspaceContext(pb, userId).catch(() => null)
      ownerId = ctx?.ownerId || userId
      const user = await pb.collection('users').getOne<{ email?: string }>(userId).catch(() => null)
      const email = String(user?.email || '').trim().toLowerCase()
      if (email === VMA_ADMIN_EMAIL) {
        const agencyRows = await pb.collection('agency').getFullList<{ logo?: string | string[] }>({ limit: 1 }).catch(() => [])
        const logo = agencyRows[0]?.logo
        if (typeof logo === 'string' && logo.trim()) hasCustomLogo = true
        if (Array.isArray(logo) && logo.length > 0 && String(logo[0] || '').trim()) hasCustomLogo = true
      }
    }
  } catch {
    hasCustomLogo = false
  }

  try {
    const key = ownerId ? brandingKeyForOwner(ownerId) : BRANDING_KEY
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: Partial<BrandingColors> }>(`key="${key}"`)
    const value = row?.value ?? {}
    const address = typeof value.address === 'string' ? value.address.trim() : ''
    const timezoneRaw = typeof value.timezone === 'string' ? value.timezone.trim() : ''
    const timezone = isValidIanaTimeZone(timezoneRaw)
      ? timezoneRaw
      : await resolveTimeZoneFromAddress(address)
    return {
      name: typeof value.name === 'string' ? value.name.trim() : '',
      hasCustomLogo,
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
    return { name: '', hasCustomLogo, address: '', phone: '', timezone: 'America/Chicago', colors: DEFAULT_BRANDING }
  }
})

