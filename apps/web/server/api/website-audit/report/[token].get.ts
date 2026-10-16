import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { applyPublicCors } from '~/server/utils/publicCors'
import {
  getPublicBrandingForOwner,
  getWebsiteAuditFormSettings,
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
  const branding = await getPublicBrandingForOwner(pb, ownerId)
  const settings = await getWebsiteAuditFormSettings(pb, ownerId)
  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || '').replace(/\/+$/, '')
  const logoUrl = `${appUrl}/api/website-audit/${encodeURIComponent(settings.publicKey)}/logo`

  return toPublicReportDto(lead, branding, logoUrl)
})
