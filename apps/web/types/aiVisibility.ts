/** DataForSEO LLM Mentions snapshot (cached on site or returned live from API). */

export type AiVisibilityPlatformMetrics = {
  mentions: number
  aiSearchVolume: number
}

export type AiVisibilityKeywordRow = {
  keyword: string
  total: AiVisibilityPlatformMetrics
  google: AiVisibilityPlatformMetrics | null
  chatGpt: AiVisibilityPlatformMetrics | null
}

export type AiVisibilityProfile = {
  target: string
  fetchedAt: string
  costs?: Partial<Record<string, number>>
  errors?: Partial<Record<string, string>>
  domain: {
    total: AiVisibilityPlatformMetrics
    google: AiVisibilityPlatformMetrics | null
    chatGpt: AiVisibilityPlatformMetrics | null
    topSourceDomains: Array<{ domain: string; mentions: number; aiSearchVolume: number }>
  }
  keywords: AiVisibilityKeywordRow[]
}

export function isAiVisibilityProfile(v: unknown): v is AiVisibilityProfile {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as AiVisibilityProfile).target === 'string' &&
    typeof (v as AiVisibilityProfile).fetchedAt === 'string' &&
    !!(v as AiVisibilityProfile).domain &&
    typeof (v as AiVisibilityProfile).domain === 'object'
  )
}

export function parseAiVisibilitySnapshot(v: unknown): AiVisibilityProfile | null {
  return isAiVisibilityProfile(v) ? v : null
}
