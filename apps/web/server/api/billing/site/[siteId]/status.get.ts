import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { isSiteBillingLocked, trialDaysRemaining } from '~/server/utils/siteBilling'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = event.context.params?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'Missing site id' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { site } = await assertSiteAccess(pb, siteId, userId, false, { skipBillingCheck: true })

  const rec = site as unknown as Record<string, unknown>
  const locked = isSiteBillingLocked(rec)
  const days = trialDaysRemaining(rec)

  return {
    locked,
    trialDaysRemaining: days,
    billing_status: typeof rec.billing_status === 'string' ? rec.billing_status : '',
    trial_ends_at: typeof rec.trial_ends_at === 'string' ? rec.trial_ends_at : null,
    stripe_customer_id: typeof rec.stripe_customer_id === 'string' ? rec.stripe_customer_id : null,
    stripe_subscription_id: typeof rec.stripe_subscription_id === 'string' ? rec.stripe_subscription_id : null,
  }
})
