import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { reportUrlForToken, type WebsiteAuditLeadRecord } from '~/server/utils/websiteAuditForm'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const q = getQuery(event)
  const status = typeof q.status === 'string' ? q.status.trim() : ''

  let filter = `user = "${ownerId.replace(/"/g, '\\"')}"`
  if (status && ['received', 'processing', 'ready', 'error'].includes(status)) {
    filter += ` && status = "${status}"`
  }

  const leads = (await pb.collection('website_audit_leads').getFullList({
    filter,
    sort: '-received_at',
  })) as unknown as WebsiteAuditLeadRecord[]

  return {
    leads: leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      status: lead.status,
      crm_client: lead.crm_client || null,
      received_at: lead.received_at,
      email_sent_at: lead.email_sent_at || null,
      error_text: lead.error_text || null,
      reportUrl: reportUrlForToken(lead.public_token),
      domain: (lead.audit_json as { domain?: string } | null)?.domain || null,
    })),
  }
})
