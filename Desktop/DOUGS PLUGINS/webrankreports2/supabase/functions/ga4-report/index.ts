// Supabase Edge Function: GA4 Report
// Fetches Google Analytics 4 data using the GA4 Data API
// Supports multiple report types: overview, pages, geo, tech
//
// Endpoint: POST /functions/v1/ga4-report
// Body: { site_id: UUID, report_type: string, date_range?: { startDate, endDate } }
// Returns: NormalizedReport JSON

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

// Report type configuration
interface Ga4ReportConfig {
  dimensions: string[]
  metrics: string[]
}

const REPORT_CONFIGS: Record<string, Ga4ReportConfig> = {
  overview: {
    dimensions: ['date'],
    metrics: ['totalUsers', 'newUsers', 'sessions', 'screenPageViews'],
  },
  pages: {
    dimensions: ['pagePath'],
    metrics: ['screenPageViews', 'sessions', 'totalUsers', 'engagedSessions'],
  },
  geo: {
    dimensions: ['country', 'city'],
    metrics: ['totalUsers', 'sessions', 'screenPageViews'],
  },
  tech: {
    dimensions: ['deviceCategory', 'operatingSystem', 'browser'],
    metrics: ['totalUsers', 'sessions', 'screenPageViews'],
  },
  acquisition: {
    dimensions: ['sessionDefaultChannelGroup', 'sourceMedium'],
    metrics: ['sessions', 'totalUsers', 'engagedSessions'],
  },
  demographics: {
    dimensions: ['country', 'userGender', 'userAgeBracket'],
    metrics: ['totalUsers', 'sessions'],
  },
}

// Normalized report interfaces
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

// Ensure valid GA4 access token (refresh if needed)
async function ensureValidGa4AccessToken(
  supabase: any,
  siteId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: string | null
): Promise<string> {
  // Check if token is expired or expiring soon (2 minute buffer)
  const now = new Date()
  const expiryDate = expiresAt ? new Date(expiresAt) : new Date(0)
  const bufferTime = 2 * 60 * 1000 // 2 minutes

  if (expiryDate.getTime() - bufferTime <= now.getTime()) {
    // Token expired or expiring soon, refresh it
    if (!refreshToken) {
      throw new Error('GA4 access token expired and no refresh token available')
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured')
    }

    console.log('Refreshing GA4 access token...')

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`GA4 token refresh failed: ${error.error_description || error.error}`)
    }

    const tokenData = await response.json()
    const newAccessToken = tokenData.access_token

    if (!newAccessToken) {
      throw new Error('GA4 token refresh did not return an access token')
    }

    // Update token in database
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
    const { error: updateError } = await supabase
      .from('site_integrations')
      .update({
        ga4_access_token: newAccessToken,
        ga4_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)

    if (updateError) {
      console.error('Error updating GA4 token:', updateError)
      // Continue with new token even if update fails
    }

    return newAccessToken
  }

  return accessToken
}

// Format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Calculate date range (default to last 28 days)
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

// Call GA4 Data API runReport
async function fetchGa4Report(
  accessToken: string,
  propertyId: string,
  config: Ga4ReportConfig,
  startDate: string,
  endDate: string,
  dimensionFilter?: any
): Promise<any> {
  // Clean property ID (remove 'properties/' prefix if present)
  const propertyIdClean = propertyId.replace(/^properties\//, '')
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyIdClean}:runReport`

  const requestBody: any = {
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    dimensions: config.dimensions.map((name) => ({ name })),
    metrics: config.metrics.map((name) => ({ name })),
  }

  // Add dimension filter if provided (for detail reports)
  if (dimensionFilter) {
    requestBody.dimensionFilter = dimensionFilter
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(`GA4 API error: ${error.error?.message || JSON.stringify(error)}`)
  }

  return await response.json()
}

// Normalize GA4 API response to our format
function normalizeGa4Response(
  ga4Response: any,
  reportType: string,
  startDate: string,
  endDate: string
): NormalizedReport {
  const rows: NormalizedReportRow[] = []

  if (ga4Response.rows && ga4Response.rows.length > 0) {
    // Get dimension and metric names from headers
    const dimensionHeaders = ga4Response.dimensionHeaders || []
    const metricHeaders = ga4Response.metricHeaders || []

    for (const row of ga4Response.rows) {
      const dimensionValues: Record<string, string> = {}
      const metricValues: Record<string, number> = {}

      // Map dimension values
      if (row.dimensionValues) {
        for (let i = 0; i < row.dimensionValues.length; i++) {
          const header = dimensionHeaders[i]
          if (header) {
            dimensionValues[header.name] = row.dimensionValues[i].value || ''
          }
        }
      }

      // Map metric values
      if (row.metricValues) {
        for (let i = 0; i < row.metricValues.length; i++) {
          const header = metricHeaders[i]
          if (header) {
            const value = row.metricValues[i].value || '0'
            // Convert string to number
            metricValues[header.name] = parseFloat(value) || 0
          }
        }
      }

      rows.push({
        dimensionValues,
        metricValues,
      })
    }
  }

  return {
    reportType,
    startDate,
    endDate,
    rows,
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

    const { site_id, report_type, date_range } = body

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

    // Validate report_type
    if (!report_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: report_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle detail report type specially
    let config: Ga4ReportConfig
    let dimensionFilter: any = undefined

    if (report_type === 'detail') {
      const { detail } = body
      if (!detail || !detail.dimension || !detail.value) {
        return new Response(
          JSON.stringify({ error: 'Detail report requires detail.dimension and detail.value' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate dimension
      const validDimensions = ['pagePath', 'country', 'sessionDefaultChannelGroup']
      if (!validDimensions.includes(detail.dimension)) {
        return new Response(
          JSON.stringify({ error: `Invalid detail.dimension. Must be one of: ${validDimensions.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Detail reports use date dimension with time-series metrics
      config = {
        dimensions: ['date'],
        metrics: ['totalUsers', 'sessions', 'screenPageViews'],
      }

      // Build dimension filter
      dimensionFilter = {
        filter: {
          fieldName: detail.dimension,
          stringFilter: {
            matchType: 'EXACT',
            value: detail.value,
            caseSensitive: false,
          },
        },
      }
    } else {
      config = REPORT_CONFIGS[report_type]
      if (!config) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid report_type. Must be one of: ${Object.keys(REPORT_CONFIGS).join(', ')}, detail` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Load site_integrations row
    const { data: integration, error: fetchError } = await supabase
      .from('site_integrations')
      .select('ga4_property_id, ga4_access_token, ga4_refresh_token, ga4_token_expires_at, ga4_connected')
      .eq('site_id', site_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching integration:', fetchError)
      throw fetchError
    }

    if (!integration) {
      return new Response(
        JSON.stringify({ error: 'Site integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration.ga4_connected || !integration.ga4_property_id) {
      return new Response(
        JSON.stringify({ error: 'GA4 not connected for this site' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration.ga4_access_token) {
      return new Response(
        JSON.stringify({ error: 'GA4 access token not found. Please reconnect GA4.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure valid access token
    const validAccessToken = await ensureValidGa4AccessToken(
      supabase,
      site_id,
      integration.ga4_access_token,
      integration.ga4_refresh_token,
      integration.ga4_token_expires_at
    )

    // Fetch GA4 report
    const ga4Response = await fetchGa4Report(
      validAccessToken,
      integration.ga4_property_id,
      config,
      startDate,
      endDate,
      dimensionFilter
    )

    // Normalize response
    const normalizedReport = normalizeGa4Response(ga4Response, report_type, startDate, endDate)

    // Return normalized report
    return new Response(
      JSON.stringify(normalizedReport),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in ga4-report:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

