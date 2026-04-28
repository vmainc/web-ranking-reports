import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const GOOGLE_ANCHOR = 'google_analytics'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    customer_id?: string
    customer_name?: string
    login_customer_id?: string
  }
  const siteId = body?.siteId
  const customerId = typeof body?.customer_id === 'string' ? body.customer_id.replace(/^customers\//, '').trim() : ''
  const customerName = typeof body?.customer_name === 'string' ? body.customer_name.trim() : ''
  const loginCustomerId = typeof body?.login_customer_id === 'string' ? body.login_customer_id.replace(/^customers\//, '').trim() : ''

  if (!siteId || !customerId) {
    throw createError({ statusCode: 400, message: 'siteId and customer_id required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const list = await pb.collection('integrations').getFullList<{ id: string; config_json?: Record<string, unknown> }>({
    filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
  })
  const anchor = list[0]
  if (!anchor) throw createError({ statusCode: 400, message: 'Google not connected for this site.' })

  const config: Record<string, unknown> = {
    ...anchor.config_json,
    lsa_customer_id: customerId,
    lsa_customer_name: customerName || customerId,
  }
  if (loginCustomerId) config.lsa_login_customer_id = loginCustomerId
  else delete config.lsa_login_customer_id

  await pb.collection('integrations').update(anchor.id, { config_json: config })

  // Keep LSA integration row in "connected" once account is selected.
  const lsaRows = await pb.collection('integrations').getFullList<{ id: string; status?: string }>({
    filter: `site = "${siteId}" && provider = "google_local_services_ads"`,
  })
  const lsa = lsaRows[0]
  if (lsa && lsa.status !== 'connected') {
    await pb.collection('integrations').update(lsa.id, { status: 'connected' })
  }

  return { ok: true }
})

