/**
 * Integration brand marks via Simple Icons (CC0): https://github.com/simple-icons/simple-icons
 * Served from https://cdn.simpleicons.org/{slug}/{hex-without-#}
 */

export type BrandIconSpec = { slug: string; color: string }

/** PocketBase / SiteIntegrationCard `provider` values */
export const BRAND_ICON_BY_PROVIDER: Record<string, BrandIconSpec> = {
  google_analytics: { slug: 'googleanalytics', color: 'E37400' },
  google_search_console: { slug: 'googlesearchconsole', color: '458CF5' },
  google_ads: { slug: 'googleads', color: '4285F4' },
  google_local_services_ads: { slug: 'googleads', color: '5F6368' },
  lighthouse: { slug: 'lighthouse', color: 'F44B21' },
  google_business_profile: { slug: 'googlemaps', color: '4285F4' },
  woocommerce: { slug: 'woocommerce', color: '96588A' },
}

/** Site dashboard `siteIntegrationCards` short keys */
export const BRAND_ICON_BY_DASH_KEY: Record<string, BrandIconSpec> = {
  ga: BRAND_ICON_BY_PROVIDER.google_analytics,
  gsc: BRAND_ICON_BY_PROVIDER.google_search_console,
  lh: BRAND_ICON_BY_PROVIDER.lighthouse,
  ads: BRAND_ICON_BY_PROVIDER.google_ads,
  gbp: BRAND_ICON_BY_PROVIDER.google_business_profile,
  woo: BRAND_ICON_BY_PROVIDER.woocommerce,
}

export function brandIconCdnUrl(spec: BrandIconSpec): string {
  return `https://cdn.simpleicons.org/${spec.slug}/${spec.color}`
}
