import { ref, computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useRuntimeConfig, useNuxtApp } from '#app'

export interface GscRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscReport {
  rows: GscRow[]
  dimensions: string[]
  startDate: string
  endDate: string
}

export interface DateRange {
  startDate: string
  endDate: string
}

export const useSearchConsole = (siteId: MaybeRefOrGetter<string>) => {
  const overview = ref<GscReport | null>(null)
  const queries = ref<GscReport | null>(null)
  const pages = ref<GscReport | null>(null)
  const countries = ref<GscReport | null>(null)
  const devices = ref<GscReport | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)

  const runtimeConfig = useRuntimeConfig()
  const functionsBaseUrl = runtimeConfig.public.supabaseFunctionsUrl as string

  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase
  const config = useRuntimeConfig()
  const anonKey = config.public.supabaseAnonKey as string

  const callGsc = async (dimensions: string[], dateRange: DateRange, rowLimit = 1000): Promise<GscReport> => {
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

    const response = await fetch(`${functionsBaseUrl}/gsc-search-analytics`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        site_id: site,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions,
        rowLimit,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      const errorMessage = errorData.error || errorData.details || 'Failed to fetch Search Console data.'
      console.error('GSC Edge Function error:', errorData)
      throw new Error(errorMessage)
    }

    const data = await response.json() as { rows: any[]; dimensions: string[]; startDate: string; endDate: string }

    const rows: GscRow[] = (data.rows || []).map((row: any) => ({
      keys: Array.isArray(row.keys) ? row.keys : [],
      clicks: typeof row.clicks === 'number' ? row.clicks : 0,
      impressions: typeof row.impressions === 'number' ? row.impressions : 0,
      ctr: typeof row.ctr === 'number' ? row.ctr : 0,
      position: typeof row.position === 'number' ? row.position : 0,
    }))

    return {
      rows,
      dimensions: data.dimensions || dimensions,
      startDate: data.startDate,
      endDate: data.endDate,
    }
  }

  const fetchOverview = async (dateRange: DateRange) => {
    loading.value = true
    error.value = null

    try {
      const report = await callGsc(['date'], dateRange, 1000)
      overview.value = report
    } catch (err: any) {
      console.error('Error fetching overview:', err)
      error.value = err.message || 'Unable to load Search Console overview.'
    } finally {
      loading.value = false
    }
  }

  const fetchQueries = async (dateRange: DateRange) => {
    try {
      const report = await callGsc(['query'], dateRange, 1000)
      queries.value = report
    } catch (err: any) {
      console.error('Error fetching queries:', err)
      error.value = err.message || 'Unable to load queries report.'
    }
  }

  const fetchPages = async (dateRange: DateRange) => {
    try {
      const report = await callGsc(['page'], dateRange, 1000)
      pages.value = report
    } catch (err: any) {
      console.error('Error fetching pages:', err)
      error.value = err.message || 'Unable to load pages report.'
    }
  }

  const fetchCountries = async (dateRange: DateRange) => {
    try {
      const report = await callGsc(['country'], dateRange, 250)
      countries.value = report
    } catch (err: any) {
      console.error('Error fetching countries:', err)
      error.value = err.message || 'Unable to load countries report.'
    }
  }

  const fetchDevices = async (dateRange: DateRange) => {
    try {
      const report = await callGsc(['device'], dateRange, 250)
      devices.value = report
    } catch (err: any) {
      console.error('Error fetching devices:', err)
      error.value = err.message || 'Unable to load devices report.'
    }
  }

  const totalClicks = computed(() => {
    if (!overview.value || overview.value.rows.length === 0) return 0
    return overview.value.rows.reduce((sum, row) => sum + row.clicks, 0)
  })

  const totalImpressions = computed(() => {
    if (!overview.value || overview.value.rows.length === 0) return 0
    return overview.value.rows.reduce((sum, row) => sum + row.impressions, 0)
  })

  const averageCtr = computed(() => {
    if (!overview.value || overview.value.rows.length === 0) return 0
    const totalImp = totalImpressions.value
    if (totalImp === 0) return 0
    return (totalClicks.value / totalImp) * 100
  })

  const averagePosition = computed(() => {
    if (!overview.value || overview.value.rows.length === 0) return 0
    let weightedSum = 0
    let totalImp = 0
    overview.value.rows.forEach((row) => {
      weightedSum += row.position * row.impressions
      totalImp += row.impressions
    })
    if (totalImp === 0) return 0
    return weightedSum / totalImp
  })

  return {
    overview,
    queries,
    pages,
    countries,
    devices,
    loading,
    error,
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
    fetchOverview,
    fetchQueries,
    fetchPages,
    fetchCountries,
    fetchDevices,
  }
}

