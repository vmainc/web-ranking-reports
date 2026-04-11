import type PocketBase from 'pocketbase'
import { isSiteBillingLocked } from '~/server/utils/siteBilling'

export type WorkspaceRole = 'owner' | 'member' | 'client'

export interface WorkspaceContext {
  role: WorkspaceRole
  /** Agency owner id (value of sites.user for that workspace). */
  ownerId: string
  userId: string
}

function relationId(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && 'id' in v && typeof (v as { id: unknown }).id === 'string') {
    return (v as { id: string }).id
  }
  return ''
}

/**
 * Resolve workspace: primary agency owner has no agency_owner set (or empty).
 * Members/clients have agency_owner pointing at the owner and account_type set.
 */
export async function getWorkspaceContext(pb: PocketBase, userId: string): Promise<WorkspaceContext> {
  let record: Record<string, unknown>
  try {
    record = (await pb.collection('users').getOne(userId)) as unknown as Record<string, unknown>
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid user' })
  }

  const agencyOwnerRaw = record.agency_owner
  const agencyOwnerId = relationId(agencyOwnerRaw)
  const accountType = typeof record.account_type === 'string' ? record.account_type.toLowerCase().trim() : ''

  if (!agencyOwnerId) {
    return { role: 'owner', ownerId: userId, userId }
  }

  if (accountType === 'client') {
    return { role: 'client', ownerId: agencyOwnerId, userId }
  }
  if (accountType === 'member' || accountType === 'agency_member') {
    return { role: 'member', ownerId: agencyOwnerId, userId }
  }

  // agency_owner set but unknown type — treat as member
  return { role: 'member', ownerId: agencyOwnerId, userId }
}

export interface SiteAccessResult {
  site: { id: string; user: string; name: string; domain: string }
  canWrite: boolean
}

export type AssertSiteAccessOptions = {
  /** Skip subscription/trial lock (e.g. workspace site fetch for paywall UI, Stripe checkout). */
  skipBillingCheck?: boolean
}

/**
 * Verify access to a site for workspace owner, agency member, or assigned client (read-only).
 */
export async function assertSiteAccess(
  pb: PocketBase,
  siteId: string,
  userId: string,
  requireWrite: boolean,
  options?: AssertSiteAccessOptions,
): Promise<SiteAccessResult> {
  const site = await pb.collection('sites').getOne(siteId)
  const ownerId = (site as { user?: string }).user
  if (!ownerId) throw createError({ statusCode: 404, message: 'Site not found' })

  const ctx = await getWorkspaceContext(pb, userId)

  const siteRecord = site as unknown as Record<string, unknown>

  if (ctx.role === 'owner') {
    if (ownerId !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
    if (!options?.skipBillingCheck && isSiteBillingLocked(siteRecord)) {
      throw createError({
        statusCode: 403,
        message: 'This site’s trial has ended. Upgrade in Billing to continue.',
        data: { code: 'SITE_BILLING_LOCKED' },
      })
    }
    return { site: site as SiteAccessResult['site'], canWrite: true }
  }

  if (ctx.ownerId !== ownerId) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (ctx.role === 'member') {
    if (!options?.skipBillingCheck && isSiteBillingLocked(siteRecord)) {
      throw createError({
        statusCode: 403,
        message: 'This site’s trial has ended. Upgrade in Billing to continue.',
        data: { code: 'SITE_BILLING_LOCKED' },
      })
    }
    return { site: site as SiteAccessResult['site'], canWrite: true }
  }

  // client
  let rows: { id: string }[] = []
  try {
    rows = await pb.collection('client_site_access').getFullList<{ id: string }>({
      filter: `client = "${userId}" && site = "${siteId}"`,
      batch: 10,
    })
  } catch {
    // collection missing
    throw createError({ statusCode: 503, message: 'client_site_access collection not found. Run add-workspace-schema script.' })
  }
  if (!rows.length) throw createError({ statusCode: 403, message: 'Forbidden' })
  if (requireWrite) {
    throw createError({ statusCode: 403, message: 'Read-only access' })
  }
  if (!options?.skipBillingCheck && isSiteBillingLocked(siteRecord)) {
    throw createError({
      statusCode: 403,
      message: 'This site’s trial has ended. Ask the site owner to upgrade.',
      data: { code: 'SITE_BILLING_LOCKED' },
    })
  }
  return { site: site as SiteAccessResult['site'], canWrite: false }
}
