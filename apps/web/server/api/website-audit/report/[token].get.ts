import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { applyPublicCors } from '~/server/utils/publicCors'
import {
  effectiveWebsiteAuditBranding,
  getPublicBrandingForOwner,
  getWebsiteAuditFormSettings,
  publicLogoUrlForSettings,
  toPublicReportDto,
  type WebsiteAuditLeadRecord,
} from '~/server/utils/websiteAuditForm'

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Public report page data (token from email link). */
export default defineEventHandler(async (event) => {
  applyPublicCors(event)
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Token required' })

  const pb = getAdminPb()
  await adminAuth(pb)

  let lead: WebsiteAuditLeadRecord
  try {
    lead = (await pb
      .collection('website_audit_leads')
      .getFirstListItem(`public_token = "${esc(token)}"`)) as unknown as WebsiteAuditLeadRecord
  } catch {
    throw createError({ statusCode: 404, message: 'Report not found' })
  }

  const ownerId = String(lead.user)
  const settings = await getWebsiteAuditFormSettings(pb, ownerId)
  const agencyBranding = await getPublicBrandingForOwner(pb, ownerId)
  const branding = effectiveWebsiteAuditBranding(agencyBranding, settings)
  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || '').replace(/\/+$/, '')
  const logoUrl = await publicLogoUrlForSettings(pb, ownerId, settings.publicKey, settings, appUrl)

  return toPublicReportDto(lead, branding, logoUrl)
})
