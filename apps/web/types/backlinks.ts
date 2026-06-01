/** DataForSEO backlinks profile (cached on site or returned live from API). */
export type BacklinksProfile = {
  target: string
  fetchedAt: string
  costs?: Partial<Record<string, number>>
  errors?: Partial<Record<string, string>>
  summary: Record<string, unknown> | null
  referringDomains: Array<{
    domain?: string
    rank?: number
    backlinks?: number
    referring_pages?: number
    referring_domains?: number
  }>
  anchors: Array<{
    anchor?: string
    backlinks?: number
    referring_domains?: number
    referring_pages?: number
  }>
  domainPages: Array<{
    page?: string
    title?: string
    rank?: number
    backlinks?: number
    referring_domains?: number
  }>
  sampleBacklinks: Array<{
    domain_from?: string
    url_from?: string
    url_to?: string
    anchor?: string
    dofollow?: boolean
    rank?: number
    item_type?: string
  }>
}

export function isBacklinksProfile(v: unknown): v is BacklinksProfile {
  return !!v && typeof v === 'object' && typeof (v as BacklinksProfile).target === 'string'
}
