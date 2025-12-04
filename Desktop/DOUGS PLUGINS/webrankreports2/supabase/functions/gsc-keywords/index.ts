// Supabase Edge Function: Google Search Console Keywords
// Fetches keyword data from Google Search Console and stores it in gsc_keyword_stats
//
// Endpoint: POST /functions/v1/gsc-keywords
// Body: { site_id: UUID, date_range?: string }
// Returns: { success: boolean, totalKeywords: number, dateRangeLabel: string }

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

// Refresh access token if expired
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
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

  return await response.json()
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
    const tokenData = await refreshAccessToken(refreshToken)
    return tokenData.access_token
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

// Calculate date range for last N days
function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

// Fetch keyword data from Google Search Console
async function fetchGSCKeywords(
  accessToken: string,
  propertyUrl: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}>> {
  const apiUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/searchAnalytics/query`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 500,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(`GSC API error: ${error.error?.message || JSON.stringify(error)}`)
  }

  const data = await response.json()

  if (!data.rows || data.rows.length === 0) {
    return []
  }

  // Parse response rows
  const keywords: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }> = []

  for (const row of data.rows) {
    const query = row.keys?.[0] || ''
    if (!query) continue

    keywords.push({
      query: query.trim(),
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })
  }

  return keywords
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
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

    // Determine date range (default to last 28 days)
    const dateRangeLabel = date_range || 'last_28_days'
    let days = 28
    if (dateRangeLabel === 'last_7_days') days = 7
    else if (dateRangeLabel === 'last_14_days') days = 14
    else if (dateRangeLabel === 'last_28_days') days = 28
    else if (dateRangeLabel === 'last_90_days') days = 90

    const { startDate, endDate } = getDateRange(days)

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Fetch site_integrations record
    const { data: integration, error: fetchError } = await supabase
      .from('site_integrations')
      .select('gsc_access_token, gsc_refresh_token, gsc_token_expires_at, gsc_property_url, gsc_connected')
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

    if (!integration.gsc_connected || !integration.gsc_access_token) {
      return new Response(
        JSON.stringify({ error: 'GSC is not connected for this site' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration.gsc_property_url) {
      return new Response(
        JSON.stringify({ error: 'GSC Property URL is not set. Please configure it in the integrations settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get valid access token (refresh if needed)
    let validAccessToken = await getValidAccessToken(
      integration.gsc_access_token,
      integration.gsc_refresh_token,
      integration.gsc_token_expires_at
    )

    // Update stored token if it was refreshed
    if (validAccessToken !== integration.gsc_access_token) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
      await supabase
        .from('site_integrations')
        .update({
          gsc_access_token: validAccessToken,
          gsc_token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', site_id)
    }

    // Fetch keyword data from GSC
    const keywords = await fetchGSCKeywords(
      validAccessToken,
      integration.gsc_property_url,
      startDate,
      endDate
    )

    // Upsert keyword stats into gsc_keyword_stats
    const now = new Date().toISOString()
    let processedCount = 0

    for (const keyword of keywords) {
      const { error: upsertError } = await supabase
        .from('gsc_keyword_stats')
        .upsert({
          site_id,
          keyword_phrase: keyword.query,
          date_range_label: dateRangeLabel,
          clicks: keyword.clicks,
          impressions: keyword.impressions,
          ctr: keyword.ctr,
          avg_position: keyword.position,
          fetched_at: now,
        }, {
          onConflict: 'site_id,keyword_phrase,date_range_label',
        })

      if (upsertError) {
        console.error(`Error upserting keyword ${keyword.query}:`, upsertError)
      } else {
        processedCount++
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        totalKeywords: processedCount,
        dateRangeLabel,
        startDate,
        endDate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in gsc-keywords:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

