import type PocketBase from 'pocketbase'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'

export const PROPOSAL_SETTINGS_KEY_PREFIX = 'proposal_settings'

export function proposalSettingsKeyForOwner(ownerId: string): string {
  return `${PROPOSAL_SETTINGS_KEY_PREFIX}:${ownerId}`
}

export type ProposalSettings = {
  catalog_site_id: string | null
}

export async function getProposalSettings(pb: PocketBase, ownerId: string): Promise<ProposalSettings> {
  const key = proposalSettingsKeyForOwner(ownerId)
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: { catalog_site_id?: string } }>(
      `key="${key.replace(/"/g, '\\"')}"`,
    )
    const id = typeof row?.value?.catalog_site_id === 'string' ? row.value.catalog_site_id.trim() : ''
    return { catalog_site_id: id || null }
  } catch {
    return { catalog_site_id: null }
  }
}

export async function saveProposalSettings(
  pb: PocketBase,
  ownerId: string,
  settings: ProposalSettings,
): Promise<ProposalSettings> {
  const key = proposalSettingsKeyForOwner(ownerId)
  const value = { catalog_site_id: settings.catalog_site_id || null }
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ id: string }>(
      `key="${key.replace(/"/g, '\\"')}"`,
    )
    await pb.collection('app_settings').update(row.id, { value })
  } catch {
    await pb.collection('app_settings').create({ key, value })
  }
  return value
}

export async function assertCatalogSiteOwned(
  pb: PocketBase,
  ownerId: string,
  siteId: string,
) {
  const site = await pb.collection('sites').getOne(siteId).catch(() => null)
  if (!site || extractPocketBaseRelationId((site as { user?: unknown }).user) !== ownerId) {
    throw createError({ statusCode: 403, message: 'Catalog site not found' })
  }
  return site
}

/** Strip HTML from Woo descriptions for frozen line items / catalog cache. */
export function stripHtml(html: string | undefined | null, max = 2000): string {
  if (!html) return ''
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, max)
}

export function parseWooPrice(value: string | undefined | null): number {
  if (value == null || value === '') return 0
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}
