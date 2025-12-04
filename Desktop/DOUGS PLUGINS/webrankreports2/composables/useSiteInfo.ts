import { ref, computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useRuntimeConfig, useNuxtApp } from '#app'

export interface SiteInfoSite {
  id: string
  name: string
  url: string
  domain: string | null
}

export type SiteHealthStatus = 'ok' | 'warning' | 'critical'

export interface SiteInfoNormalized {
  domain_name: string | null
  domain_registered: string | null
  create_date: string | null
  update_date: string | null
  expiry_date: string | null
  domain_registrar: string | null
  name_servers: string[]
  domain_age_days: number | null
  days_to_expiry: number | null
  health_status: SiteHealthStatus
}

export interface SiteInfoResponse {
  site: SiteInfoSite
  normalized: SiteInfoNormalized
  raw: any
}

export const useSiteInfo = (siteId: MaybeRefOrGetter<string>) => {
  const info = ref<SiteInfoResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const runtimeConfig = useRuntimeConfig()
  const functionsBaseUrl = runtimeConfig.public.supabaseFunctionsUrl as string

  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase
  const config = useRuntimeConfig()
  const anonKey = config.public.supabaseAnonKey as string

  const fetchSiteInfo = async () => {
    loading.value = true
    error.value = null

    try {
      const site = toValue(siteId)
      if (!site) {
        throw new Error('Site ID is required')
      }

      if (!functionsBaseUrl) {
        throw new Error('Supabase Functions URL not configured')
      }

      // Get session for Authorization header
      const { data: session } = await $supabase.auth.getSession()
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      }

      if (session?.session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.session.access_token}`
      }

      const response = await fetch(`${functionsBaseUrl}/site-info`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          site_id: site,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || errorData.details || 'Failed to fetch site info.'
        console.error('Site Info Edge Function error:', errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json() as SiteInfoResponse
      console.log('Site Info response:', JSON.stringify(data, null, 2))
      console.log('Normalized data:', data.normalized)
      console.log('Raw data:', data.raw)
      info.value = data
    } catch (err: any) {
      console.error('Error fetching site info:', err)
      error.value = err.message || 'Unable to load site information.'
    } finally {
      loading.value = false
    }
  }

  const healthStatus = computed(() => info.value?.normalized.health_status ?? 'ok')

  return {
    info,
    loading,
    error,
    healthStatus,
    fetchSiteInfo,
  }
}

