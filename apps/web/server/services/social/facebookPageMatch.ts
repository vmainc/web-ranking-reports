import { normalizeFacebookPageUrl } from '~/server/services/social/facebookUrl'

export type MetaPageIdentity = {
  id: string
  username?: string
  link?: string
}

export type ConnectionIdentity = {
  external_asset_id: string
  username?: string
  canonical_url?: string
}

/**
 * True when an existing site Facebook connection is the same Page as a Meta-managed Page.
 * Does not guess from display names.
 */
export function connectionMatchesMetaPage(row: ConnectionIdentity, page: MetaPageIdentity): boolean {
  const assetId = (row.external_asset_id || '').trim()
  const pageId = (page.id || '').trim()
  if (pageId && (assetId === pageId || assetId === `fb_id:${pageId}`)) return true

  const pageUser = (page.username || '').trim().toLowerCase()
  const rowUser = (row.username || '').trim().toLowerCase()
  if (pageUser && rowUser && pageUser === rowUser) return true
  if (pageUser && assetId.toLowerCase() === `fb_url:${pageUser}`) return true

  const rowCanon = normalizeFacebookPageUrl(row.canonical_url || '')
  if (rowCanon?.numericId && pageId && rowCanon.numericId === pageId) return true
  if (rowCanon?.username && pageUser && rowCanon.username.toLowerCase() === pageUser) return true

  if (page.link) {
    const pageCanon = normalizeFacebookPageUrl(page.link)
    if (rowCanon && pageCanon && rowCanon.canonicalUrl === pageCanon.canonicalUrl) return true
  }

  return false
}

export function assertSiteOwnedByAgency(siteOwnerId: string, agencyOwnerId: string): boolean {
  return Boolean(siteOwnerId && agencyOwnerId && siteOwnerId === agencyOwnerId)
}
