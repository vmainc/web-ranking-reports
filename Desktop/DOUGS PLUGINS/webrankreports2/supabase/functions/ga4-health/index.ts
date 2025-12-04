// Supabase Edge Function: GA4 Health
// Computes Analytics Health Score based on GA4 data
// Endpoint: POST /functions/v1/ga4-health
// Body: { site_id: UUID, date_range?: { startDate, endDate } }
// Returns: Health snapshot JSON

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (value: string): boolean => {
  return uuidRegex.test(value)
}

// Interfaces
interface NormalizedReportRow {
  dimensionValues: Record<string, string>
  metricValues: Record<string, number>
}

interface NormalizedReport {
  reportType: string
  startDate: string
  endDate: string
  rows: NormalizedReportRow[]
}

interface HealthMessage {
  type: string
  message: string
}

// Format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get default date range (last 28 days)
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

// Call ga4-report Edge Function
async function fetchGa4Report(
  functionsBaseUrl: string,
  siteId: string,
  reportType: string,
  startDate: string,
  endDate: string
): Promise<NormalizedReport | null> {
  try {
    const response = await fetch(`${functionsBaseUrl}/ga4-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_id: siteId,
        report_type: reportType,
        date_range: {
          startDate,
          endDate,
        },
      }),
    })

    if (!response.ok) {
      console.error(`Failed to fetch ${reportType} report:`, response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${reportType} report:`, error)
    return null
  }
}

// Compute Tracking Score (0-100)
function computeTrackingScore(
  overview: NormalizedReport | null,
  pages: NormalizedReport | null
): { score: number; alerts: HealthMessage[]; warnings: HealthMessage[] } {
  const alerts: HealthMessage[] = []
  const warnings: HealthMessage[] = []
  let score = 100

  if (!overview || !overview.rows || overview.rows.length === 0) {
    alerts.push({
      type: 'no_data',
      message: 'No traffic recorded in the selected period.',
    })
    return { score: 0, alerts, warnings }
  }

  const totalUsers = overview.rows.reduce(
    (sum, row) => sum + (row.metricValues.totalUsers || 0),
    0
  )
  const totalSessions = overview.rows.reduce(
    (sum, row) => sum + (row.metricValues.sessions || 0),
    0
  )

  if (totalUsers === 0) {
    alerts.push({
      type: 'zero_users',
      message: 'GA4 appears to be misconfigured (zero users).',
    })
    score = 0
  } else if (totalUsers < 10) {
    warnings.push({
      type: 'low_users',
      message: 'Very low user count detected. Verify tracking is working correctly.',
    })
    score -= 30
  }

  if (totalSessions === 0) {
    alerts.push({
      type: 'zero_sessions',
      message: 'No sessions recorded. Check GA4 configuration.',
    })
    score = Math.min(score, 20)
  }

  if (overview.rows.length === 1) {
    warnings.push({
      type: 'single_date',
      message: 'Only one day of data available. Health score may be less accurate.',
    })
    score -= 10
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    alerts,
    warnings,
  }
}

// Compute Traffic Score (0-100)
function computeTrafficScore(
  overview: NormalizedReport | null,
  acquisition: NormalizedReport | null
): { score: number; warnings: HealthMessage[]; insights: HealthMessage[] } {
  const warnings: HealthMessage[] = []
  const insights: HealthMessage[] = []
  let score = 80

  if (!overview || !overview.rows || overview.rows.length === 0) {
    return { score: 0, warnings, insights }
  }

  const totalUsers = overview.rows.reduce(
    (sum, row) => sum + (row.metricValues.totalUsers || 0),
    0
  )
  const totalSessions = overview.rows.reduce(
    (sum, row) => sum + (row.metricValues.sessions || 0),
    0
  )

  if (totalSessions > 0 && totalUsers > 0) {
    const sessionsPerUser = totalSessions / totalUsers
    if (sessionsPerUser < 1.2) {
      warnings.push({
        type: 'low_engagement',
        message: 'Low session frequency per user. Consider improving engagement.',
      })
      score -= 15
    } else if (sessionsPerUser > 2.5) {
      insights.push({
        type: 'high_engagement',
        message: 'Good user engagement with multiple sessions per user.',
      })
      score += 10
    }
  }

  // Check channel diversity
  if (acquisition && acquisition.rows && acquisition.rows.length > 0) {
    const totalAcqSessions = acquisition.rows.reduce(
      (sum, row) => sum + (row.metricValues.sessions || 0),
      0
    )

    if (totalAcqSessions > 0) {
      const topChannel = acquisition.rows.reduce((max, row) => {
        const sessions = row.metricValues.sessions || 0
        return sessions > (max.metricValues.sessions || 0) ? row : max
      }, acquisition.rows[0])

      const topChannelSessions = topChannel.metricValues.sessions || 0
      const topChannelPercent = (topChannelSessions / totalAcqSessions) * 100

      if (topChannelPercent > 70) {
        warnings.push({
          type: 'channel_concentration',
          message: `Traffic heavily concentrated in one channel (${topChannel.dimensionValues.sessionDefaultChannelGroup || 'unknown'}).`,
        })
        score -= 20
      } else if (topChannelPercent < 40) {
        insights.push({
          type: 'channel_diversity',
          message: 'Good channel diversity across traffic sources.',
        })
        score += 10
      }
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
    insights,
  }
}

// Compute Content Score (0-100)
function computeContentScore(
  pages: NormalizedReport | null
): { score: number; warnings: HealthMessage[]; insights: HealthMessage[] } {
  const warnings: HealthMessage[] = []
  const insights: HealthMessage[] = []
  let score = 70

  if (!pages || !pages.rows || pages.rows.length === 0) {
    warnings.push({
      type: 'no_pages',
      message: 'No page data available.',
    })
    return { score: 40, warnings, insights }
  }

  const pageCount = pages.rows.length
  const totalPageViews = pages.rows.reduce(
    (sum, row) => sum + (row.metricValues.screenPageViews || 0),
    0
  )

  if (pageCount < 5) {
    warnings.push({
      type: 'few_pages',
      message: 'Very few pages have any traffic.',
    })
    score -= 20
  } else {
    insights.push({
      type: 'good_page_count',
      message: `Good content coverage with ${pageCount} pages receiving traffic.`,
    })
    score += 10
  }

  if (totalPageViews > 0 && pageCount > 0) {
    // Check if top pages dominate
    const sortedPages = [...pages.rows].sort(
      (a, b) => (b.metricValues.screenPageViews || 0) - (a.metricValues.screenPageViews || 0)
    )
    const top3Views = sortedPages
      .slice(0, 3)
      .reduce((sum, row) => sum + (row.metricValues.screenPageViews || 0), 0)
    const top3Percent = (top3Views / totalPageViews) * 100

    if (top3Percent > 90) {
      warnings.push({
        type: 'page_concentration',
        message: 'Top 3 pages account for over 90% of page views.',
      })
      score -= 15
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
    insights,
  }
}

// Compute UX Score (0-100)
function computeUxScore(
  tech: NormalizedReport | null,
  overview: NormalizedReport | null
): { score: number; warnings: HealthMessage[]; insights: HealthMessage[] } {
  const warnings: HealthMessage[] = []
  const insights: HealthMessage[] = []
  let score = 80

  if (!tech || !tech.rows || tech.rows.length === 0) {
    return { score: 60, warnings, insights }
  }

  const totalUsers = overview
    ? overview.rows.reduce((sum, row) => sum + (row.metricValues.totalUsers || 0), 0)
    : 0

  // Find mobile and desktop rows
  const mobileRow = tech.rows.find(
    (row) => row.dimensionValues.deviceCategory?.toLowerCase() === 'mobile'
  )
  const desktopRow = tech.rows.find(
    (row) => row.dimensionValues.deviceCategory?.toLowerCase() === 'desktop'
  )

  if (mobileRow && desktopRow && totalUsers > 0) {
    const mobileUsers = mobileRow.metricValues.totalUsers || 0
    const desktopUsers = desktopRow.metricValues.totalUsers || 0
    const mobilePercent = (mobileUsers / totalUsers) * 100

    if (mobilePercent < 30) {
      warnings.push({
        type: 'low_mobile',
        message: 'Low mobile traffic. Consider optimizing for mobile users.',
      })
      score -= 15
    } else if (mobilePercent > 60) {
      insights.push({
        type: 'mobile_dominant',
        message: 'Mobile-first traffic pattern detected.',
      })
    }

    // Check engagement by device
    const mobileSessions = mobileRow.metricValues.sessions || 0
    const desktopSessions = desktopRow.metricValues.sessions || 0
    const mobilePageViews = mobileRow.metricValues.screenPageViews || 0
    const desktopPageViews = desktopRow.metricValues.screenPageViews || 0

    if (mobileSessions > 0 && desktopSessions > 0) {
      const mobilePagesPerSession = mobilePageViews / mobileSessions
      const desktopPagesPerSession = desktopPageViews / desktopSessions

      if (mobilePagesPerSession < desktopPagesPerSession * 0.7) {
        warnings.push({
          type: 'mobile_performance',
          message: 'Mobile performance may be poor (lower pages per session than desktop).',
        })
        score -= 20
      }
    }
  } else if (!mobileRow && totalUsers > 0) {
    warnings.push({
      type: 'no_mobile_data',
      message: 'No mobile traffic detected. Verify mobile tracking.',
    })
    score -= 10
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
    insights,
  }
}

// Compute Audience Score (0-100)
function computeAudienceScore(
  geo: NormalizedReport | null
): { score: number; warnings: HealthMessage[]; insights: HealthMessage[] } {
  const warnings: HealthMessage[] = []
  const insights: HealthMessage[] = []
  let score = 80

  if (!geo || !geo.rows || geo.rows.length === 0) {
    warnings.push({
      type: 'no_geo_data',
      message: 'No geographic data available.',
    })
    return { score: 40, warnings, insights }
  }

  const totalSessions = geo.rows.reduce(
    (sum, row) => sum + (row.metricValues.sessions || 0),
    0
  )

  if (totalSessions === 0) {
    return { score: 40, warnings, insights }
  }

  // Check country diversity
  const countryCount = new Set(geo.rows.map((row) => row.dimensionValues.country)).size

  if (countryCount === 1) {
    const topCountry = geo.rows[0].dimensionValues.country
    insights.push({
      type: 'single_country',
      message: `Traffic primarily from ${topCountry || 'one country'}. This may be expected for local businesses.`,
    })
    // Don't penalize for single country - this is often normal
  } else if (countryCount > 10) {
    insights.push({
      type: 'global_reach',
      message: `Good global reach with traffic from ${countryCount} countries.`,
    })
    score += 10
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
    insights,
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { site_id, date_range } = body

    // Validate site_id
    if (!site_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: site_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isUuid(site_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid site_id format. Must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine date range
    let startDate: string
    let endDate: string

    if (date_range && date_range.startDate && date_range.endDate) {
      startDate = date_range.startDate
      endDate = date_range.endDate
    } else {
      const defaultRange = getDefaultDateRange()
      startDate = defaultRange.startDate
      endDate = defaultRange.endDate
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Get functions base URL
    const functionsBaseUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co')

    // Fetch GA4 reports
    const [overview, pages, geo, tech, acquisition] = await Promise.all([
      fetchGa4Report(functionsBaseUrl, site_id, 'overview', startDate, endDate),
      fetchGa4Report(functionsBaseUrl, site_id, 'pages', startDate, endDate),
      fetchGa4Report(functionsBaseUrl, site_id, 'geo', startDate, endDate),
      fetchGa4Report(functionsBaseUrl, site_id, 'tech', startDate, endDate),
      fetchGa4Report(functionsBaseUrl, site_id, 'acquisition', startDate, endDate).catch(() => null),
    ])

    // Compute scores
    const trackingResult = computeTrackingScore(overview, pages)
    const trafficResult = computeTrafficScore(overview, acquisition)
    const contentResult = computeContentScore(pages)
    const uxResult = computeUxScore(tech, overview)
    const audienceResult = computeAudienceScore(geo)

    // Combine all alerts, warnings, insights
    const allAlerts: HealthMessage[] = [...trackingResult.alerts]
    const allWarnings: HealthMessage[] = [
      ...trackingResult.warnings,
      ...trafficResult.warnings,
      ...contentResult.warnings,
      ...uxResult.warnings,
      ...audienceResult.warnings,
    ]
    const allInsights: HealthMessage[] = [
      ...trafficResult.insights,
      ...contentResult.insights,
      ...uxResult.insights,
      ...audienceResult.insights,
    ]

    // Compute overall score (weighted average)
    const overallScore = Math.round(
      trackingResult.score * 0.35 +
      trafficResult.score * 0.20 +
      contentResult.score * 0.20 +
      uxResult.score * 0.15 +
      audienceResult.score * 0.10
    )

    // Insert snapshot into database
    const { data: snapshot, error: insertError } = await supabase
      .from('analytics_health')
      .insert({
        site_id: site_id,
        overall_score: overallScore,
        tracking_score: trackingResult.score,
        traffic_score: trafficResult.score,
        content_score: contentResult.score,
        ux_score: uxResult.score,
        audience_score: audienceResult.score,
        critical_alerts: allAlerts,
        warnings: allWarnings,
        insights: allInsights,
        period_start: startDate,
        period_end: endDate,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Error inserting health snapshot:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save health snapshot', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return snapshot
    return new Response(
      JSON.stringify({ snapshot }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in ga4-health:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

