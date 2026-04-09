import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { memberPendingFromRecord } from '~/server/utils/memberInviteEmail'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, userId)

  const ownerRecord = await pb.collection('users').getOne<{ email?: string; name?: string }>(ctx.ownerId)
  const agencyName =
    (typeof ownerRecord.name === 'string' && ownerRecord.name) ||
    (typeof ownerRecord.email === 'string' && ownerRecord.email.split('@')[0]) ||
    'Agency'

  if (ctx.role !== 'owner') {
    return {
      role: ctx.role,
      ownerId: ctx.ownerId,
      agencyName,
      canManageTeam: false,
      members: [],
      clients: [],
    }
  }

  let members: Array<{
    id: string
    email: string
    name: string
    created: string
    inviteEmailSentAt: string
    pending: boolean
  }> = []
  let clients: Array<{ id: string; email: string; name: string; siteIds: string[] }> = []

  try {
    const m = await pb.collection('users').getFullList<{
      id: string
      email?: string
      name?: string
      created?: string
      invite_email_sent_at?: string
      lastLogin?: string
      last_login?: string
    }>({
      filter: `agency_owner = "${userId}" && (account_type = "member" || account_type = "agency_member")`,
      batch: 200,
    })
    members = m.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      name: typeof u.name === 'string' ? u.name : '',
      created: typeof u.created === 'string' ? u.created : '',
      inviteEmailSentAt: typeof u.invite_email_sent_at === 'string' ? u.invite_email_sent_at : '',
      pending: memberPendingFromRecord(u as Record<string, unknown>),
    }))
  } catch {
    // schema missing
  }

  try {
    const c = await pb.collection('users').getFullList<{ id: string; email?: string; name?: string }>({
      filter: `agency_owner = "${userId}" && account_type = "client"`,
      batch: 200,
    })
    for (const u of c) {
      let siteIds: string[] = []
      try {
        const rows = await pb.collection('client_site_access').getFullList<{ site?: string }>({
          filter: `client = "${u.id}"`,
          batch: 100,
        })
        siteIds = rows.map((r) => (typeof r.site === 'string' ? r.site : '')).filter(Boolean)
      } catch {
        siteIds = []
      }
      clients.push({
        id: u.id,
        email: u.email ?? '',
        name: typeof u.name === 'string' ? u.name : '',
        siteIds,
      })
    }
  } catch {
    // schema missing
  }

  let ownerSites: { id: string; name: string; domain: string }[] = []
  try {
    const s = await pb.collection('sites').getFullList<{ id: string; name: string; domain: string }>({
      filter: `user = "${userId}"`,
      sort: 'name',
    })
    ownerSites = s.map((x) => ({ id: x.id, name: x.name, domain: x.domain }))
  } catch {
    ownerSites = []
  }

  return {
    role: 'owner',
    ownerId: userId,
    agencyName,
    canManageTeam: true,
    members,
    clients,
    ownerSites,
  }
})
