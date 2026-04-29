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
  plan: 'free' | 'starter' | 'growth' | 'agency'
  subscriptionStatus: string
  isTrial: boolean
  trialDaysLeft: number
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
  const subscriptions = await pb.collection('subscriptions').getFullList<{
    user?: string
    plan?: string
    status?: string
    is_trial?: boolean
    trial_end?: string
  }>({
    batch: 500,
    sort: '-updated',
  }).catch(() => [])
  const subByUser = new Map(
    subscriptions
      .map((s) => [String(s.user || ''), s] as const)
      .filter(([uid]) => !!uid),
  )

  const users: AdminUserRow[] = records.map((r) => {
    const raw = r as unknown as Record<string, unknown>
    const email = typeof raw.email === 'string' ? raw.email : ''
    const id = typeof raw.id === 'string' ? raw.id : String(raw.id ?? '')
    const sub = subByUser.get(id)
    const planRaw = String(sub?.plan || 'free').toLowerCase()
    const plan = (planRaw === 'starter' || planRaw === 'growth' || planRaw === 'agency' ? planRaw : 'free') as
      | 'free'
      | 'starter'
      | 'growth'
      | 'agency'
    const isTrial = sub?.is_trial === true
    let trialDaysLeft = 0
    if (isTrial && typeof sub?.trial_end === 'string') {
      const now = new Date()
      const end = new Date(sub.trial_end)
      if (!Number.isNaN(end.getTime()) && end > now) {
        trialDaysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      }
    }
    return {
      id,
      email,
      name: typeof raw.name === 'string' ? raw.name : '',
      verified: !!raw.verified,
      created: typeof raw.created === 'string' ? raw.created : '',
      updated: typeof raw.updated === 'string' ? raw.updated : '',
      userKind: classifyAppUserKind(email, raw, adminEmails),
      plan,
      subscriptionStatus: String(sub?.status || 'active'),
      isTrial,
      trialDaysLeft,
    }
  })

  users.sort((a, b) => {
    const aTrialScore = a.isTrial && a.trialDaysLeft > 0 ? 0 : 1
    const bTrialScore = b.isTrial && b.trialDaysLeft > 0 ? 0 : 1
    if (aTrialScore !== bTrialScore) return aTrialScore - bTrialScore

    // For trial users, fewer days left first (more urgent first).
    if (aTrialScore === 0 && bTrialScore === 0 && a.trialDaysLeft !== b.trialDaysLeft) {
      return a.trialDaysLeft - b.trialDaysLeft
    }

    // Fallback: newest users first.
    return String(b.created || '').localeCompare(String(a.created || ''))
  })

  return {
    collectionName: col.name,
    total: users.length,
    users,
  }
})
