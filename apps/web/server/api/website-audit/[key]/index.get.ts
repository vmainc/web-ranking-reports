import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { applyPublicCors } from '~/server/utils/publicCors'
import {
  effectiveWebsiteAuditBranding,
  getPublicBrandingForOwner,
  getWebsiteAuditFormSettings,
  publicFormDto,
  publicLogoUrlForSettings,
  resolveOwnerIdByPublicKey,
} from '~/server/utils/websiteAuditForm'

/** Public: branded form schema for embed / iframe (no PII). */
export default defineEventHandler(async (event) => {
  applyPublicCors(event)
  const key = getRouterParam(event, 'key')
  if (!key) throw createError({ statusCode: 400, message: 'Embed key required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await resolveOwnerIdByPublicKey(pb, key)
  if (!ownerId) throw createError({ statusCode: 404, message: 'Form not found' })

  const settings = await getWebsiteAuditFormSettings(pb, ownerId)
  if (settings.publicKey !== key || !settings.enabled) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  const agencyBranding = await getPublicBrandingForOwner(pb, ownerId)
  const branding = effectiveWebsiteAuditBranding(agencyBranding, settings)
  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || '').replace(/\/+$/, '')
  const logoUrl = await publicLogoUrlForSettings(pb, ownerId, key, settings, appUrl)

  const turnstileSiteKey = String(config.public?.turnstileSiteKey || '').trim()
  return {
    ...publicFormDto(settings, branding, logoUrl),
    turnstileSiteKey: turnstileSiteKey || null,
  }
})
