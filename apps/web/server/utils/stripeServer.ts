import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton
  const secret = process.env.STRIPE_SECRET_KEY || useRuntimeConfig().stripeSecretKey
  if (!secret || typeof secret !== 'string') {
    throw createError({ statusCode: 503, message: 'Stripe is not configured (STRIPE_SECRET_KEY).' })
  }
  stripeSingleton = new Stripe(secret)
  return stripeSingleton
}

export function getStripePriceId(): string {
  const id = process.env.STRIPE_PRICE_ID || useRuntimeConfig().stripePriceId
  if (!id || typeof id !== 'string') {
    throw createError({ statusCode: 503, message: 'STRIPE_PRICE_ID is not set.' })
  }
  return id.trim()
}

export function getStripeWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET || useRuntimeConfig().stripeWebhookSecret
  if (!s || typeof s !== 'string') {
    throw createError({ statusCode: 503, message: 'STRIPE_WEBHOOK_SECRET is not set.' })
  }
  return s.trim()
}

/** Map Stripe subscription.status into our PocketBase billing_status. */
export function subscriptionStatusToBillingStatus(
  status: Stripe.Subscription.Status,
): 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trial' {
  switch (status) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'unpaid':
      return 'unpaid'
    case 'trialing':
      return 'trial'
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'unpaid'
    default:
      return 'active'
  }
}
