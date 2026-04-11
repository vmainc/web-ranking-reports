import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { assertVmaBillingAdmin } from '~/server/utils/vmaBillingAdmin'

type SiteRow = {
  id: string
  user: string
  name: string
  domain: string
  created: string
  billing_status?: string
  trial_ends_at?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  expand?: { user?: { id: string; email?: string } }
}

export default defineEventHandler(async (event) => {
  await assertVmaBillingAdmin(event)

  const pb = getAdminPb()
  await adminAuth(pb)

  const sites = await pb.collection('sites').getFullList<SiteRow>({
    sort: '-created',
    batch: 500,
    expand: 'user',
  })

  const rows = sites.map((s) => {
    const ownerEmail = s.expand?.user?.email?.trim() || ''
    const status = (s.billing_status || '').trim() || '—'
    return {
      id: s.id,
      siteName: s.name,
      ownerEmail,
      domain: s.domain,
      siteStatus: status,
      trialEnds: s.trial_ends_at || null,
      stripeCustomerId: s.stripe_customer_id || null,
      stripeSubscriptionId: s.stripe_subscription_id || null,
      billingStatus: status,
      created: s.created,
    }
  })

  const trialSites = rows.filter((r) => r.billingStatus === 'trial').length
  const activeSubs = rows.filter((r) => r.billingStatus === 'active').length
  const pastDue = rows.filter((r) => r.billingStatus === 'past_due').length
  const canceled = rows.filter((r) => r.billingStatus === 'canceled').length
  const mrrUsd = activeSubs * 19.99

  return {
    overview: {
      trialSites,
      activeSubscriptions: activeSubs,
      pastDue,
      canceled,
      mrrEstimateUsd: Math.round(mrrUsd * 100) / 100,
    },
    sites: rows,
  }
})
