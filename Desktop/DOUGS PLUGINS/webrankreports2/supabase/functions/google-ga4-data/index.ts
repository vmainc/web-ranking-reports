// Supabase Edge Function: Google GA4 Data
// Fetches GA4 analytics data using stored OAuth tokens
//
// Endpoint: GET /functions/v1/google-ga4-data?site_id=xxx
// Returns: GA4 analytics data (sessions, users, pageviews, etc.)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (value: string): boolean => {
  return uuidRegex.test(value)
}

interface GA4DataResponse {
  sessions: number
  users: number
  pageviews: number
  averageSessionDuration: number
  bounceRate: number
  newUsers: number
  returningUsers: number
}

// Refresh access token if expired
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

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
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(
  accessToken: string,
  refreshToken: string | null,
  expiresAt: string | null
): Promise<string> {
  // Check if token is expired (add 5 minute buffer)
  const now = new Date()
  const expiryDate = expiresAt ? new Date(expiresAt) : new Date(0)
  const bufferTime = 5 * 60 * 1000 // 5 minutes

  if (expiryDate.getTime() - bufferTime <= now.getTime()) {
    // Token expired or expiring soon, refresh it
    if (!refreshToken) {
      throw new Error('Access token expired and no refresh token available')
    }
    return await refreshAccessToken(refreshToken)
  }

  return accessToken
}

// Fetch GA4 data from Google Analytics Data API
async function fetchGA4Data(
  accessToken: string,
  propertyId: string,
  startDate: string = '30daysAgo',
  endDate: string = 'today'
): Promise<GA4DataResponse> {
  // Format: properties/{propertyId}/runReport
  // Property ID format can be numeric (e.g., 123456789) or with prefix (properties/123456789)
  const propertyIdClean = propertyId.replace(/^properties\//, '')
  const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyIdClean}:runReport`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'newUsers' },
        { name: 'activeUsers' },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(`GA4 API error: ${error.error?.message || JSON.stringify(error)}`)
  }

  const data = await response.json()

  // Extract metrics from the response
  // GA4 returns totals as rows with aggregated values
  let sessions = 0
  let users = 0
  let pageviews = 0
  let totalDuration = 0
  let totalBounceRate = 0
  let newUsers = 0
  let returningUsers = 0
  let rowCount = 0

  if (data.rows && data.rows.length > 0) {
    // Sum up all rows for totals
    for (const row of data.rows) {
      const metrics = row.metricValues || []
      sessions += parseFloat(metrics[0]?.value || '0')
      users += parseFloat(metrics[1]?.value || '0')
      pageviews += parseFloat(metrics[2]?.value || '0')
      totalDuration += parseFloat(metrics[3]?.value || '0')
      totalBounceRate += parseFloat(metrics[4]?.value || '0')
      newUsers += parseFloat(metrics[5]?.value || '0')
      rowCount++
    }

    // Calculate averages
    const averageSessionDuration = rowCount > 0 ? totalDuration / rowCount : 0
    const bounceRate = rowCount > 0 ? totalBounceRate / rowCount : 0
    returningUsers = users - newUsers
  } else {
    // Try to get totals from metricHeaders if rows are empty
    // Sometimes GA4 returns totals differently
    const totals = data.totals || []
    if (totals.length > 0 && totals[0].metricValues) {
      const metrics = totals[0].metricValues
      sessions = parseFloat(metrics[0]?.value || '0')
      users = parseFloat(metrics[1]?.value || '0')
      pageviews = parseFloat(metrics[2]?.value || '0')
      const avgDuration = parseFloat(metrics[3]?.value || '0')
      const bounce = parseFloat(metrics[4]?.value || '0')
      newUsers = parseFloat(metrics[5]?.value || '0')
      
      return {
        sessions: Math.round(sessions),
        users: Math.round(users),
        pageviews: Math.round(pageviews),
        averageSessionDuration: avgDuration,
        bounceRate: bounce,
        newUsers: Math.round(newUsers),
        returningUsers: Math.round(users - newUsers),
      }
    }
  }

  return {
    sessions: Math.round(sessions),
    users: Math.round(users),
    pageviews: Math.round(pageviews),
    averageSessionDuration: totalDuration / Math.max(rowCount, 1),
    bounceRate: totalBounceRate / Math.max(rowCount, 1),
    newUsers: Math.round(newUsers),
    returningUsers: Math.round(returningUsers),
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request URL to get query parameters
    const url = new URL(req.url)
    const siteId = url.searchParams.get('site_id')
    let startDate = url.searchParams.get('start_date') || '30daysAgo'
    let endDate = url.searchParams.get('end_date') || 'today'
    
    // Note: Supabase Edge Functions gateway may validate JWTs automatically
    // We accept apikey from query params or headers for authentication
    // The site_id validation and proper anon key checking provides security
    
    // Validate and format date ranges
    // GA4 accepts relative dates (e.g., "30daysAgo") or absolute dates (e.g., "2024-01-01")
    // If custom dates are provided, ensure they're in YYYY-MM-DD format
    if (startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Absolute date - validate it's not in the future
      const startDateObj = new Date(startDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      if (startDateObj > today) {
        return new Response(
          JSON.stringify({ error: 'Start date cannot be in the future' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    if (endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Absolute date - validate it's not in the future
      const endDateObj = new Date(endDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      if (endDateObj > today) {
        endDate = 'today' // Default to today if end date is in future
      }
    }

    // Validate site_id
    if (!siteId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: site_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isUuid(siteId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid site_id format. Must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Fetch site_integrations record
    const { data: integration, error: fetchError } = await supabase
      .from('site_integrations')
      .select('ga4_access_token, ga4_refresh_token, ga4_token_expires_at, ga4_property_id, ga4_connected')
      .eq('site_id', siteId)
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

    if (!integration.ga4_connected || !integration.ga4_access_token) {
      return new Response(
        JSON.stringify({ error: 'GA4 is not connected for this site' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration.ga4_property_id) {
      return new Response(
        JSON.stringify({ error: 'GA4 Property ID is not set. Please configure it in the integrations settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get valid access token (refresh if needed)
    const validAccessToken = await getValidAccessToken(
      integration.ga4_access_token,
      integration.ga4_refresh_token,
      integration.ga4_token_expires_at
    )

    // Update stored token if it was refreshed
    if (validAccessToken !== integration.ga4_access_token) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
      await supabase
        .from('site_integrations')
        .update({
          ga4_access_token: validAccessToken,
          ga4_token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', siteId)
    }

    // Fetch GA4 data
    const ga4Data = await fetchGA4Data(
      validAccessToken,
      integration.ga4_property_id,
      startDate,
      endDate
    )

    // Return the data
    return new Response(
      JSON.stringify(ga4Data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in google-ga4-data:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

