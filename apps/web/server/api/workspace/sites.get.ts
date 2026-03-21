import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, userId)

  if (ctx.role === 'owner') {
    const sites = await pb.collection('sites').getFullList<{
      id: string
      user: string
      name: string
      domain: string
      created: string
      updated: string
    }>({
      filter: `user = "${userId}"`,
      sort: '-created',
    })
    return { role: 'owner' as const, sites: sites.map((s) => ({ ...s, canWrite: true })) }
  }

  if (ctx.role === 'member') {
    const sites = await pb.collection('sites').getFullList<{
      id: string
      user: string
      name: string
      domain: string
      created: string
      updated: string
    }>({
      filter: `user = "${ctx.ownerId}"`,
      sort: '-created',
    })
    return { role: 'member' as const, sites: sites.map((s) => ({ ...s, canWrite: true })) }
  }

  // client
  let access: { site: string }[] = []
  try {
    access = await pb.collection('client_site_access').getFullList<{ site: string }>({
      filter: `client = "${userId}"`,
      batch: 200,
    })
  } catch {
    return { role: 'client' as const, sites: [] }
  }
  const ids = [...new Set(access.map((a) => a.site).filter(Boolean))]
  const sites: Array<{
    id: string
    user: string
    name: string
    domain: string
    created: string
    updated: string
    canWrite: boolean
  }> = []
  for (const id of ids) {
    try {
      const s = await pb.collection('sites').getOne<{
        id: string
        user: string
        name: string
        domain: string
        created: string
        updated: string
      }>(id)
      sites.push({ ...s, canWrite: false })
    } catch {
      // skip
    }
  }
  sites.sort((a, b) => (a.created < b.created ? 1 : -1))
  return { role: 'client' as const, sites }
})
