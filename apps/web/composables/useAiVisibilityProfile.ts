import type { AiVisibilityProfile } from '~/types/aiVisibility'
import { isAiVisibilityProfile } from '~/types/aiVisibility'

export type LoadAiVisibilityOptions = {
  fetchIfMissing?: boolean
  refresh?: boolean
  maxAgeDays?: number
  maxKeywords?: number
}

export function useAiVisibilityProfile() {
  const { getHeaders } = useReportAuth()

  async function loadLatest(siteId: string, opts: LoadAiVisibilityOptions = {}): Promise<AiVisibilityProfile | null> {
    const query: Record<string, string> = {}
    if (opts.refresh) query.refresh = '1'
    if (opts.fetchIfMissing) query.fetchIfMissing = '1'
    if (opts.maxAgeDays != null && opts.maxAgeDays > 0) query.maxAgeDays = String(opts.maxAgeDays)
    if (opts.maxKeywords != null && opts.maxKeywords >= 0) query.maxKeywords = String(opts.maxKeywords)

    const raw = await $fetch<unknown>(`/api/sites/${siteId}/ai-visibility/latest`, {
      headers: getHeaders(),
      query,
    })
    if (raw == null) return null
    return isAiVisibilityProfile(raw) ? raw : null
  }

  async function refreshLive(siteId: string, maxKeywords?: number): Promise<AiVisibilityProfile> {
    const raw = await $fetch<unknown>(`/api/sites/${siteId}/ai-visibility/fetch`, {
      method: 'POST',
      headers: getHeaders(),
      body: maxKeywords != null ? { maxKeywords } : {},
    })
    if (!isAiVisibilityProfile(raw)) {
      throw new Error('Invalid AI visibility response')
    }
    return raw
  }

  return { loadLatest, refreshLive }
}
