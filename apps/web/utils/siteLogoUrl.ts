import type PocketBase from 'pocketbase'
import type { SiteRecord } from '~/types'

/** Resolves a display URL for the site’s uploaded logo file, if any. */
export function resolveSiteLogoUrl(site: SiteRecord | null | undefined, pb: PocketBase): string {
  if (!site?.id) return ''
  const logo = site.logo
  const filename =
    typeof logo === 'string' && logo
      ? logo
      : Array.isArray(logo) && logo.length > 0 && typeof logo[0] === 'string'
        ? logo[0]
        : ''
  if (!filename) return ''
  try {
    return pb.files.getUrl(site as SiteRecord, filename)
  } catch {
    const base = (pb.baseUrl || '').replace(/\/+$/, '')
    if (!base) return ''
    return `${base}/api/files/sites/${site.id}/${encodeURIComponent(filename)}`
  }
}
