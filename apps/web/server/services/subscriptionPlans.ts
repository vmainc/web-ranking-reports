import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { checkLimit } from '~/server/services/subscriptions'

export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'agency'

export type PlanLimits = {
  maxSites: number
  maxKeywords: number
  maxContacts: number
  maxReportsPerMonth: number
  brandedReportsRequired: boolean
  whiteLabel: boolean
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxSites: 1,
    maxKeywords: 5,
    maxContacts: 10,
    maxReportsPerMonth: 1,
    brandedReportsRequired: true,
    whiteLabel: false,
  },
  starter: {
    maxSites: 1,
    maxKeywords: 25,
    maxContacts: 100,
    maxReportsPerMonth: 10,
    brandedReportsRequired: false,
    whiteLabel: false,
  },
  growth: {
    maxSites: 3,
    maxKeywords: 100,
    maxContacts: 500,
    maxReportsPerMonth: 50,
    brandedReportsRequired: false,
    whiteLabel: true,
  },
  agency: {
    maxSites: 10,
    maxKeywords: 500,
    maxContacts: 2000,
    maxReportsPerMonth: 200,
    brandedReportsRequired: false,
    whiteLabel: true,
  },
}

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function getStripePriceIdForPlan(plan: Exclude<SubscriptionPlan, 'free'>): string {
  if (plan === 'starter') return (process.env.STRIPE_PRICE_STARTER || useRuntimeConfig().stripePriceStarter || '').trim()
  if (plan === 'growth') return (process.env.STRIPE_PRICE_GROWTH || useRuntimeConfig().stripePriceGrowth || '').trim()
  return (process.env.STRIPE_PRICE_AGENCY || useRuntimeConfig().stripePriceAgency || '').trim()
}

/** Stripe Checkout `line_items[].price` must be a Price object id (`price_...`), not a Product id (`prod_...`) or a dollar amount. */
export function isLikelyStripePriceId(raw: string): boolean {
  return /^price_[a-zA-Z0-9_]+$/.test(String(raw || '').trim())
}

/** User-friendly hint when env looks like a Product id or amount instead of a Price id. */
export function stripePriceEnvHint(plan: 'starter' | 'growth' | 'agency', raw: string): string {
  const envName =
    plan === 'starter' ? 'STRIPE_PRICE_STARTER' : plan === 'growth' ? 'STRIPE_PRICE_GROWTH' : 'STRIPE_PRICE_AGENCY'
  const s = String(raw || '').trim()
  if (!s) {
    return `${envName} is empty. Set it to a Price id (starts with price_) from Stripe → Test mode → Product catalog → product → Pricing.`
  }
  if (/^prod_/i.test(s)) {
    return `${envName} is set to a Product id (${s.slice(0, 12)}…). Use the Price id under that product’s Pricing section (starts with price_), not prod_.`
  }
  if (/^plan_/i.test(s)) {
    return `${envName} looks like a Plan id. Checkout needs a Price id (price_…) from the product’s recurring price.`
  }
  if (/[$€£]|\d+\.\d{2}$/.test(s) || /^\d+(\.\d+)?$/.test(s)) {
    return `${envName} must be a Stripe Price id (price_…), not a dollar amount.`
  }
  return `${envName} must look like price_xxxxxxxx (Stripe → Product → Pricing → copy Price API id).`
}

export function getPlanFromStripePriceId(priceId: string): SubscriptionPlan {
  const starter = getStripePriceIdForPlan('starter')
  const growth = getStripePriceIdForPlan('growth')
  const agency = getStripePriceIdForPlan('agency')
  if (priceId && priceId === starter) return 'starter'
  if (priceId && priceId === growth) return 'growth'
  if (priceId && priceId === agency) return 'agency'
  return 'free'
}

async function canByType(userId: string, type: 'sites' | 'keywords' | 'contacts' | 'reports') {
  const pb = getAdminPb()
  await adminAuth(pb)
  return await checkLimit(pb, userId, type, 1)
}

export async function userCanAddSite(userId: string) {
  return await canByType(userId, 'sites')
}
export async function userCanAddKeyword(userId: string) {
  return await canByType(userId, 'keywords')
}
export async function userCanAddContact(userId: string) {
  return await canByType(userId, 'contacts')
}
export async function userCanGenerateReport(userId: string) {
  return await canByType(userId, 'reports')
}

