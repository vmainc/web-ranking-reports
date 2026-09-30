import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  listProspectAudits,
  runProspectAudit,
  saveProspectAudit,
} from '~/server/utils/prospectAudit'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const method = getMethod(event)

  if (method === 'GET') {
    const audits = await listProspectAudits(pb, ownerId)
    return { audits }
  }

  if (method === 'POST') {
    const body = (await readBody(event).catch(() => ({}))) as {
      domain?: string
      keywordLimit?: number
    }
    const domain = String(body.domain || '').trim()
    if (!domain) throw createError({ statusCode: 400, message: 'Domain is required.' })

    const audit = await runProspectAudit(pb, domain, { keywordLimit: body.keywordLimit })
    const audits = await saveProspectAudit(pb, ownerId, audit)
    return { audit, audits }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
