import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  createWorkspaceWebsiteAuditLead,
  isWorkspaceWebsiteAuditLead,
  mapWebsiteAuditLeadSummary,
  scheduleWebsiteAuditProcessing,
  type WebsiteAuditLeadRecord,
} from '~/server/utils/websiteAuditForm'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const method = getMethod(event)

  if (method === 'GET') {
    const leads = (await pb.collection('website_audit_leads').getFullList({
      filter: `user = "${ownerId.replace(/"/g, '\\"')}"`,
      sort: '-received_at',
    })) as unknown as WebsiteAuditLeadRecord[]

    return {
      audits: leads.filter(isWorkspaceWebsiteAuditLead).map(mapWebsiteAuditLeadSummary),
    }
  }

  if (method === 'POST') {
    const body = (await readBody(event).catch(() => ({}))) as {
      website?: string
      name?: string
      email?: string
      phone?: string
      createCrmContact?: boolean
      emailReportWhenReady?: boolean
    }

    const lead = await createWorkspaceWebsiteAuditLead(pb, ownerId, {
      website: String(body.website || ''),
      name: body.name,
      email: body.email,
      phone: body.phone,
      createCrmContact: !!body.createCrmContact,
      emailReportWhenReady: !!body.emailReportWhenReady,
    })

    scheduleWebsiteAuditProcessing(pb, lead.id)

    const leads = (await pb.collection('website_audit_leads').getFullList({
      filter: `user = "${ownerId.replace(/"/g, '\\"')}"`,
      sort: '-received_at',
    })) as unknown as WebsiteAuditLeadRecord[]

    return {
      audit: mapWebsiteAuditLeadSummary(lead),
      audits: leads.filter(isWorkspaceWebsiteAuditLead).map(mapWebsiteAuditLeadSummary),
    }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
