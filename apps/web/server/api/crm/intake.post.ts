import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'

type IntakeBody = {
  client?: string
  snapshot_at?: string | null
  website_url?: string | null
  homepage_notes?: string | null
  local_visibility_notes?: string | null
  ads_presence_notes?: string | null
  analytics_notes?: string | null
  mobile_speed_notes?: string | null
  internal_note?: string | null
}

function trimOrNull(value: string | null | undefined) {
  const t = value?.trim()
  return t || null
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const body = (await readBody(event).catch(() => ({}))) as IntakeBody
  const clientId = body?.client?.trim()
  if (!clientId) throw createError({ statusCode: 400, message: 'Client is required' })

  const clientRecord = await pb.collection('crm_clients').getOne(clientId)
  if (!crmRowOwnedByUser(clientRecord as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const payload = {
    snapshot_at: trimOrNull(body.snapshot_at) || null,
    website_url: trimOrNull(body.website_url),
    homepage_notes: trimOrNull(body.homepage_notes),
    local_visibility_notes: trimOrNull(body.local_visibility_notes),
    ads_presence_notes: trimOrNull(body.ads_presence_notes),
    analytics_notes: trimOrNull(body.analytics_notes),
    mobile_speed_notes: trimOrNull(body.mobile_speed_notes),
    internal_note: trimOrNull(body.internal_note),
  }

  const existing = await pb.collection('crm_intake').getFullList({
    filter: `client = "${clientId}"`,
    sort: '-updated',
  })
  if (existing[0]) {
    return await pb.collection('crm_intake').update(existing[0].id, payload)
  }

  return await pb.collection('crm_intake').create({
    user: crmOwnerId,
    client: clientId,
    ...payload,
  })
})
