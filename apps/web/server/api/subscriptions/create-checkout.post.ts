import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getStripe, getStripePriceIdForPlan } from '~/server/utils/stripeServer'
import { ensureUserSubscription, type SubscriptionPlan } from '~/server/services/subscriptions'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { plan?: string }
  const plan = String(body.plan || '').toLowerCase().trim() as SubscriptionPlan
  if (!['starter', 'growth', 'agency'].includes(plan)) {
    throw createError({ statusCode: 400, message: 'Choose a paid plan (starter, growth, agency).' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const sub = await ensureUserSubscription(pb, userId)
  const user = await pb.collection('users').getOne<{ email?: string }>(sub.user)
  const email = String(user.email || '').trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: 'Account email is missing.' })

  const stripe = getStripe()
  const appUrl = (useRuntimeConfig().public.appUrl as string || 'http://localhost:3000').replace(/\/+$/, '')
  const priceId = getStripePriceIdForPlan(plan)

  let customerId = typeof sub.stripe_customer_id === 'string' ? sub.stripe_customer_id.trim() : ''
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { owner_user_id: sub.user },
    })
    customerId = customer.id
    await pb.collection('subscriptions').update(sub.id, { stripe_customer_id: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/billing`,
    allow_promotion_codes: true,
    metadata: {
      subscription_scope: 'workspace',
      owner_user_id: sub.user,
      requested_plan: plan,
    },
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        subscription_scope: 'workspace',
        owner_user_id: sub.user,
        requested_plan: plan,
      },
    },
  })

  if (!session.url) throw createError({ statusCode: 502, message: 'Stripe did not return a checkout URL.' })
  return { url: session.url }
})

