import { getAdminPb, adminAuth, getUserIdFromRequest, getUserEmailForUserId } from '~/server/utils/pbServer'
import { getSubscriptionStatus, getUserUsage } from '~/server/services/subscriptions'

const COMPED_EMAIL = 'doughigson@gmail.com'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  try {
    return await getSubscriptionStatus(pb, userId)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
        ? (e as { message: string }).message
        : String(e ?? '')
    if (/requested resource wasn't found|collection.*not found|404/i.test(msg)) {
      const email = (await getUserEmailForUserId(event, userId).catch(() => '')).toLowerCase().trim()
      const isComped = email === COMPED_EMAIL
      const usage = await getUserUsage(pb, userId).catch(() => ({ sites: 0, keywords: 0, contacts: 0, reports: 0 }))
      // Fallback for partially-migrated environments: keep UI functional with free-plan defaults.
      return {
        userId,
        plan: isComped ? ('comped' as const) : ('free' as const),
        status: isComped ? 'comped' : 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        current_period_end: null,
        cancel_at_period_end: false,
        trial_start: null,
        trial_end: null,
        is_trial: false,
        dismissed_trial_banner: false,
        trial_days_left: 0,
        trial_expired: false,
        limits: isComped
          ? {
              plan: 'comped' as const,
              max_sites: 10,
              max_keywords: 500,
              max_contacts: 2000,
              max_reports_per_month: 200,
              white_label: true,
              branding_required: false,
            }
          : {
              plan: 'free' as const,
              max_sites: 1,
              max_keywords: 5,
              max_contacts: 10,
              max_reports_per_month: 1,
              white_label: false,
              branding_required: true,
            },
        usage,
      }
    }
    throw e
  }
})

