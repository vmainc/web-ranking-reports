import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

const BRANDING_KEY = 'agency_branding'

interface BrandingColors {
  primary: string
  accent: string
  text: string
  surface: string
  name?: string
  address?: string
  phone?: string
}

function normalizeHex(value: string | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (!/^#?[0-9a-fA-F]{6}$/.test(v)) return null
  return `#${v.replace('#', '').toUpperCase()}`
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const allowUnauthedDev = import.meta.dev
  const userId = allowUnauthedDev ? null : await getUserIdFromRequest(event)
  if (!userId && !allowUnauthedDev) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  if (!allowUnauthedDev && userId) {
    const adminEmails = getAdminEmails().map((e) => e.toLowerCase().trim())
    const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
    const userEmail = userRecord?.email?.toLowerCase?.().trim() || ''
    if (!userEmail || !adminEmails.includes(userEmail)) throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = (await readBody(event).catch(() => ({}))) as Partial<BrandingColors>
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const address = typeof body.address === 'string' ? body.address.trim().slice(0, 180) : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : ''
  const primary = normalizeHex(body.primary)
  const accent = normalizeHex(body.accent)
  const text = normalizeHex(body.text)
  const surface = normalizeHex(body.surface)

  if (!primary || !accent || !text || !surface) {
    throw createError({ statusCode: 400, message: 'All colors must be valid 6-digit hex values.' })
  }

  const value: BrandingColors = {
    primary,
    accent,
    text,
    surface,
    ...(name ? { name } : {}),
    ...(address ? { address } : {}),
    ...(phone ? { phone } : {}),
  }

  try {
    const existing = await pb.collection('app_settings').getFirstListItem<{ id: string }>(`key="${BRANDING_KEY}"`)
    await pb.collection('app_settings').update(existing.id, { value })
  } catch {
    await pb.collection('app_settings').create({ key: BRANDING_KEY, value })
  }
  return { ok: true, colors: value }
})

