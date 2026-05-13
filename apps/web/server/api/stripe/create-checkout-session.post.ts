import { createError, getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { ensureUserSubscription, SUBSCRIPTIONS_COLLECTION_MISSING_MESSAGE } from '~/server/services/subscriptions'
import { getPlanFromStripePriceId, getStripePriceIdForPlan, isLikelyStripePriceId, stripePriceEnvHint, type SubscriptionPlan } from '~/server/services/subscriptionPlans'
import { getStripeClient, getAppUrl } from '~/server/services/stripe'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const body = (await readBody(event).catch(() => ({}))) as { plan?: string; pbClientToken?: string }
  const pbClientToken = typeof body.pbClientToken === 'string' ? body.pbClientToken : ''
  const userId = await getUserIdFromRequest(event, pbClientToken)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const plan = String(body.plan || '').toLowerCase().trim() as SubscriptionPlan
  if (plan !== 'starter' && plan !== 'growth' && plan !== 'agency') {
    throw createError({ statusCode: 400, message: 'plan must be starter, growth, or agency.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const sub = await ensureUserSubscription(pb, userId)
  if (!String(sub.id || '').trim()) {
    throw createError({ statusCode: 503, message: SUBSCRIPTIONS_COLLECTION_MISSING_MESSAGE })
  }
  const ownerUserId = sub.user
  const owner = await pb.collection('users').getOne<{ email?: string }>(ownerUserId)
  const email = String(owner.email || '').trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: 'User email is missing.' })
  if (email === 'doughigson@gmail.com') {
    throw createError({ statusCode: 403, message: 'This account has complimentary full access and does not require billing.' })
  }

  const stripe = await getStripeClient()
  const price = getStripePriceIdForPlan(plan as 'starter' | 'growth' | 'agency')
  if (!price) throw createError({ statusCode: 503, message: `Stripe price is missing for ${plan}.` })
  if (!isLikelyStripePriceId(price)) {
    throw createError({
      statusCode: 400,
      message: stripePriceEnvHint(plan as 'starter' | 'growth' | 'agency', price),
    })
  }

  let customerId = String(sub.stripe_customer_id || '').trim()
  if (!customerId) {
    const c = await stripe.customers.create({
      email,
      metadata: { user_id: ownerUserId },
    })
    customerId = c.id
    await pb.collection('subscriptions').update(sub.id, { stripe_customer_id: customerId })
  }

  const appUrl = getAppUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
    metadata: {
      subscription_scope: 'workspace',
      owner_user_id: ownerUserId,
      plan,
    },
    subscription_data: {
      metadata: {
        subscription_scope: 'workspace',
        owner_user_id: ownerUserId,
        plan,
      },
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
  })

  if (!session.url) throw createError({ statusCode: 502, message: 'Stripe did not return checkout url.' })
  return { url: session.url, inferredPlan: getPlanFromStripePriceId(price) }
})

