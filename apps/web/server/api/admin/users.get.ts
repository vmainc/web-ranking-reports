import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { getAuthUsersCollection } from '~/server/utils/authCollection'
import { classifyAppUserKind, type AppUserKind } from '~/server/utils/userKind'

export type { AppUserKind }

export type AdminUserRow = {
  id: string
  email: string
  name: string
  verified: boolean
  created: string
  updated: string
  /** admin | agency | client — see `classifyAppUserKind` / docs/POCKETBASE_SETUP.md */
  userKind: AppUserKind
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const adminEmails = getAdminEmails()
  const pb = getAdminPb()
  await adminAuth(pb)

  const col = await getAuthUsersCollection(pb)
  if (!col?.name) {
    throw createError({ statusCode: 503, message: 'Could not find an auth collection.' })
  }

  const userRecord = await pb.collection(col.name).getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  if (!userEmail || !adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const records = await pb.collection(col.name).getFullList({
    batch: 500,
    sort: '-created',
  })

  const users: AdminUserRow[] = records.map((r) => {
    const raw = r as unknown as Record<string, unknown>
    const email = typeof raw.email === 'string' ? raw.email : ''
    return {
      id: typeof raw.id === 'string' ? raw.id : String(raw.id ?? ''),
      email,
      name: typeof raw.name === 'string' ? raw.name : '',
      verified: !!raw.verified,
      created: typeof raw.created === 'string' ? raw.created : '',
      updated: typeof raw.updated === 'string' ? raw.updated : '',
      userKind: classifyAppUserKind(email, raw, adminEmails),
    }
  })

  return {
    collectionName: col.name,
    total: users.length,
    users,
  }
})
