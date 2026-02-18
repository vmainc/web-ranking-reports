import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getAdsAccessToken, getDeveloperToken } from '~/server/utils/adsAccess'

/** Customer with optional managerId when account is a linked child under an MCC */
export type AdsCustomerItem = { resourceName: string; customerId: string; name: string; managerId?: string }

/**
 * List accessible Google Ads accounts. listAccessibleCustomers returns only directly
 * accessible IDs (often just the MCC). We also fetch linked child accounts under each
 * manager via customer_client so the dropdown includes accounts like 6729886518.
 */
export default defineEventHandler(async (event): Promise<{ customers: AdsCustomerItem[] }> => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const devToken = await getDeveloperToken(pb)
  if (!devToken) {
    throw createError({
      statusCode: 503,
      message: 'Google Ads developer token not configured. An admin must set it in Admin → Integrations.',
    })
  }

  const { accessToken } = await getAdsAccessToken(pb, siteId)

  const listRes = await $fetch<{ resourceNames?: string[] }>(
    'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
      },
    }
  ).catch((e: unknown) => {
    const msg = e && typeof e === 'object' && 'data' in e && (e as { data?: { message?: string } }).data?.message
      ? (e as { data: { message: string } }).data.message
      : e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, message: msg || 'Google Ads API error' })
  })

  const accessibleIds = (listRes?.resourceNames ?? []).map((rn: string) => rn.replace(/^customers\//, ''))
  const seen = new Set<string>()
  const customers: AdsCustomerItem[] = []

  async function getCustomerDescriptiveName(customerId: string): Promise<string | null> {
    try {
      const searchUrl = `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`
      const res = await $fetch<{ results?: Array<{ customer?: { descriptiveName?: string }; customer_descriptive_name?: string } }>>(
        searchUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': devToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'SELECT customer.id, customer.descriptive_name FROM customer',
          }),
        }
      )
      const row = res?.results?.[0]
      const name = (row?.customer as { descriptiveName?: string })?.descriptiveName?.trim()
        || (row as { customer_descriptive_name?: string })?.customer_descriptive_name?.trim()
      return name || null
    } catch {
      return null
    }
  }

  // Add each directly accessible account; for managers, also fetch linked children via customer_client
  for (const customerId of accessibleIds) {
    if (seen.has(customerId)) continue
    seen.add(customerId)
    const directName = await getCustomerDescriptiveName(customerId)
    customers.push({
      resourceName: `customers/${customerId}`,
      customerId,
      name: directName || customerId,
    })

    // Fetch linked clients under this customer (if it's a manager we get itself + children)
    try {
      const searchUrl = `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`
      const searchRes = await $fetch<{ results?: Array<{ customerClient?: { id?: string; descriptiveName?: string; manager?: boolean } }> }>(
        searchUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': devToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager FROM customer_client WHERE customer_client.status = 'ENABLED'`,
          }),
        }
      ).catch(() => null)

    const results = searchRes?.results ?? []
    for (const row of results) {
      const client = (row as { customerClient?: { id?: string | number; descriptiveName?: string }; customer_client?: { id?: string | number; descriptive_name?: string } }).customerClient
        ?? (row as { customer_client?: { id?: string | number; descriptive_name?: string } }).customer_client
      const id = client?.id != null ? String(client.id) : ''
      if (!id || seen.has(id)) continue
      seen.add(id)
      const name = (client as { descriptiveName?: string }).descriptiveName?.trim()
        || (client as { descriptive_name?: string }).descriptive_name?.trim()
        || id
      customers.push({
        resourceName: `customers/${id}`,
        customerId: id,
        name,
        managerId: customerId,
      })
    }
    } catch {
      // Not a manager or no permission; keep only the direct accessible entry we added
    }
  }

  return { customers }
})
