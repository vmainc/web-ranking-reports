import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { lastLoginIsoFromRecord, memberPendingFromRecord } from '~/server/utils/memberInviteEmail'

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
    lastLogin: string
    pending: boolean
  }> = []
  let clients: Array<{ id: string; email: string; name: string; siteIds: string[] }> = []

  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const uid = esc(userId)

  try {
    /** Everyone under this owner except self; exclude only portal clients (account_type client). */
    const m = await pb.collection('users').getFullList<{
      id: string
      email?: string
      name?: string
      created?: string
      invite_email_sent_at?: string
      account_type?: string
      lastLogin?: string
      last_login?: string
    }>({
      filter: `agency_owner = "${uid}" && id != "${uid}"`,
      batch: 200,
    })
    members = m
      .filter((u) => {
        const t =
          typeof u.account_type === 'string' ? u.account_type.toLowerCase().trim() : ''
        return t !== 'client'
      })
      .map((u) => {
        const rec = u as Record<string, unknown>
        const lastLogin = lastLoginIsoFromRecord(rec)
        return {
          id: u.id,
          email: u.email ?? '',
          name: typeof u.name === 'string' ? u.name : '',
          created: typeof u.created === 'string' ? u.created : '',
          inviteEmailSentAt: typeof u.invite_email_sent_at === 'string' ? u.invite_email_sent_at : '',
          lastLogin,
          /** Invited until last login or record updated after invite (see memberOnboardedFromRecord). */
          pending: memberPendingFromRecord(rec),
        }
      })
  } catch (e) {
    console.error('[workspace] team members query failed (check users.agency_owner / account_type schema)', e)
  }

  try {
    const c = await pb.collection('users').getFullList<{ id: string; email?: string; name?: string }>({
      filter: `agency_owner = "${uid}" && account_type = "client"`,
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
