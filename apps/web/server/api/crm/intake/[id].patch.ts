import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'

type IntakeBody = {
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
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Intake id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const existing = await pb.collection('crm_intake').getOne(id)
  if (!crmRowOwnedByUser(existing as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = (await readBody(event).catch(() => ({}))) as IntakeBody
  const updates: Record<string, unknown> = {}
  if (body.snapshot_at !== undefined) updates.snapshot_at = trimOrNull(body.snapshot_at)
  if (body.website_url !== undefined) updates.website_url = trimOrNull(body.website_url)
  if (body.homepage_notes !== undefined) updates.homepage_notes = trimOrNull(body.homepage_notes)
  if (body.local_visibility_notes !== undefined) updates.local_visibility_notes = trimOrNull(body.local_visibility_notes)
  if (body.ads_presence_notes !== undefined) updates.ads_presence_notes = trimOrNull(body.ads_presence_notes)
  if (body.analytics_notes !== undefined) updates.analytics_notes = trimOrNull(body.analytics_notes)
  if (body.mobile_speed_notes !== undefined) updates.mobile_speed_notes = trimOrNull(body.mobile_speed_notes)
  if (body.internal_note !== undefined) updates.internal_note = trimOrNull(body.internal_note)

  return await pb.collection('crm_intake').update(id, updates)
})
