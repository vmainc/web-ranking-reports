/** Normalized social domain types. Provider JSON stays inside adapters. */

export const SOCIAL_PROVIDERS = ['meta'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

export const SOCIAL_PLATFORMS = ['facebook', 'instagram'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const SOCIAL_ASSET_TYPES = ['facebook_page', 'instagram_business_account', 'ad_account'] as const
export type SocialAssetType = (typeof SOCIAL_ASSET_TYPES)[number]

export const SOCIAL_ACCESS_TYPES = ['public', 'authenticated'] as const
export type SocialAccessType = (typeof SOCIAL_ACCESS_TYPES)[number]

export const AGENCY_INTEGRATION_STATUSES = [
  'connected',
  'expired',
  'reconnect_required',
  'error',
  'disconnected',
] as const
export type AgencyIntegrationStatus = (typeof AGENCY_INTEGRATION_STATUSES)[number]

export const SOCIAL_CONNECTION_STATUSES = [
  'active',
  'metrics_unavailable',
  'reconnect_required',
  'error',
  'disconnected',
] as const
export type SocialConnectionStatus = (typeof SOCIAL_CONNECTION_STATUSES)[number]

export type SocialAsset = {
  provider: SocialProvider
  platform: SocialPlatform
  assetType: SocialAssetType
  externalId?: string
  displayName: string
  username?: string
  canonicalUrl?: string
}

export type NormalizedSocialMetric = {
  key: string
  value: number | null
  source: string
  isExact: boolean
  collectedAt: string
  periodType?: string
  periodStart?: string
  periodEnd?: string
  confidence?: number
}

export type NormalizedSocialPost = {
  externalId: string
  publishedAt: string
  permalink?: string
  message?: string
  engagement?: {
    reactions?: number | null
    comments?: number | null
    shares?: number | null
  }
}

export type SocialCapabilities = {
  followers: boolean
  reach: boolean
  engagement: boolean
  posts: boolean
  ads: boolean
  instagram: boolean
}

export type FacebookPublicMetrics = {
  followers?: NormalizedSocialMetric
}

export type ResolvedFacebookPage = {
  input: string
  canonicalUrl: string
  username?: string
  externalId?: string
  displayName: string
}

export type FacebookPageProfile = {
  displayName: string
  username?: string
  canonicalUrl: string
  externalId?: string
}

export type FetchContentOptions = {
  limit?: number
  since?: string
  until?: string
}

export type DateRange = {
  start: string
  end: string
}

export const COLLECTIONS = {
  agencyIntegrations: 'agency_integrations',
  siteSocialConnections: 'site_social_connections',
  socialMetricSnapshots: 'social_metric_snapshots',
} as const
