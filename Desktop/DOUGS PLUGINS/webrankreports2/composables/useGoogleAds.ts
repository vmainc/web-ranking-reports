import { ref, computed, type MaybeRefOrGetter, toValue } from 'vue'

export type AdsDateRange = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS'

export interface AdsTotals {
  impressions: number
  clicks: number
  costMicros: number
  conversions: number
}

export interface AdsCampaign {
  id: string
  name: string
  impressions: number
  clicks: number
  costMicros: number
  conversions: number
}

export const useGoogleAds = (
  siteId: MaybeRefOrGetter<string | number | null | undefined>
) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase

  const resolvedId = computed(() => String(toValue(siteId) ?? '').trim())

  const dateRange = ref<AdsDateRange>('LAST_30_DAYS')
  const totals = ref<AdsTotals | null>(null)
  const campaigns = ref<AdsCampaign[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchSummary = async () => {
    if (!resolvedId.value) {
      totals.value = null
      campaigns.value = []
      return
    }

    const config = useRuntimeConfig()
    const nuxtApp = useNuxtApp()
    const $supabase = nuxtApp.$supabase

    const { data: session } = await $supabase.auth.getSession()
    if (!session?.session) {
      error.value = 'Not authenticated'
      return
    }

    const functionsBaseUrl = config.public.supabaseFunctionsUrl as string
    if (!functionsBaseUrl) {
      error.value = 'Supabase Functions URL not configured'
      return
    }

    const anonKey = config.public.supabaseAnonKey as string

    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${functionsBaseUrl}/google-ads-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          site_id: resolvedId.value,
          date_range: dateRange.value,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || 'Failed to fetch Google Ads summary'
        
        // If it's a "not connected" error, don't treat it as a critical error
        // Silently handle this expected state
        if (response.status === 404 && (
          errorMessage.includes('not connected') || 
          errorMessage.includes('Google Ads not connected')
        )) {
          error.value = null // Clear error for expected "not connected" state
          totals.value = null
          campaigns.value = []
          return
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      totals.value = data.totals || {
        impressions: 0,
        clicks: 0,
        costMicros: 0,
        conversions: 0,
      }
      campaigns.value = data.campaigns || []
    } catch (err: any) {
      console.error('Error fetching Google Ads summary:', err)
      error.value = err.message || 'Failed to load Google Ads data'
      totals.value = null
      campaigns.value = []
    } finally {
      loading.value = false
    }
  }

  const formatCurrency = (micros: number): string => {
    const dollars = micros / 1000000
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dollars)
  }

  return {
    dateRange,
    totals,
    campaigns,
    loading,
    error,
    fetchSummary,
    formatCurrency,
  }
}

