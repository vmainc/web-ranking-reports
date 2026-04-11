/**
 * Stripe → PocketBase sync. Configure endpoint in Stripe Dashboard with the same path.
 * Requires raw body (see nuxt.config routeRules bodyParser: false).
 */
import { readRawBody, getHeader, getMethod } from 'h3'
import type PocketBase from 'pocketbase'
import type Stripe from 'stripe'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getStripe, getStripeWebhookSecret, subscriptionStatusToBillingStatus } from '~/server/utils/stripeServer'

async function updateSiteBySubscriptionId(
  pb: PocketBase,
  subscriptionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    const row = await pb.collection('sites').getFirstListItem(`stripe_subscription_id="${subscriptionId}"`)
    await pb.collection('sites').update(row.id, patch)
  } catch {
    // No matching site (metadata path may handle create flow).
  }
}

async function updateSiteById(pb: PocketBase, siteId: string, patch: Record<string, unknown>): Promise<void> {
  try {
    await pb.collection('sites').update(siteId, patch)
  } catch (e) {
    console.error('[stripe webhook] site update failed', siteId, e)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const siteId = session.metadata?.site_id?.trim()
  if (!siteId) return

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const subRef = session.subscription
  const subId = typeof subRef === 'string' ? subRef : subRef?.id
  if (!customerId || !subId) return

  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subId)

  const pb = getAdminPb()
  await adminAuth(pb)

  await updateSiteById(pb, siteId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    billing_status: 'active',
  })
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const pb = getAdminPb()
  await adminAuth(pb)

  const metaSite = sub.metadata?.site_id?.trim()
  const billing_status = subscriptionStatusToBillingStatus(sub.status)
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id

  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    billing_status,
  }
  if (customerId) patch.stripe_customer_id = customerId

  if (metaSite) {
    await updateSiteById(pb, metaSite, patch)
    return
  }

  await updateSiteBySubscriptionId(pb, sub.id, patch)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const pb = getAdminPb()
  await adminAuth(pb)

  const metaSite = sub.metadata?.site_id?.trim()
  if (metaSite) {
    await updateSiteById(pb, metaSite, {
      billing_status: 'canceled',
    })
    return
  }
  await updateSiteBySubscriptionId(pb, sub.id, {
    billing_status: 'canceled',
  })
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Empty body' })
  }

  const sig = getHeader(event, 'stripe-signature')
  if (!sig) {
    throw createError({ statusCode: 400, message: 'Missing stripe-signature' })
  }

  const stripe = getStripe()
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, getStripeWebhookSecret())
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe webhook] signature verify failed', msg)
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await handleCheckoutCompleted(session)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('[stripe webhook] handler error', stripeEvent.type, e)
    throw createError({ statusCode: 500, message: 'Webhook handler failed' })
  }

  return { received: true }
})
