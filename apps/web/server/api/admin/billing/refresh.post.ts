import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { assertVmaBillingAdmin } from '~/server/utils/vmaBillingAdmin'
import { getStripe, subscriptionStatusToBillingStatus } from '~/server/utils/stripeServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  await assertVmaBillingAdmin(event)

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : ''
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId is required' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const site = await pb.collection('sites').getOne<{
    stripe_subscription_id?: string | null
    stripe_customer_id?: string | null
  }>(siteId)

  const subId = typeof site.stripe_subscription_id === 'string' ? site.stripe_subscription_id.trim() : ''
  if (!subId) {
    throw createError({ statusCode: 400, message: 'No Stripe subscription id on this site' })
  }

  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subId)
  const billing_status = subscriptionStatusToBillingStatus(sub.status)
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id

  await pb.collection('sites').update(siteId, {
    billing_status,
    stripe_subscription_id: sub.id,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
  })

  return { ok: true, billing_status, stripe_status: sub.status }
})
