import { computed, type MaybeRefOrGetter, toValue } from 'vue'

interface KeywordList {
  id: string
  name: string
  color: string
}

interface KeywordMetrics {
  clicks: number
  impressions: number
  ctr: number
  avg_position: number
}

interface Keyword {
  id: string
  phrase: string
  lists: KeywordList[]
  metrics?: KeywordMetrics
  search_volume?: number | null
  competition?: string | null
  cpc?: number | null
  created_at?: string
  updated_at?: string
}

interface UseKeywordsOptions {
  dateRangeLabel?: string
}

export const useKeywords = (
  siteId: MaybeRefOrGetter<string | number | null | undefined>,
  options?: UseKeywordsOptions
) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase

  const resolvedId = computed(() => String(toValue(siteId) ?? '').trim())
  const dateRangeLabel = options?.dateRangeLabel || 'last_28_days'

  // Fetch keywords with their lists and metrics
  const { data, pending, error, refresh } = useAsyncData<Keyword[]>(
    () => `keywords-${resolvedId.value}-${dateRangeLabel}`,
    async () => {
      if (!resolvedId.value) return []

      if (!$supabase) {
        throw new Error('Supabase client is not available')
      }

      // Fetch keywords for the site
      // Try to select research data columns, but handle gracefully if they don't exist yet
      let keywordsData: any[] | null = null
      let keywordsError: any = null
      let hasResearchColumns = true
      
      // First try with research columns
      const result = await $supabase
        .from('keywords')
        .select('id, phrase, search_volume, competition, cpc, created_at, updated_at')
        .eq('site_id', resolvedId.value)
        .order('phrase', { ascending: true })
      
      keywordsData = result.data
      keywordsError = result.error
      
      // If we got an error, check if it's because columns don't exist
      // 400 Bad Request from PostgREST usually means column doesn't exist
      // Also check error message for column-related errors
      if (keywordsError) {
        // Log error for debugging (remove in production if needed)
        console.log('Keywords fetch error:', {
          error: keywordsError,
          message: keywordsError.message,
          code: keywordsError.code,
          status: keywordsError.status,
          statusCode: keywordsError.statusCode,
          details: keywordsError.details,
          hint: keywordsError.hint
        })
        
        const errorMessage = String(keywordsError.message || '').toLowerCase()
        const errorCode = String(keywordsError.code || '')
        const errorDetails = String(keywordsError.details || '').toLowerCase()
        const errorHint = String(keywordsError.hint || '').toLowerCase()
        const status = keywordsError.status || keywordsError.statusCode
        
        // Check if it's a column error - 400 status OR error mentions columns
        const isColumnError = 
          status === 400 || // Bad Request usually means column doesn't exist
          errorCode === '42703' || // undefined_column
          errorCode === 'PGRST116' || // PostgREST column error
          errorCode === '42P01' || // undefined_table
          errorMessage.includes('column') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('search_volume') ||
          errorMessage.includes('competition') ||
          errorMessage.includes('cpc') ||
          errorDetails.includes('column') ||
          errorHint.includes('column')
        
        if (isColumnError) {
          console.log('Detected column error, falling back to basic columns')
          hasResearchColumns = false
          // Fallback: select without research columns
          const fallbackResult = await $supabase
            .from('keywords')
            .select('id, phrase, created_at, updated_at')
            .eq('site_id', resolvedId.value)
            .order('phrase', { ascending: true })
          keywordsData = fallbackResult.data
          keywordsError = fallbackResult.error
        }
      }

      if (keywordsError) {
        // Provide helpful error message if table doesn't exist
        if (keywordsError.code === '42P01' || keywordsError.message.includes('does not exist')) {
          throw new Error('Keyword tables not found. Please run the SQL schema in Supabase first.')
        }
        throw keywordsError
      }

      if (!keywordsData || keywordsData.length === 0) {
        return []
      }

      const keywordIds = keywordsData.map(k => k.id)

      // Fetch list assignments for these keywords
      const { data: assignmentsData, error: assignmentsError } = await $supabase
        .from('keyword_list_keywords')
        .select(`
          keyword_id,
          list_id,
          keyword_lists!inner(id, name, color)
        `)
        .in('keyword_id', keywordIds)

      if (assignmentsError) throw assignmentsError

      // Fetch GSC stats for these keywords
      const keywordPhrases = keywordsData.map(k => k.phrase)
      const { data: statsData, error: statsError } = await $supabase
        .from('gsc_keyword_stats')
        .select('keyword_phrase, clicks, impressions, ctr, avg_position')
        .eq('site_id', resolvedId.value)
        .eq('date_range_label', dateRangeLabel)
        .in('keyword_phrase', keywordPhrases)

      if (statsError) throw statsError

      // Build a map of keyword_id -> lists
      const keywordListsMap = new Map<string, KeywordList[]>()
      if (assignmentsData) {
        for (const assignment of assignmentsData) {
          const keywordId = assignment.keyword_id as string
          const list = (assignment.keyword_lists as any) as KeywordList

          if (!keywordListsMap.has(keywordId)) {
            keywordListsMap.set(keywordId, [])
          }
          keywordListsMap.get(keywordId)!.push(list)
        }
      }

      // Build a map of keyword_phrase -> metrics
      const keywordMetricsMap = new Map<string, KeywordMetrics>()
      if (statsData) {
        for (const stat of statsData) {
          keywordMetricsMap.set(stat.keyword_phrase, {
            clicks: Number(stat.clicks) || 0,
            impressions: Number(stat.impressions) || 0,
            ctr: Number(stat.ctr) || 0,
            avg_position: Number(stat.avg_position) || 0,
          })
        }
      }

      // Combine everything into keyword objects
      const keywords: Keyword[] = keywordsData.map(keyword => {
        const lists = keywordListsMap.get(keyword.id) || []
        const metrics = keywordMetricsMap.get(keyword.phrase)

        return {
          id: keyword.id,
          phrase: keyword.phrase,
          lists,
          metrics,
          search_volume: hasResearchColumns ? (keyword.search_volume ?? null) : null,
          competition: hasResearchColumns ? (keyword.competition ?? null) : null,
          cpc: hasResearchColumns ? (keyword.cpc ?? null) : null,
          created_at: keyword.created_at,
          updated_at: keyword.updated_at,
        }
      })

      return keywords
    },
    {
      watch: [resolvedId],
    }
  )

  const keywords = computed(() => data.value || [])

  // Add keywords (bulk insert)
  const addKeywords = async (
    phrases: string[],
    listIds?: string[],
    researchData?: Array<{
      phrase: string
      searchVolume?: number | null
      competition?: string | null
      cpc?: number | null
    }>
  ) => {
    if (!resolvedId.value || !phrases || phrases.length === 0) {
      throw new Error('Site ID and at least one keyword phrase are required')
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    // Clean and deduplicate phrases
    const cleanPhrases = phrases
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates

    if (cleanPhrases.length === 0) {
      throw new Error('No valid keywords to add')
    }

    // Build research data map for quick lookup
    const researchDataMap = new Map<string, { searchVolume?: number | null; competition?: string | null; cpc?: number | null }>()
    if (researchData) {
      researchData.forEach(data => {
        researchDataMap.set(data.phrase.toLowerCase().trim(), {
          searchVolume: data.searchVolume,
          competition: data.competition,
          cpc: data.cpc,
        })
      })
    }

    // Insert keywords (using upsert to handle duplicates gracefully)
    // Only include research data if columns exist (will be handled by try/catch in upsert)
    const keywordsToInsert = cleanPhrases.map(phrase => {
      const research = researchDataMap.get(phrase.toLowerCase().trim())
      const baseKeyword: any = {
        site_id: resolvedId.value,
        phrase,
      }
      
      // Only add research data if we have it
      if (research) {
        if (research.searchVolume !== null && research.searchVolume !== undefined) {
          baseKeyword.search_volume = research.searchVolume
        }
        if (research.competition) {
          baseKeyword.competition = research.competition
        }
        if (research.cpc !== null && research.cpc !== undefined) {
          baseKeyword.cpc = research.cpc
        }
      }
      
      return baseKeyword
    })

    // Check if research columns exist by trying a simple query
    // We'll use the same detection logic as in the fetch function
    let hasResearchColumns = true
    let existingKeywordsData: any[] | null = null
    
    // Try to check if columns exist by attempting a select
    const testResult = await $supabase
      .from('keywords')
      .select('id, phrase, search_volume, competition, cpc')
      .eq('site_id', resolvedId.value)
      .limit(1)
    
    if (testResult.error && (testResult.error.code === '42703' || testResult.error.message?.includes('column'))) {
      hasResearchColumns = false
      console.log('Research columns do not exist, will save without research data')
    } else {
      console.log('Research columns exist, will save with research data')
    }
    
    // Log the research data we're trying to save
    if (researchData && researchData.length > 0) {
      console.log('Research data to save:', researchData)
    }
    
    // Now fetch existing keywords (without research columns if they don't exist)
    if (hasResearchColumns) {
      const existingResult = await $supabase
        .from('keywords')
        .select('id, phrase, search_volume, competition, cpc')
        .eq('site_id', resolvedId.value)
        .in('phrase', cleanPhrases)
      existingKeywordsData = existingResult.data
    } else {
      const fallbackResult = await $supabase
        .from('keywords')
        .select('id, phrase')
        .eq('site_id', resolvedId.value)
        .in('phrase', cleanPhrases)
      existingKeywordsData = fallbackResult.data
    }

    const existingDataMap = new Map<string, { search_volume: number | null; competition: string | null; cpc: number | null }>()
    if (existingKeywordsData && hasResearchColumns) {
      existingKeywordsData.forEach(k => {
        existingDataMap.set(k.phrase.toLowerCase().trim(), {
          search_volume: k.search_volume ?? null,
          competition: k.competition ?? null,
          cpc: k.cpc ?? null,
        })
      })
    }

    // Merge with existing data - only update if new data is provided
    // If columns don't exist, remove research data fields
    let keywordsToUpsert: any[]
    
    if (!hasResearchColumns) {
      // Remove research columns if they don't exist
      keywordsToUpsert = keywordsToInsert.map(keyword => ({
        site_id: keyword.site_id,
        phrase: keyword.phrase,
      }))
    } else {
      const existingDataMap = new Map<string, { search_volume: number | null; competition: string | null; cpc: number | null }>()
      if (existingKeywordsData) {
        existingKeywordsData.forEach(k => {
          existingDataMap.set(k.phrase.toLowerCase().trim(), {
            search_volume: k.search_volume ?? null,
            competition: k.competition ?? null,
            cpc: k.cpc ?? null,
          })
        })
      }
      
      keywordsToUpsert = keywordsToInsert.map(keyword => {
        const existing = existingDataMap.get(keyword.phrase.toLowerCase().trim())
        return {
          site_id: keyword.site_id,
          phrase: keyword.phrase,
          search_volume: keyword.search_volume ?? existing?.search_volume ?? null,
          competition: keyword.competition ?? existing?.competition ?? null,
          cpc: keyword.cpc ?? existing?.cpc ?? null,
        }
      })
    }

    // Upsert keywords
    let insertedKeywords: any[] | null = null
    let insertError: any = null
    
    const upsertResult = await $supabase
      .from('keywords')
      .upsert(keywordsToUpsert, {
        onConflict: 'site_id,phrase',
        ignoreDuplicates: false,
      })
      .select(hasResearchColumns ? 'id, phrase, search_volume, competition, cpc' : 'id, phrase')
    
    insertedKeywords = upsertResult.data
    insertError = upsertResult.error
    
    // If error is about missing columns, try without them (shouldn't happen if we detected correctly, but be safe)
    if (insertError && (insertError.code === '42703' || insertError.message?.includes('column'))) {
      console.log('Upsert failed with column error, retrying without research columns')
      const fallbackUpsert = keywordsToUpsert.map(k => ({
        site_id: k.site_id,
        phrase: k.phrase,
      }))
      const fallbackResult = await $supabase
        .from('keywords')
        .upsert(fallbackUpsert, {
          onConflict: 'site_id,phrase',
          ignoreDuplicates: false,
        })
        .select('id, phrase')
      insertedKeywords = fallbackResult.data
      insertError = fallbackResult.error
    }

    if (insertError) {
      // If error is due to duplicates, fetch the existing keywords and update with research data
      if (insertError.code === '23505') {
        // Duplicate key error - fetch existing keywords by phrase
        const { data: existingKeywords } = await $supabase
          .from('keywords')
          .select('id, phrase, search_volume, competition, cpc')
          .eq('site_id', resolvedId.value)
          .in('phrase', cleanPhrases)

        // Update existing keywords with research data if provided
        if (existingKeywords && researchDataMap.size > 0) {
          const updates = existingKeywords
            .map(keyword => {
              const research = researchDataMap.get(keyword.phrase.toLowerCase().trim())
              if (research && (research.searchVolume !== null || research.competition || research.cpc !== null)) {
                return {
                  id: keyword.id,
                  search_volume: research.searchVolume ?? keyword.search_volume,
                  competition: research.competition ?? keyword.competition,
                  cpc: research.cpc ?? keyword.cpc,
                }
              }
              return null
            })
            .filter(Boolean) as Array<{ id: string; search_volume: number | null; competition: string | null; cpc: number | null }>

          if (updates.length > 0) {
            await $supabase
              .from('keywords')
              .upsert(updates, {
                onConflict: 'id',
              })
          }
        }

        if (existingKeywords && listIds && listIds.length > 0) {
          // Still assign to lists even if keywords already exist
          await assignKeywordsToLists(existingKeywords.map(k => k.id), listIds)
        }
        await refresh()
        return existingKeywords || []
      }
      throw insertError
    }

    // Assign keywords to lists if provided
    if (insertedKeywords && listIds && listIds.length > 0) {
      const insertedKeywordIds = insertedKeywords.map(k => k.id)
      await assignKeywordsToLists(insertedKeywordIds, listIds)
    }

    // Refresh the keywords list
    await refresh()

    return insertedKeywords || []
  }

  // Helper: Assign multiple keywords to multiple lists
  const assignKeywordsToLists = async (keywordIds: string[], listIds: string[]) => {
    if (!keywordIds || keywordIds.length === 0 || !listIds || listIds.length === 0) {
      return
    }

    const assignments: Array<{ keyword_id: string; list_id: string }> = []
    for (const keywordId of keywordIds) {
      for (const listId of listIds) {
        assignments.push({ keyword_id: keywordId, list_id: listId })
      }
    }

    // Upsert assignments (ignore duplicates)
    await $supabase
      .from('keyword_list_keywords')
      .upsert(assignments, {
        onConflict: 'keyword_id,list_id',
        ignoreDuplicates: true,
      })
  }

  // Delete a keyword
  const deleteKeyword = async (keywordId: string) => {
    if (!keywordId) {
      throw new Error('Keyword ID is required')
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    const { error } = await $supabase
      .from('keywords')
      .delete()
      .eq('id', keywordId)

    if (error) throw error

    // Refresh the keywords list
    await refresh()
  }

  // Assign a keyword to a list
  const assignKeywordToList = async (keywordId: string, listId: string) => {
    if (!keywordId || !listId) {
      throw new Error('Keyword ID and List ID are required')
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    const { error } = await $supabase
      .from('keyword_list_keywords')
      .upsert({
        keyword_id: keywordId,
        list_id: listId,
      }, {
        onConflict: 'keyword_id,list_id',
      })

    if (error) throw error

    // Refresh the keywords list
    await refresh()
  }

  // Remove a keyword from a list
  const removeKeywordFromList = async (keywordId: string, listId: string) => {
    if (!keywordId || !listId) {
      throw new Error('Keyword ID and List ID are required')
    }

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    const { error } = await $supabase
      .from('keyword_list_keywords')
      .delete()
      .eq('keyword_id', keywordId)
      .eq('list_id', listId)

    if (error) throw error

    // Refresh the keywords list
    await refresh()
  }

  return {
    keywords,
    pending,
    error,
    addKeywords,
    deleteKeyword,
    assignKeywordToList,
    removeKeywordFromList,
    refresh,
  }
}

