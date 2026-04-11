import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getStripe, getStripePriceId } from '~/server/utils/stripeServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : ''
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId is required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId, { skipBillingCheck: true })

  const site = await pb.collection('sites').getOne<{
    user: string
    stripe_customer_id?: string | null
  }>(siteId)
  const ownerId = typeof site.user === 'string' ? site.user : ''
  if (!ownerId) throw createError({ statusCode: 400, message: 'Invalid site' })

  const owner = await pb.collection('users').getOne<{ email?: string }>(ownerId)
  const email = (owner.email || '').trim()
  if (!email) throw createError({ statusCode: 400, message: 'Site owner has no email' })

  const stripe = getStripe()
  const priceId = getStripePriceId()
  const appUrl = (useRuntimeConfig().public.appUrl as string || 'http://localhost:3000').replace(/\/+$/, '')

  let customerId = typeof site.stripe_customer_id === 'string' ? site.stripe_customer_id.trim() : ''
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { site_id: siteId },
    })
    customerId = customer.id
    await pb.collection('sites').update(siteId, { stripe_customer_id: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings/billing`,
    client_reference_id: siteId,
    metadata: { site_id: siteId, user_id: userId },
    subscription_data: {
      metadata: { site_id: siteId },
    },
    allow_promotion_codes: true,
  })

  if (!session.url) {
    throw createError({ statusCode: 502, message: 'Stripe did not return a checkout URL' })
  }

  return { url: session.url }
})
