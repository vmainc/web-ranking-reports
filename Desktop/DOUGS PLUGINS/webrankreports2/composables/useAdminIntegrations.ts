import { ref, computed } from 'vue'
import { useRuntimeConfig } from '#app'

export interface AdminIntegrationRow {
  site_id: string
  site_name: string
  site_url: string
  created_at: string | null
  ga4_connected: boolean
  gsc_connected: boolean
  ads_connected: boolean
  integrations_updated_at: string | null
}

export const useAdminIntegrations = () => {
  const items = ref<AdminIntegrationRow[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const search = ref('')
  const showNeedsAttentionOnly = ref(false)

  const runtimeConfig = useRuntimeConfig()
  const functionsBaseUrl = runtimeConfig.public.supabaseFunctionsUrl as string

  const fetchAdminIntegrations = async () => {
    loading.value = true
    error.value = null

    try {
      const nuxtApp = useNuxtApp()
      const $supabase = nuxtApp.$supabase

      if (!$supabase) {
        throw new Error('Supabase client not available')
      }

      // Get session token for authentication
      const { data: { session } } = await $supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in and try again.')
      }

      const anonKey = runtimeConfig.public.supabaseAnonKey as string

      const response = await fetch(`${functionsBaseUrl}/admin-integrations-summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
        },
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to load integrations.')
      }

      const data = await response.json() as { rows: AdminIntegrationRow[] }
      items.value = data.rows || []
    } catch (err: any) {
      console.error(err)
      error.value = err.message || 'Unable to load integrations.'
    } finally {
      loading.value = false
    }
  }

  const filteredItems = computed(() => {
    const term = search.value.trim().toLowerCase()

    return items.value.filter((row) => {
      const matchesSearch =
        !term ||
        row.site_name.toLowerCase().includes(term) ||
        row.site_url.toLowerCase().includes(term)

      const needsAttention =
        !row.ga4_connected || !row.gsc_connected || !row.ads_connected

      if (showNeedsAttentionOnly.value && !needsAttention) {
        return false
      }

      return matchesSearch
    })
  })

  return {
    items,
    loading,
    error,
    search,
    showNeedsAttentionOnly,
    filteredItems,
    fetchAdminIntegrations
  }
}

