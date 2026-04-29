import { getMethod } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { ensureUserSubscription } from '~/server/services/subscriptions'
import { getAppUrl, getStripeClient } from '~/server/services/stripe'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const sub = await ensureUserSubscription(pb, userId)
  const customerId = String(sub.stripe_customer_id || '').trim()
  if (!customerId) throw createError({ statusCode: 400, message: 'No Stripe customer found for this account.' })

  const stripe = await getStripeClient()
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/dashboard/billing`,
  })
  return { url: portal.url }
})

