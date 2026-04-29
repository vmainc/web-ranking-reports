import Stripe from 'stripe'
import { adminAuth, getAdminPb } from '~/server/utils/pbServer'

let stripeSingleton: Stripe | null = null
let stripeSingletonKey = ''

type StripeMode = 'test' | 'live'

export function getStripeMode(): StripeMode {
  const cfg = useRuntimeConfig()
  const raw = String(process.env.STRIPE_MODE || cfg.stripeMode || '').toLowerCase().trim()
  if (raw === 'test') return 'test'
  if (raw === 'live') return 'live'
  return process.env.NODE_ENV === 'production' ? 'live' : 'test'
}

async function getStripeKeysFromSettings(): Promise<{
  test_secret_key: string
  live_secret_key: string
}> {
  try {
    const pb = getAdminPb()
    await adminAuth(pb)
    const row = await pb.collection('app_settings').getFirstListItem<{
      value?: { test_secret_key?: string; live_secret_key?: string }
    }>('key="stripe_keys"')
    return {
      test_secret_key: String(row?.value?.test_secret_key || '').trim(),
      live_secret_key: String(row?.value?.live_secret_key || '').trim(),
    }
  } catch {
    return { test_secret_key: '', live_secret_key: '' }
  }
}

async function resolveStripeSecretKey(): Promise<string> {
  const cfg = useRuntimeConfig()
  const envOrConfig = String(process.env.STRIPE_SECRET_KEY || cfg.stripeSecretKey || '').trim()
  if (envOrConfig) return envOrConfig

  const mode = getStripeMode()
  const app = await getStripeKeysFromSettings()
  const appKey = mode === 'test' ? app.test_secret_key : app.live_secret_key
  if (appKey) return appKey

  throw createError({
    statusCode: 503,
    message: `Stripe is not configured (${mode} mode missing secret key in env or Admin > Integrations).`,
  })
}

export async function getStripeClient(): Promise<Stripe> {
  const key = await resolveStripeSecretKey()
  if (stripeSingleton && stripeSingletonKey === key) return stripeSingleton
  stripeSingleton = new Stripe(key)
  stripeSingletonKey = key
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

