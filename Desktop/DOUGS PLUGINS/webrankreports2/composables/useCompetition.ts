import { ref, computed, type MaybeRefOrGetter, toValue } from 'vue'

interface Competitor {
  id: string
  site_id: string
  domain: string
  tech: Record<string, any>
  discovered_from: 'gsc' | 'wappalyzer' | 'serp' | null
  created_at: string
}

interface CompetitorKeyword {
  id: string
  site_id: string
  competitor_id: string
  keyword: string
  position: number | null
  url: string | null
  est_traffic: number | null
  source: 'serp' | null
  created_at: string
}

interface KeywordGap {
  sharedKeywords: Array<{
    keyword: string
    yourPosition: number | null
    competitorPosition: number | null
    searchVolume: number | null
  }>
  missingKeywords: Array<{
    keyword: string
    competitorPosition: number | null
    estTraffic: number | null
    searchVolume: number | null
  }>
  yourStrengthKeywords: Array<{
    keyword: string
    yourPosition: number | null
    searchVolume: number | null
  }>
}

export const useCompetition = (
  siteId: MaybeRefOrGetter<string | number | null | undefined>
) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase

  const resolvedId = computed(() => String(toValue(siteId) ?? '').trim())

  const competitors = ref<Competitor[]>([])
  const competitorsLoading = ref(false)
  const competitorsError = ref<string | null>(null)

  const competitorKeywords = ref<Record<string, CompetitorKeyword[]>>({})
  const keywordsLoading = ref<Record<string, boolean>>({})
  const keywordsError = ref<Record<string, string | null>>({})

  // Fetch competitors for a site
  const getCompetitors = async () => {
    if (!resolvedId.value) {
      competitors.value = []
      return
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    competitorsLoading.value = true
    competitorsError.value = null

    try {
      const { data, error } = await $supabase
        .from('competitors')
        .select('id, site_id, domain, tech, discovered_from, created_at')
        .eq('site_id', resolvedId.value)
        .order('created_at', { ascending: false })

      if (error) throw error

      competitors.value = (data || []) as Competitor[]
    } catch (err: any) {
      console.error('Error fetching competitors:', err)
      competitorsError.value = err.message || 'Failed to load competitors'
      competitors.value = []
    } finally {
      competitorsLoading.value = false
    }
  }

  // Discover competitors
  const discoverCompetitors = async (url: string) => {
    if (!resolvedId.value || !url) {
      throw new Error('Site ID and URL are required')
    }

    const config = useRuntimeConfig()
    const nuxtApp = useNuxtApp()
    const $supabase = nuxtApp.$supabase

    const { data: session } = await $supabase.auth.getSession()
    if (!session?.session) {
      throw new Error('Not authenticated')
    }

    const functionsBaseUrl = config.public.supabaseFunctionsUrl as string
    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL not configured')
    }

    const anonKey = config.public.supabaseAnonKey as string

    competitorsLoading.value = true
    competitorsError.value = null

    try {
      const response = await fetch(`${functionsBaseUrl}/competitors-discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          site_id: resolvedId.value,
          url: url.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to discover competitors')
      }

      const data = await response.json()
      
      // Refresh competitors list
      await getCompetitors()

      return data
    } catch (err: any) {
      console.error('Error discovering competitors:', err)
      competitorsError.value = err.message || 'Failed to discover competitors'
      throw err
    } finally {
      competitorsLoading.value = false
    }
  }

  // Fetch keywords for a competitor
  const fetchCompetitorKeywords = async (competitorId: string, domain: string) => {
    if (!resolvedId.value || !competitorId || !domain) {
      throw new Error('Site ID, competitor ID, and domain are required')
    }

    const config = useRuntimeConfig()
    const nuxtApp = useNuxtApp()
    const $supabase = nuxtApp.$supabase

    const { data: session } = await $supabase.auth.getSession()
    if (!session?.session) {
      throw new Error('Not authenticated')
    }

    const functionsBaseUrl = config.public.supabaseFunctionsUrl as string
    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL not configured')
    }

    const anonKey = config.public.supabaseAnonKey as string

    keywordsLoading.value[competitorId] = true
    keywordsError.value[competitorId] = null

    try {
      const response = await fetch(`${functionsBaseUrl}/competitor-keywords-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          site_id: resolvedId.value,
          competitor_id: competitorId,
          domain: domain.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch competitor keywords')
      }

      const data = await response.json()
      
      // Refresh keywords for this competitor
      await getCompetitorKeywords(competitorId)

      return data
    } catch (err: any) {
      console.error('Error fetching competitor keywords:', err)
      keywordsError.value[competitorId] = err.message || 'Failed to fetch competitor keywords'
      throw err
    } finally {
      keywordsLoading.value[competitorId] = false
    }
  }

  // Get keywords for a competitor
  const getCompetitorKeywords = async (competitorId: string) => {
    if (!resolvedId.value || !competitorId) {
      competitorKeywords.value[competitorId] = []
      return
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    keywordsLoading.value[competitorId] = true
    keywordsError.value[competitorId] = null

    try {
      const { data, error } = await $supabase
        .from('competitor_keywords')
        .select('id, site_id, competitor_id, keyword, position, url, est_traffic, source, created_at')
        .eq('site_id', resolvedId.value)
        .eq('competitor_id', competitorId)
        .order('est_traffic', { ascending: false, nullsLast: true })

      if (error) throw error

      competitorKeywords.value[competitorId] = (data || []) as CompetitorKeyword[]
    } catch (err: any) {
      console.error('Error fetching competitor keywords:', err)
      keywordsError.value[competitorId] = err.message || 'Failed to load competitor keywords'
      competitorKeywords.value[competitorId] = []
    } finally {
      keywordsLoading.value[competitorId] = false
    }
  }

  // Compute keyword gap between your site and a competitor
  const computeKeywordGap = async (competitorId: string): Promise<KeywordGap> => {
    if (!resolvedId.value || !competitorId) {
      return {
        sharedKeywords: [],
        missingKeywords: [],
        yourStrengthKeywords: [],
      }
    }

    // Get competitor keywords
    if (!competitorKeywords.value[competitorId]) {
      await getCompetitorKeywords(competitorId)
    }

    const compKeywords = competitorKeywords.value[competitorId] || []
    const compKeywordSet = new Set(compKeywords.map(k => k.keyword.toLowerCase()))

    // Get your GSC keywords (if available)
    let yourKeywords: Array<{ keyword: string; position: number | null; clicks: number | null }> = []
    
    if ($supabase) {
      try {
        const { data: gscData } = await $supabase
          .from('gsc_keyword_stats')
          .select('keyword_phrase, avg_position, clicks')
          .eq('site_id', resolvedId.value)
          .eq('date_range_label', 'last_28_days')
          .limit(1000)

        if (gscData) {
          yourKeywords = gscData.map(k => ({
            keyword: k.keyword_phrase,
            position: k.avg_position ? Math.round(k.avg_position) : null,
            clicks: k.clicks ? Number(k.clicks) : null,
          }))
        }
      } catch (err) {
        console.error('Error fetching GSC keywords:', err)
      }
    }

    const yourKeywordSet = new Set(yourKeywords.map(k => k.keyword.toLowerCase()))
    const yourKeywordMap = new Map(
      yourKeywords.map(k => [k.keyword.toLowerCase(), k])
    )

    // Shared keywords (both rank for)
    const sharedKeywords = compKeywords
      .filter(ck => yourKeywordSet.has(ck.keyword.toLowerCase()))
      .map(ck => {
        const yourKeyword = yourKeywordMap.get(ck.keyword.toLowerCase())
        return {
          keyword: ck.keyword,
          yourPosition: yourKeyword?.position ?? null,
          competitorPosition: ck.position,
          searchVolume: yourKeyword?.clicks ?? ck.est_traffic,
        }
      })

    // Missing keywords (competitor ranks, you don't)
    const missingKeywords = compKeywords
      .filter(ck => !yourKeywordSet.has(ck.keyword.toLowerCase()))
      .map(ck => ({
        keyword: ck.keyword,
        competitorPosition: ck.position,
        estTraffic: ck.est_traffic,
        searchVolume: ck.est_traffic,
      }))

    // Your strength keywords (you rank, competitor doesn't)
    const yourStrengthKeywords = yourKeywords
      .filter(yk => !compKeywordSet.has(yk.keyword.toLowerCase()))
      .map(yk => ({
        keyword: yk.keyword,
        yourPosition: yk.position,
        searchVolume: yk.clicks,
      }))

    return {
      sharedKeywords,
      missingKeywords,
      yourStrengthKeywords,
    }
  }

  return {
    competitors,
    competitorsLoading,
    competitorsError,
    competitorKeywords,
    keywordsLoading,
    keywordsError,
    getCompetitors,
    discoverCompetitors,
    fetchCompetitorKeywords,
    getCompetitorKeywords,
    computeKeywordGap,
  }
}
