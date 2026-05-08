import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getSubscriptionStatus } from '~/server/services/subscriptions'

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
      // Fallback for partially-migrated environments: keep UI functional with free-plan defaults.
      return {
        userId,
        plan: 'free' as const,
        status: 'active',
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
        limits: {
          plan: 'free' as const,
          max_sites: 1,
          max_keywords: 5,
          max_contacts: 10,
          max_reports_per_month: 1,
          white_label: false,
          branding_required: true,
        },
        usage: { sites: 0, keywords: 0, contacts: 0, reports: 0 },
      }
    }
    throw e
  }
})

