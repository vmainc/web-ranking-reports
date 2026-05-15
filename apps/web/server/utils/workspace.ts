import type PocketBase from 'pocketbase'
import { isSiteBillingLocked } from '~/server/utils/siteBilling'

/** One row per team member; server resolves CRM owner when `users.agency_owner` is missing from API. */
export const WORKSPACE_MEMBER_LINKS = 'workspace_member_links'

export type WorkspaceRole = 'owner' | 'member' | 'client'

export interface WorkspaceContext {
  role: WorkspaceRole
  /** Agency owner id (value of sites.user for that workspace). */
  ownerId: string
  userId: string
}

/**
 * Normalize PocketBase relation fields: plain id string, expanded `{ id }`, numeric id, or single-element array.
 */
export function extractPocketBaseRelationId(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'string') {
    const s = raw.trim()
    return s
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const id = extractPocketBaseRelationId(item)
      if (id) return id
    }
    return ''
  }
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    const id = (raw as { id: unknown }).id
    if (typeof id === 'string' && id.trim()) return id.trim()
    if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  }
  return ''
}

/** PocketBase select may return a string or a single-element array depending on version/config. */
export function parseAccountType(raw: unknown): string {
  if (typeof raw === 'string') return raw.toLowerCase().trim()
  if (Array.isArray(raw)) {
    const first = raw.find((x): x is string => typeof x === 'string' && x.trim() !== '')
    return first ? first.toLowerCase().trim() : ''
  }
  return ''
}

/** True when a CRM row’s `user` relation matches the resolved workspace CRM owner id. */
export function crmRowOwnedByUser(record: { user?: unknown }, crmOwnerId: string): boolean {
  return extractPocketBaseRelationId(record.user) === crmOwnerId
}

/**
 * Resolve workspace: primary agency owner has no agency_owner set (or empty).
 * Members/clients have agency_owner pointing at the owner and account_type set.
 */
function resolveAgencyOwnerIdFromUserRecord(record: Record<string, unknown>): string {
  const direct = extractPocketBaseRelationId(record.agency_owner)
  if (direct) return direct
  const expand = record.expand
  if (expand && typeof expand === 'object' && expand !== null && 'agency_owner' in expand) {
    return extractPocketBaseRelationId((expand as { agency_owner?: unknown }).agency_owner)
  }
  return ''
}

/** Prefer relation `agency_owner`; fall back to text `workspace_owner_id` (set on invite). */
function resolveWorkspaceOwnerIdFromUserRecord(record: Record<string, unknown>): string {
  const fromRelation = resolveAgencyOwnerIdFromUserRecord(record)
  if (fromRelation) return fromRelation
  const text = typeof record.workspace_owner_id === 'string' ? record.workspace_owner_id.trim() : ''
  return text
}

export function escPbFilterId(id: string): string {
  return id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Agency owner id stored in `workspace_member_links` for this member, if any. */
export async function resolveTeamOwnerFromLinkTable(pb: PocketBase, memberUserId: string): Promise<string> {
  const esc = escPbFilterId(memberUserId)
  try {
    const row = await pb.collection(WORKSPACE_MEMBER_LINKS).getFirstListItem<{ owner?: unknown }>(
      `member = "${esc}"`,
    )
    return extractPocketBaseRelationId(row.owner)
  } catch {
    return ''
  }
}

/** Upsert `workspace_member_links` so members resolve CRM owner even when `users.agency_owner` is absent from API. */
export async function ensureWorkspaceMemberLink(
  pb: PocketBase,
  ownerUserId: string,
  memberUserId: string,
): Promise<void> {
  if (!ownerUserId || !memberUserId || ownerUserId === memberUserId) return
  const esc = escPbFilterId(memberUserId)
  try {
    const existing = await pb.collection(WORKSPACE_MEMBER_LINKS).getFullList<{ id: string; owner?: unknown }>({
      filter: `member = "${esc}"`,
      batch: 1,
    })
    if (existing.length) {
      const cur = extractPocketBaseRelationId(existing[0].owner)
      if (cur && cur !== ownerUserId) {
        await pb.collection(WORKSPACE_MEMBER_LINKS).update(existing[0].id, { owner: ownerUserId })
      }
      return
    }
    await pb.collection(WORKSPACE_MEMBER_LINKS).create({ owner: ownerUserId, member: memberUserId })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
      console.warn('[workspace_member_links] ensureWorkspaceMemberLink failed:', msg)
    }
  }
}

/** Ensures `workspace_member_links` rows exist for every team user under this owner (DB filter, not user JSON). */
export async function syncWorkspaceMemberLinksForOwner(pb: PocketBase, ownerUserId: string): Promise<void> {
  const uid = escPbFilterId(ownerUserId)
  const memberFilter = `(agency_owner = "${uid}" || workspace_owner_id = "${uid}") && id != "${uid}"`
  let m: { id?: string; account_type?: unknown }[] = []
  try {
    m = await pb.collection('users').getFullList({ filter: memberFilter, batch: 200 })
  } catch {
    try {
      m = await pb.collection('users').getFullList({
        filter: `agency_owner = "${uid}" && id != "${uid}"`,
        batch: 200,
      })
    } catch {
      m = []
    }
  }
  for (const row of m) {
    const t = parseAccountType(row.account_type)
    if (t === 'client') continue
    const mid = row.id
    if (mid && mid !== ownerUserId) await ensureWorkspaceMemberLink(pb, ownerUserId, mid)
  }
}

export async function getWorkspaceContext(pb: PocketBase, userId: string): Promise<WorkspaceContext> {
  let record: Record<string, unknown>
  try {
    record = (await pb.collection('users').getOne(userId)) as unknown as Record<string, unknown>
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid user' })
  }

  let agencyOwnerId = resolveWorkspaceOwnerIdFromUserRecord(record)
  if (!agencyOwnerId) {
    try {
      const rows = await pb.collection('users').getFullList({
        filter: `id = "${escPbFilterId(userId)}"`,
        batch: 1,
        expand: 'agency_owner',
      })
      if (rows.length) {
        agencyOwnerId = resolveWorkspaceOwnerIdFromUserRecord(rows[0] as unknown as Record<string, unknown>)
      }
    } catch {
      // ignore
    }
  }
  if (!agencyOwnerId) {
    agencyOwnerId = await resolveTeamOwnerFromLinkTable(pb, userId)
  }
  const accountType = parseAccountType(record.account_type)

  if (accountType === 'client') {
    if (!agencyOwnerId) {
      throw createError({
        statusCode: 403,
        message: 'Portal account is missing workspace linkage. Contact your agency.',
      })
    }
    return { role: 'client', ownerId: agencyOwnerId, userId }
  }

  if (accountType === 'member' || accountType === 'agency_member') {
    if (!agencyOwnerId) {
      throw createError({
        statusCode: 403,
        message:
          'Team account is missing the agency owner link. Ask the account owner to re-invite you from Account → Team, or set agency_owner on your user in PocketBase.',
      })
    }
    return { role: 'member', ownerId: agencyOwnerId, userId }
  }

  if (agencyOwnerId) {
    return { role: 'member', ownerId: agencyOwnerId, userId }
  }

  return { role: 'owner', ownerId: userId, userId }
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
  const ownerId = extractPocketBaseRelationId((site as { user?: unknown }).user)
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

/**
 * PocketBase CRM collections store `user` as the workspace owner id.
 * Owners and invited members act on that same dataset; portal clients cannot use CRM APIs.
 */
export async function requireCrmOwnerId(pb: PocketBase, requestUserId: string): Promise<string> {
  let ctx = await getWorkspaceContext(pb, requestUserId)

  if (ctx.role === 'owner') {
    const esc = escPbFilterId(requestUserId)
    const ownSites = await pb.collection('sites').getFullList({ filter: `user = "${esc}"`, batch: 1 }).catch(() => [])
    if (!ownSites.length) {
      /** Member misclassified as owner (no sites, hidden agency_owner): rebuild links from every workspace that has sites. */
      const siteRows = await pb.collection('sites').getFullList({ batch: 500 }).catch(() => [])
      const ownerIds = new Set<string>()
      for (const s of siteRows) {
        const oid = extractPocketBaseRelationId((s as { user?: unknown }).user)
        if (oid) ownerIds.add(oid)
      }
      for (const oid of ownerIds) {
        await syncWorkspaceMemberLinksForOwner(pb, oid)
      }
      ctx = await getWorkspaceContext(pb, requestUserId)
    } else {
      await syncWorkspaceMemberLinksForOwner(pb, requestUserId)
    }
  }

  if (ctx.role === 'client') {
    throw createError({ statusCode: 403, message: 'CRM is not available for portal accounts.' })
  }
  const id = ctx.role === 'owner' ? requestUserId : ctx.ownerId
  if (!id) {
    throw createError({ statusCode: 403, message: 'Could not resolve workspace owner for CRM.' })
  }
  return id
}

/**
 * Workspace Google calendar is configured on the owner account and can be viewed by invited team members.
 * Portal clients do not inherit that access.
 */
export async function requireWorkspaceGoogleOwnerId(pb: PocketBase, requestUserId: string): Promise<string> {
  const ctx = await getWorkspaceContext(pb, requestUserId)
  if (ctx.role === 'client') {
    throw createError({ statusCode: 403, message: 'Google calendar is not available for portal accounts.' })
  }
  return ctx.role === 'owner' ? requestUserId : ctx.ownerId
}

export async function requireWorkspaceOwner(pb: PocketBase, requestUserId: string): Promise<void> {
  const ctx = await getWorkspaceContext(pb, requestUserId)
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only the account owner can manage billing.' })
  }
}
