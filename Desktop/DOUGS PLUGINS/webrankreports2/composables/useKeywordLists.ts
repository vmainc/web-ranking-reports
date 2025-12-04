import { computed, type MaybeRefOrGetter, toValue } from 'vue'

interface KeywordList {
  id: string
  name: string
  color: string
  created_at?: string
  updated_at?: string
}

export const useKeywordLists = (siteId: MaybeRefOrGetter<string | number | null | undefined>) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase

  const resolvedId = computed(() => String(toValue(siteId) ?? '').trim())

  // Fetch keyword lists for the site
  const { data, pending, error, refresh } = useAsyncData<KeywordList[]>(
    () => `keyword-lists-${resolvedId.value}`,
    async () => {
      if (!resolvedId.value) return []

      if (!$supabase) {
        throw new Error('Supabase client is not available')
      }

      const { data, error } = await $supabase
        .from('keyword_lists')
        .select('id, name, color, created_at, updated_at')
        .eq('site_id', resolvedId.value)
        .order('created_at', { ascending: true })

      if (error) {
        // Provide helpful error message if table doesn't exist
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          throw new Error('Keyword tables not found. Please run the SQL schema in Supabase first.')
        }
        throw error
      }
      return data || []
    },
    {
      watch: [resolvedId],
    }
  )

  const lists = computed(() => data.value || [])

  // Create a new list
  const createList = async (name: string) => {
    if (!resolvedId.value || !name.trim()) {
      throw new Error('Site ID and list name are required')
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    const { data, error } = await $supabase
      .from('keyword_lists')
      .insert({
        site_id: resolvedId.value,
        name: name.trim(),
        color: '#6366f1', // Default color
      })
      .select()
      .single()

    if (error) throw error

    // Refresh the lists
    await refresh()

    return data
  }

  // Rename a list
  const renameList = async (id: string, newName: string) => {
    if (!id || !newName.trim()) {
      throw new Error('List ID and new name are required')
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    const { error } = await $supabase
      .from('keyword_lists')
      .update({
        name: newName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    // Refresh the lists
    await refresh()
  }

  // Delete a list
  const deleteList = async (id: string) => {
    if (!id) {
      throw new Error('List ID is required')
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    const { error } = await $supabase
      .from('keyword_lists')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Refresh the lists
    await refresh()
  }

  return {
    lists,
    pending,
    error,
    createList,
    renameList,
    deleteList,
    refresh,
  }
}

