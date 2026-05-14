import type PocketBase from 'pocketbase'
import { createError } from 'h3'
import { getWorkspaceContext } from '~/server/utils/workspace'

/** Shown when checkout runs but PB has no `subscriptions` collection (synthetic row has empty id). */
export const SUBSCRIPTIONS_COLLECTION_MISSING_MESSAGE =
  'PocketBase has no `subscriptions` collection (billing not migrated). On the VPS, from the repo root: `./infra/run-subscriptions-migrations.sh` (needs Docker stack + `infra/.env` admin credentials). Locally: `cd apps/web && node scripts/add-subscriptions-collections.mjs`. Then retry checkout.'

export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'agency' | 'comped'
export type LimitType = 'sites' | 'keywords' | 'contacts' | 'reports'

type SubscriptionRow = {
  id: string
  user: string
  plan?: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
  status?: string
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  trial_start?: string | null
  trial_end?: string | null
  is_trial?: boolean
  dismissed_trial_banner?: boolean
  updated?: string
}

function isMissingCollectionError(e: unknown): boolean {
  const msg =
    e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
      ? (e as { message: string }).message
      : String(e ?? '')
  // Do not match bare "404" — other failures (network, rules) can mention 404 and must not return a synthetic row.
  return /requested resource wasn't found|collection.*not found|unknown collection|missing collection|failed to resolve collection/i.test(
    msg,
  )
}

function syntheticSubscriptionRow(userId: string, plan: SubscriptionPlan, status: string): SubscriptionRow {
  return {
    id: '',
    user: userId,
    plan,
    status,
    is_trial: false,
    dismissed_trial_banner: false,
  }
}

export type UsageLimitsRow = {
  plan: SubscriptionPlan
  max_sites: number
  max_keywords: number
  max_contacts: number
  max_reports_per_month: number
  white_label: boolean
  branding_required: boolean
}

const FALLBACK_LIMITS: Record<Exclude<SubscriptionPlan, 'comped'>, UsageLimitsRow> = {
  free: {
    plan: 'free',
    max_sites: 1,
    max_keywords: 5,
    max_contacts: 10,
    max_reports_per_month: 1,
    white_label: false,
    branding_required: true,
  },
  starter: {
    plan: 'starter',
    max_sites: 1,
    max_keywords: 25,
    max_contacts: 100,
    max_reports_per_month: 10,
    white_label: true,
    branding_required: false,
  },
  growth: {
    plan: 'growth',
    max_sites: 3,
    max_keywords: 100,
    max_contacts: 500,
    max_reports_per_month: 50,
    white_label: true,
    branding_required: false,
  },
  agency: {
    plan: 'agency',
    max_sites: 10,
    max_keywords: 500,
    max_contacts: 2000,
    max_reports_per_month: 200,
    white_label: true,
    branding_required: false,
  },
}

const ALWAYS_UNLOCKED_EMAILS = new Set(['doughigson@gmail.com'])

function normalizePlan(raw: unknown): SubscriptionPlan {
  const s = String(raw || '').toLowerCase().trim()
  if (s === 'starter' || s === 'growth' || s === 'agency' || s === 'comped') return s
  return 'free'
}

function parseIsoOrNull(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

async function getBillingUserId(pb: PocketBase, userId: string): Promise<string> {
  const ctx = await getWorkspaceContext(pb, userId)
  return ctx.ownerId || userId
}

async function isAlwaysUnlockedUser(pb: PocketBase, billingUserId: string): Promise<boolean> {
  try {
    const owner = await pb.collection('users').getOne<{ email?: string }>(billingUserId)
    const email = String(owner?.email || '').trim().toLowerCase()
    return ALWAYS_UNLOCKED_EMAILS.has(email)
  } catch {
    return false
  }
}

async function enforceAlwaysUnlockedSubscription(
  pb: PocketBase,
  billingUserId: string,
  sub: SubscriptionRow,
): Promise<SubscriptionRow> {
  const unlocked = await isAlwaysUnlockedUser(pb, billingUserId)
  if (!unlocked) return sub

  if (!sub.id) {
    return {
      ...sub,
      user: billingUserId,
      plan: 'comped',
      status: 'comped',
      is_trial: false,
      trial_start: null,
      trial_end: null,
      dismissed_trial_banner: false,
      cancel_at_period_end: false,
    }
  }

  const needsPatch =
    normalizePlan(sub.plan) !== 'comped' ||
    String(sub.status || 'comped') !== 'comped' ||
    sub.is_trial === true ||
    sub.cancel_at_period_end === true

  if (!needsPatch) return sub

  return await pb.collection('subscriptions').update<SubscriptionRow>(sub.id, {
    plan: 'comped',
    status: 'comped',
    is_trial: false,
    trial_start: null,
    trial_end: null,
    dismissed_trial_banner: false,
    cancel_at_period_end: false,
  })
}

export async function ensureUserSubscription(pb: PocketBase, userId: string): Promise<SubscriptionRow> {
  const billingUserId = await getBillingUserId(pb, userId)
  let rows: SubscriptionRow[] = []
  try {
    rows = await pb.collection('subscriptions').getFullList<SubscriptionRow>({
      filter: `user = "${billingUserId.replace(/"/g, '\\"')}"`,
      sort: '-updated',
      batch: 5,
    })
  } catch (e: unknown) {
    if (isMissingCollectionError(e)) {
      const unlocked = await isAlwaysUnlockedUser(pb, billingUserId)
      return syntheticSubscriptionRow(billingUserId, unlocked ? 'comped' : 'free', unlocked ? 'comped' : 'active')
    }
    throw e
  }
  const row = rows[0]
  if (row) {
    const trialChecked = await checkTrialStatus(pb, row)
    return await enforceAlwaysUnlockedSubscription(pb, billingUserId, trialChecked)
  }
  const unlocked = await isAlwaysUnlockedUser(pb, billingUserId)
  if (unlocked) {
    try {
      return await pb.collection('subscriptions').create<SubscriptionRow>({
        user: billingUserId,
        plan: 'comped',
        status: 'comped',
        is_trial: false,
        dismissed_trial_banner: false,
      })
    } catch (e: unknown) {
      if (isMissingCollectionError(e)) {
        return syntheticSubscriptionRow(billingUserId, 'comped', 'comped')
      }
      throw e
    }
  }
  const now = new Date()
  try {
    const created = await pb.collection('subscriptions').create<SubscriptionRow>({
      user: billingUserId,
      plan: 'free',
      status: 'active',
      is_trial: false,
      trial_start: null,
      trial_end: null,
      dismissed_trial_banner: false,
    })
    return created
  } catch (e: unknown) {
    if (isMissingCollectionError(e)) {
      return syntheticSubscriptionRow(billingUserId, 'free', 'active')
    }
    throw e
  }
}

export async function checkTrialStatus(pb: PocketBase, sub: SubscriptionRow): Promise<SubscriptionRow> {
  if (!sub.id) return sub
  const now = new Date()
  const trialEnd = parseIsoOrNull(sub.trial_end)
  const isTrial = sub.is_trial === true
  if (isTrial && trialEnd && now >= trialEnd) {
    const patched = await pb.collection('subscriptions').update<SubscriptionRow>(sub.id, {
      plan: 'free',
      status: 'active',
      is_trial: false,
      dismissed_trial_banner: false,
    })
    return patched
  }

  // Temporary dismissal behavior: reset after 24h.
  if (sub.dismissed_trial_banner === true && sub.updated) {
    const updatedAt = parseIsoOrNull(sub.updated)
    if (updatedAt && now.getTime() - updatedAt.getTime() >= 24 * 60 * 60 * 1000) {
      const patched = await pb.collection('subscriptions').update<SubscriptionRow>(sub.id, {
        dismissed_trial_banner: false,
      })
      return patched
    }
  }

  return sub
}

export async function getUserPlan(pb: PocketBase, userId: string): Promise<SubscriptionPlan> {
  const sub = await ensureUserSubscription(pb, userId)
  return normalizePlan(sub.plan)
}

/** Scheduled / emailed report runs: Growth, Agency, or comped. Free and Starter are manual-only. */
export async function assertAutomatedReportSchedulesAllowed(pb: PocketBase, userId: string): Promise<void> {
  const plan = await getUserPlan(pb, userId)
  if (plan === 'free' || plan === 'starter') {
    throw createError({ statusCode: 403, message: 'Automated reports require a Growth plan or higher.' })
  }
}

/** Workspace billing plan allows custom agency logo / white-label report chrome (Starter+, comped, etc.). */
export async function userCanUseAgencyWhiteLabel(pb: PocketBase, userId: string): Promise<boolean> {
  const plan = await getUserPlan(pb, userId)
  const limits = await getUsageLimits(pb, plan)
  return limits.white_label === true
}

export async function getUsageLimits(pb: PocketBase, plan: SubscriptionPlan): Promise<UsageLimitsRow> {
  if (plan === 'comped') {
    return { ...FALLBACK_LIMITS.agency, plan: 'comped' as SubscriptionPlan }
  }
  const row = await pb.collection('usage_limits').getFirstListItem<UsageLimitsRow>(
    `plan = "${plan}"`,
  ).catch(() => null)
  const merged = row ?? FALLBACK_LIMITS[plan]
  // Paid Starter includes removable WRR branding; older `usage_limits` rows may still have white_label=false.
  if (plan === 'starter' && merged.white_label === false) {
    return { ...merged, white_label: true, branding_required: false }
  }
  return merged
}

export async function getUserUsage(pb: PocketBase, userId: string): Promise<{
  sites: number
  keywords: number
  contacts: number
  reports: number
}> {
  const billingUserId = await getBillingUserId(pb, userId)
  const esc = billingUserId.replace(/"/g, '\\"')
  // PocketBase JS client auto-cancels in-flight requests that share the same default requestKey (method + path).
  // Parallel sites.getList + sites.getFullList would abort each other and yield totalItems 0 / empty list.
  const [sitesPage, contactsPage, ownerSites] = await Promise.all([
    pb
      .collection('sites')
      .getList(1, 1, { filter: `user = "${esc}"`, requestKey: 'subscriptions_usage_sites_total' })
      .catch(() => ({ totalItems: 0 })),
    pb
      .collection('crm_clients')
      .getList(1, 1, { filter: `user = "${esc}"`, requestKey: 'subscriptions_usage_contacts_total' })
      .catch(() => ({ totalItems: 0 })),
    pb
      .collection('sites')
      .getFullList<{ id: string }>({
        filter: `user = "${esc}"`,
        fields: 'id',
        batch: 200,
        requestKey: 'subscriptions_usage_sites_keyword_scope',
      })
      .catch(() => []),
  ])
  const sites = Math.max(Number(sitesPage.totalItems || 0), ownerSites.length)
  const contacts = Number(contactsPage.totalItems || 0)

  let keywords = 0
  for (const s of ownerSites) {
    const p = await pb.collection('rank_keywords').getList(1, 1, {
      filter: `site = "${String(s.id).replace(/"/g, '\\"')}"`,
    }).catch(() => ({ totalItems: 0 }))
    keywords += Number(p.totalItems || 0)
  }

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString()
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0)).toISOString()
  const reports = await pb.collection('subscription_usage_events')
    .getFullList({
      filter: `user = "${esc}" && type = "reports" && created >= "${monthStart}" && created < "${monthEnd}"`,
      fields: 'id',
      batch: 1,
    })
    .then((rows) => rows.length)
    .catch(() => 0)

  return { sites, keywords, contacts, reports }
}

export async function checkLimit(pb: PocketBase, userId: string, type: LimitType, incrementBy = 1): Promise<{
  allowed: boolean
  used: number
  max: number
  plan: SubscriptionPlan
  message?: string
  upgradeCta?: string
}> {
  const billingUserId = await getBillingUserId(pb, userId)
  if (await isAlwaysUnlockedUser(pb, billingUserId)) {
    return {
      allowed: true,
      used: 0,
      max: Number.MAX_SAFE_INTEGER,
      plan: 'comped',
    }
  }

  const plan = await getUserPlan(pb, userId)
  const limits = await getUsageLimits(pb, plan)
  const usage = await getUserUsage(pb, userId)
  const maxByType: Record<LimitType, number> = {
    sites: Number(limits.max_sites || 0),
    keywords: Number(limits.max_keywords || 0),
    contacts: Number(limits.max_contacts || 0),
    reports: Number(limits.max_reports_per_month || 0),
  }
  const usedByType: Record<LimitType, number> = {
    sites: usage.sites,
    keywords: usage.keywords,
    contacts: usage.contacts,
    reports: usage.reports,
  }
  const max = maxByType[type]
  const used = usedByType[type]
  const allowed = used + incrementBy <= max

  const labels: Record<LimitType, string> = {
    sites: 'sites',
    keywords: 'keywords',
    contacts: 'contacts',
    reports: 'reports this month',
  }

  return {
    allowed,
    used,
    max,
    plan,
    message: allowed ? undefined : `You reached the ${labels[type]} limit for the ${plan} plan (${used}/${max}).`,
    upgradeCta:
      allowed
        ? undefined
        : type === 'keywords'
          ? 'Upgrade to track more keywords.'
          : type === 'reports'
            ? 'Unlock more monthly reports by upgrading your plan.'
            : type === 'contacts'
              ? 'Upgrade to store more contacts.'
              : 'Upgrade to add more sites.',
  }
}

export async function incrementUsage(pb: PocketBase, userId: string, type: LimitType, amount = 1): Promise<void> {
  const billingUserId = await getBillingUserId(pb, userId)
  const n = Math.max(1, Math.floor(amount))
  const rows = Array.from({ length: n }, () => ({
    user: billingUserId,
    type,
  }))
  for (const row of rows) {
    await pb.collection('subscription_usage_events').create(row).catch(() => undefined)
  }
}

export async function getSubscriptionStatus(pb: PocketBase, userId: string): Promise<{
  userId: string
  plan: SubscriptionPlan
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_start: string | null
  trial_end: string | null
  is_trial: boolean
  dismissed_trial_banner: boolean
  trial_days_left: number
  trial_expired: boolean
  limits: UsageLimitsRow
  usage: { sites: number; keywords: number; contacts: number; reports: number }
}> {
  const sub = await ensureUserSubscription(pb, userId)
  const plan = normalizePlan(sub.plan)
  const limits = await getUsageLimits(pb, plan)
  const usage = await getUserUsage(pb, userId)
  const now = new Date()
  const trialEndDate = parseIsoOrNull(sub.trial_end)
  const trialStartDate = parseIsoOrNull(sub.trial_start)
  const trialDaysLeft =
    sub.is_trial === true && trialEndDate && now < trialEndDate
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : 0
  const trialExpired = !!trialEndDate && now >= trialEndDate
  return {
    userId: sub.user,
    plan,
    status: String(sub.status || 'active'),
    stripe_customer_id: typeof sub.stripe_customer_id === 'string' ? sub.stripe_customer_id : null,
    stripe_subscription_id: typeof sub.stripe_subscription_id === 'string' ? sub.stripe_subscription_id : null,
    stripe_price_id: typeof sub.stripe_price_id === 'string' ? sub.stripe_price_id : null,
    current_period_end: typeof sub.current_period_end === 'string' ? sub.current_period_end : null,
    cancel_at_period_end: sub.cancel_at_period_end === true,
    trial_start: trialStartDate ? trialStartDate.toISOString() : null,
    trial_end: trialEndDate ? trialEndDate.toISOString() : null,
    is_trial: sub.is_trial === true,
    dismissed_trial_banner: sub.dismissed_trial_banner === true,
    trial_days_left: trialDaysLeft,
    trial_expired: trialExpired,
    limits,
    usage,
  }
}

