import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

export function getStripeClient(): Stripe {
  if (stripeSingleton) return stripeSingleton
  const key = process.env.STRIPE_SECRET_KEY || useRuntimeConfig().stripeSecretKey
  if (!key || typeof key !== 'string') {
    throw createError({ statusCode: 503, message: 'Stripe is not configured (STRIPE_SECRET_KEY).' })
  }
  stripeSingleton = new Stripe(key)
  return stripeSingleton
}

export function getStripeWebhookSigningSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || useRuntimeConfig().stripeWebhookSecret
  if (!secret || typeof secret !== 'string') {
    throw createError({ statusCode: 503, message: 'STRIPE_WEBHOOK_SECRET is not set.' })
  }
  return secret.trim()
}

export function getAppUrl(): string {
  return String(useRuntimeConfig().public.appUrl || process.env.NUXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

