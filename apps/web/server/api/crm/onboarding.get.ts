import type { IntegrationProvider, IntegrationStatus, OnboardingRow } from '~/types'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event): Promise<{ rows: OnboardingRow[] }> => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)

  const clients = await pb.collection('crm_clients').getFullList<{
    id: string
    name: string
    company?: string | null
    email?: string | null
    site?: string | null
    expand?: { site?: { id: string; name: string; domain: string } }
  }>({
    filter: `user = "${userId}"`,
    sort: '-created',
    expand: 'site',
  })

  const siteIds = [...new Set(clients.map((c) => c.site).filter(Boolean) as string[])]
  const integrationsBySite = new Map<string, Array<{ provider: IntegrationProvider; status: IntegrationStatus }>>()
  for (const siteId of siteIds) {
    const list = await pb.collection('integrations').getFullList<{ provider: string; status: string }>({
      filter: `site = "${siteId}"`,
      sort: 'provider',
    })
    integrationsBySite.set(
      siteId,
      list.map((i) => ({ provider: i.provider as IntegrationProvider, status: i.status as IntegrationStatus }))
    )
  }

  const rows: OnboardingRow[] = clients.map((c) => {
    const siteId = c.site ?? null
    const integrations = siteId ? integrationsBySite.get(siteId) ?? [] : []
    return {
      client: c,
      siteId,
      integrations,
    }
  })

  return { rows }
})
