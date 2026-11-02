import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  loadCompetitiveSnapshots,
  runCompetitiveSnapshot,
  upsertCompetitiveSnapshot,
} from '~/server/utils/competitiveSnapshot'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const method = getMethod(event)

  if (method === 'GET') {
    const snapshots = await loadCompetitiveSnapshots(pb, ownerId)
    const sorted = [...snapshots].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    return { snapshots: sorted }
  }

  if (method === 'POST') {
    const body = (await readBody(event).catch(() => ({}))) as {
      targetDomain?: string
      keywords?: string
    }

    const snapshot = await runCompetitiveSnapshot(pb, {
      targetDomain: String(body.targetDomain || ''),
      keywords: body.keywords,
    })
    const snapshots = await upsertCompetitiveSnapshot(pb, ownerId, snapshot)
    const sorted = [...snapshots].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    return { snapshot, snapshots: sorted }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
