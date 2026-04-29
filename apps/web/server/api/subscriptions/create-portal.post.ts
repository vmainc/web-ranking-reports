import { getMethod } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getStripe } from '~/server/utils/stripeServer'
import { ensureUserSubscription } from '~/server/services/subscriptions'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const sub = await ensureUserSubscription(pb, userId)
  const customerId = typeof sub.stripe_customer_id === 'string' ? sub.stripe_customer_id.trim() : ''
  if (!customerId) throw createError({ statusCode: 400, message: 'No Stripe customer found yet.' })

  const stripe = getStripe()
  const appUrl = (useRuntimeConfig().public.appUrl as string || 'http://localhost:3000').replace(/\/+$/, '')
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/billing`,
  })
  return { url: portal.url }
})

