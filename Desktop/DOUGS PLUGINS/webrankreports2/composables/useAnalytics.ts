import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'

// Date range interface
export interface DateRange {
  startDate: string
  endDate: string
}

// Normalized report interfaces
export interface NormalizedReportRow {
  dimensionValues: Record<string, string>
  metricValues: Record<string, number>
}

export interface NormalizedReport {
  reportType: string
  startDate: string
  endDate: string
  rows: NormalizedReportRow[]
}

export const useAnalytics = (siteId: MaybeRefOrGetter<string | number | null | undefined>) => {
  const config = useRuntimeConfig()

  // State for different report types
  const overview = ref<NormalizedReport | null>(null)
  const pages = ref<NormalizedReport | null>(null)
  const geo = ref<NormalizedReport | null>(null)
  const tech = ref<NormalizedReport | null>(null)
  const acquisition = ref<NormalizedReport | null>(null)
  const demographics = ref<NormalizedReport | null>(null)
  const detailReport = ref<NormalizedReport | null>(null)

  // Loading and error states
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Base function to call Edge Function
  const fetchReport = async (
    reportType: string,
    dateRange?: DateRange
  ): Promise<NormalizedReport | null> => {
    loading.value = true
    error.value = null

    try {
      const functionsBaseUrl = config.public.supabaseFunctionsUrl
      if (!functionsBaseUrl) {
        throw new Error('Supabase Functions URL not configured')
      }

      const site = toValue(siteId)
      if (!site) {
        throw new Error('Site ID is required')
      }

      const payload: any = {
        site_id: site,
        report_type: reportType,
      }

      if (dateRange) {
        payload.date_range = dateRange
      }

      const response = await fetch(`${functionsBaseUrl}/ga4-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch ${reportType} report`)
      }

      const data = await response.json()
      return data as NormalizedReport
    } catch (err: any) {
      console.error(`Error fetching ${reportType} report:`, err)
      error.value = err.message || `Unable to load ${reportType} data.`
      return null
    } finally {
      loading.value = false
    }
  }

  // Convenience methods for each report type
  const fetchOverview = async (dateRange?: DateRange): Promise<void> => {
    const data = await fetchReport('overview', dateRange)
    if (data) {
      overview.value = data
    }
  }

  const fetchPages = async (dateRange?: DateRange): Promise<void> => {
    const data = await fetchReport('pages', dateRange)
    if (data) {
      pages.value = data
    }
  }

  const fetchGeo = async (dateRange?: DateRange): Promise<void> => {
    const data = await fetchReport('geo', dateRange)
    if (data) {
      geo.value = data
    }
  }

  const fetchTech = async (dateRange?: DateRange): Promise<void> => {
    const data = await fetchReport('tech', dateRange)
    if (data) {
      tech.value = data
    }
  }

  const fetchAcquisition = async (dateRange?: DateRange): Promise<void> => {
    const data = await fetchReport('acquisition', dateRange)
    if (data) {
      acquisition.value = data
    }
  }

  const fetchDemographics = async (dateRange?: DateRange): Promise<void> => {
    const data = await fetchReport('demographics', dateRange)
    if (data) {
      demographics.value = data
    }
  }

  const fetchDetail = async (
    dimension: 'pagePath' | 'country' | 'sessionDefaultChannelGroup',
    value: string,
    dateRange?: DateRange
  ): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const functionsBaseUrl = config.public.supabaseFunctionsUrl
      if (!functionsBaseUrl) {
        throw new Error('Supabase Functions URL not configured')
      }

      const site = toValue(siteId)
      if (!site) {
        throw new Error('Site ID is required')
      }

      const payload: any = {
        site_id: site,
        report_type: 'detail',
        detail: {
          dimension,
          value,
        },
      }

      if (dateRange) {
        payload.date_range = dateRange
      }

      const response = await fetch(`${functionsBaseUrl}/ga4-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch detail report')
      }

      const data = await response.json()
      detailReport.value = data as NormalizedReport
    } catch (err: any) {
      console.error('Error fetching detail report:', err)
      error.value = err.message || 'Unable to load detail analytics.'
    } finally {
      loading.value = false
    }
  }

  return {
    overview,
    pages,
    geo,
    tech,
    acquisition,
    demographics,
    detailReport,
    loading,
    error,
    fetchOverview,
    fetchPages,
    fetchGeo,
    fetchTech,
    fetchAcquisition,
    fetchDemographics,
    fetchDetail,
  }
}

