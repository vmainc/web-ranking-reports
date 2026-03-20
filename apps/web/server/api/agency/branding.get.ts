import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { BRANDING_KEY, DEFAULT_BRANDING, normalizeHex } from '~/server/utils/branding'

interface BrandingColors {
  primary: string
  accent: string
  text: string
  surface: string
}

export default defineEventHandler(async () => {
  const pb = getAdminPb()
  await adminAuth(pb)

  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: Partial<BrandingColors> }>(`key="${BRANDING_KEY}"`)
    const value = row?.value ?? {}
    return {
      colors: {
        primary: normalizeHex(value.primary) || DEFAULT_BRANDING.primary,
        accent: normalizeHex(value.accent) || DEFAULT_BRANDING.accent,
        text: normalizeHex(value.text) || DEFAULT_BRANDING.text,
        surface: normalizeHex(value.surface) || DEFAULT_BRANDING.surface,
      },
    }
  } catch {
    return { colors: DEFAULT_BRANDING }
  }
})

