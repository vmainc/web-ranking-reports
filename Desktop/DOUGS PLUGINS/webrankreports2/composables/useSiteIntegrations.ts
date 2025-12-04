import { computed, type MaybeRefOrGetter, toValue } from 'vue'

interface SiteIntegration {
  id: string
  site_id: string
  ga4_property_id: string | null
  ga4_measurement_id: string | null
  gsc_property_url: string | null
  ads_customer_id: string | null
  ga4_connected: boolean
  gsc_connected: boolean
  ads_connected: boolean
  ads_token_expires_at: string | null
  last_synced_at: string | null
  created_at?: string
  updated_at?: string
}

export const useSiteIntegrations = (siteId: MaybeRefOrGetter<string | number | null | undefined>) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase

  const resolvedId = computed(() => String(toValue(siteId) ?? '').trim())

  const { data, pending, error, refresh } = useAsyncData<SiteIntegration | null>(
    () => `site-integrations-${resolvedId.value}`,
    async () => {
      if (!resolvedId.value) return null

      if (!$supabase) {
        throw new Error('Supabase client is not available')
      }

      const { data, error } = await $supabase
        .from('site_integrations')
        .select('id, site_id, ga4_property_id, ga4_measurement_id, gsc_property_url, ads_customer_id, ga4_connected, gsc_connected, ads_connected, ads_token_expires_at, last_synced_at, ga4_access_token, gsc_access_token, ads_access_token')
        .eq('site_id', resolvedId.value)
        .maybeSingle()

      if (error) throw error
      return data
    },
    {
      watch: [resolvedId],
    }
  )

  const integration = computed(() => data.value)

  const ga4Connected = computed(() => !!integration.value?.ga4_connected && !!integration.value?.ga4_access_token)
  const gscConnected = computed(() => {
    const int = integration.value
    return !!(int?.gsc_connected && int?.gsc_access_token && int?.gsc_property_url)
  })
  const adsConnected = computed(() => !!integration.value?.ads_connected && !!integration.value?.ads_access_token)

  return {
    integration,
    ga4Connected,
    gscConnected,
    adsConnected,
    pending,
    error,
    refresh
  }
}

