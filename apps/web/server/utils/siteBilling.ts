/**
 * Per-site billing: 14-day app-managed trial, then Stripe subscription required.
 * Legacy sites with no billing fields are treated as grandfathered (full access).
 */

export type SiteBillingFields = Record<string, unknown>

export function parseSiteBilling(site: SiteBillingFields) {
  return {
    trial_ends_at: typeof site.trial_ends_at === 'string' && site.trial_ends_at ? site.trial_ends_at : null,
    stripe_customer_id: typeof site.stripe_customer_id === 'string' ? site.stripe_customer_id.trim() : '',
    stripe_subscription_id: typeof site.stripe_subscription_id === 'string' ? site.stripe_subscription_id.trim() : '',
    billing_status: typeof site.billing_status === 'string' ? site.billing_status.toLowerCase().trim() : '',
  }
}

/** No billing columns set — existing sites before this feature shipped. */
export function isSiteGrandfatheredNoBilling(site: SiteBillingFields): boolean {
  const b = parseSiteBilling(site)
  return !b.billing_status && !b.trial_ends_at && !b.stripe_customer_id && !b.stripe_subscription_id
}

/**
 * True when the site should not be used for product features (integrations, reports, etc.).
 * Checkout / billing pages bypass this via assertSiteAccess(..., { skipBillingCheck: true }).
 */
export function isSiteBillingLocked(site: SiteBillingFields): boolean {
  if (isSiteGrandfatheredNoBilling(site)) return false

  const b = parseSiteBilling(site)
  const now = Date.now()
  const trialEndMs = b.trial_ends_at ? new Date(b.trial_ends_at).getTime() : NaN
  const trialNotExpired = Number.isFinite(trialEndMs) && trialEndMs > now
  const hasSub = !!b.stripe_subscription_id

  if (b.billing_status === 'active' || b.billing_status === 'past_due') return false
  if (trialNotExpired) return false

  if (hasSub) return false

  if (b.billing_status === 'locked' || b.billing_status === 'canceled' || b.billing_status === 'unpaid') {
    return true
  }

  if (b.billing_status === 'trial' || b.billing_status === '') {
    return true
  }

  return true
}

export function trialDaysRemaining(site: SiteBillingFields): number | null {
  if (isSiteGrandfatheredNoBilling(site)) return null
  const b = parseSiteBilling(site)
  if (b.billing_status !== 'trial' || !b.trial_ends_at) return null
  const end = new Date(b.trial_ends_at).getTime()
  if (!Number.isFinite(end)) return null
  const ms = end - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}
