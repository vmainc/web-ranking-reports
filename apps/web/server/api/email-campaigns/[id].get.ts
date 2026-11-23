import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

type Row = {
  id: string
  name: string
  subject: string
  body_html: string
  status: string
  send_at?: string | null
  sent_at?: string | null
  created_by: string
  created: string
  updated: string
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = getRouterParam(event, 'id')?.trim()
  if (!id) throw createError({ statusCode: 400, message: 'Campaign id is required' })

  const pb = getAdminPb()
  await adminAuth(pb)

  let row: Row
  try {
    row = await pb.collection('email_campaigns').getOne<Row>(id)
  } catch {
    throw createError({ statusCode: 404, message: 'Campaign not found' })
  }

  if (row.created_by !== userId) {
    throw createError({ statusCode: 404, message: 'Campaign not found' })
  }

  return { campaign: row }
})