import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getStripe } from '~/server/utils/stripeServer'

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

  const site = await pb.collection('sites').getOne<{ stripe_customer_id?: string | null }>(siteId)
  const customerId = typeof site.stripe_customer_id === 'string' ? site.stripe_customer_id.trim() : ''
  if (!customerId) {
    throw createError({ statusCode: 400, message: 'No Stripe customer for this site yet. Start checkout first.' })
  }

  const stripe = getStripe()
  const appUrl = (useRuntimeConfig().public.appUrl as string || 'http://localhost:3000').replace(/\/+$/, '')

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings/billing`,
  })

  if (!session.url) {
    throw createError({ statusCode: 502, message: 'Stripe did not return a portal URL' })
  }

  return { url: session.url }
})
