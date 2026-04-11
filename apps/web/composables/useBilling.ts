/**
 * Client helpers for Stripe Checkout / Billing Portal (server creates sessions; secrets stay server-side).
 */
export function useBilling() {
  const pb = usePocketbase()

  function authHeaders(): Record<string, string> {
    const token = pb.authStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function startCheckout(siteId: string): Promise<void> {
    const id = siteId.trim()
    if (!id) throw new Error('Choose a site')
    const { url } = await $fetch<{ url: string }>('/api/stripe/create-checkout', {
      method: 'POST',
      headers: authHeaders(),
      body: { siteId: id },
    })
    if (typeof window !== 'undefined' && url) {
      window.location.href = url
    }
  }

  async function openBillingPortal(siteId: string): Promise<void> {
    const id = siteId.trim()
    if (!id) throw new Error('Choose a site')
    const { url } = await $fetch<{ url: string }>('/api/stripe/create-portal', {
      method: 'POST',
      headers: authHeaders(),
      body: { siteId: id },
    })
    if (typeof window !== 'undefined' && url) {
      window.location.href = url
    }
  }

  async function fetchSiteBillingStatus(siteId: string) {
    const id = siteId.trim()
    if (!id) return null
    return await $fetch<{
      locked: boolean
      trialDaysRemaining: number | null
      billing_status: string
      trial_ends_at: string | null
      stripe_customer_id: string | null
      stripe_subscription_id: string | null
    }>(`/api/billing/site/${id}/status`, { headers: authHeaders() })
  }

  return { startCheckout, openBillingPortal, fetchSiteBillingStatus }
}
