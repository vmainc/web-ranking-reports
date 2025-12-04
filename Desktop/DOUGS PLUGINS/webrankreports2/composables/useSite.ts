import { computed, type MaybeRefOrGetter, toValue } from 'vue'

interface Site {
  id: string
  name: string
  url: string
  keyword_count: number
  user_id: string
  created_at?: string
  updated_at?: string
}

export const useSite = (siteId: MaybeRefOrGetter<string | number | null | undefined>) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase

  const resolvedId = computed(() => String(toValue(siteId) ?? '').trim())

  const { data, pending, error, refresh } = useAsyncData<Site | null>(
    () => `site-${resolvedId.value}`,
    async () => {
      if (!resolvedId.value) return null

      if (!$supabase) {
        throw new Error('Supabase client is not available')
      }

      const { data, error } = await $supabase
        .from('sites')
        .select('id, name, url, keyword_count, user_id, created_at, updated_at')
        .eq('id', resolvedId.value)
        .single()

      if (error) throw error
      return data
    },
    {
      watch: [resolvedId],
    }
  )

  const site = computed(() => data.value)

  return {
    site,
    pending,
    error,
    refresh
  }
}

