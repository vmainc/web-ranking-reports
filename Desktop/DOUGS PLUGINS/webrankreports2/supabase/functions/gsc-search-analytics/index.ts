// Supabase Edge Function: GSC Search Analytics
// Calls Google Search Console Search Analytics API
// Endpoint: POST /functions/v1/gsc-search-analytics
// Body: { site_id: UUID, startDate: string, endDate: string, dimensions: string[], rowLimit?: number }
// Returns: Normalized GSC report JSON

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GscRequestBody {
  site_id: string
  startDate: string
  endDate: string
  dimensions: string[]
  rowLimit?: number
}

interface SiteIntegration {
  site_id: string
  gsc_property_url?: string | null
  gsc_access_token?: string | null
  gsc_refresh_token?: string | null
  gsc_token_expires_at?: string | null
}

interface GscRow {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

interface GscApiResponse {
  rows?: GscRow[]
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceKey)

const isUuid = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    let body: GscRequestBody
    try {
      body = await req.json() as GscRequestBody
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!body.site_id || !isUuid(body.site_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid site_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!body.startDate || !body.endDate || !Array.isArray(body.dimensions) || body.dimensions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const siteId = body.site_id
    const startDate = body.startDate
    const endDate = body.endDate
    const dimensions = body.dimensions
    const rowLimit = body.rowLimit ?? 1000

    const { data: integration, error: integrationError } = await supabase
      .from('site_integrations')
      .select('gsc_property_url, gsc_access_token, gsc_refresh_token, gsc_token_expires_at')
      .eq('site_id', siteId)
      .single()

    if (integrationError || !integration) {
      console.error('Integration lookup error:', integrationError)
      return new Response(
        JSON.stringify({ error: 'No Search Console integration found for this site.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const siteIntegration = integration as SiteIntegration
    const propertyUrl = siteIntegration.gsc_property_url
    const accessToken = siteIntegration.gsc_access_token

    if (!propertyUrl || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Search Console not fully configured for this site.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get valid access token (refresh if needed)
    let validAccessToken = await getValidAccessToken(
      accessToken,
      siteIntegration.gsc_refresh_token || null,
      siteIntegration.gsc_token_expires_at || null
    )

    // Update stored token if it was refreshed
    if (validAccessToken !== accessToken) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
      await supabase
        .from('site_integrations')
        .update({
          gsc_access_token: validAccessToken,
          gsc_token_expires_at: expiresAt,
        })
        .eq('site_id', siteId)
    }

    // Ensure property URL is properly formatted
    let formattedPropertyUrl = propertyUrl.trim()
    // If it doesn't start with http:// or https:// or sc-domain:, assume it's a domain
    if (!formattedPropertyUrl.startsWith('http://') && 
        !formattedPropertyUrl.startsWith('https://') && 
        !formattedPropertyUrl.startsWith('sc-domain:')) {
      formattedPropertyUrl = `sc-domain:${formattedPropertyUrl}`
    }

    const apiUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(formattedPropertyUrl)}/searchAnalytics/query`

    const requestBody = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      searchType: 'WEB',
    }

    console.log('Calling GSC API:', {
      url: apiUrl,
      startDate,
      endDate,
      dimensions,
      rowLimit,
    })

    const gscResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!gscResponse.ok) {
      const text = await gscResponse.text()
      let errorMessage = 'Failed to fetch Search Console data'
      try {
        const errorData = JSON.parse(text)
        errorMessage = errorData.error?.message || errorData.error_description || errorMessage
        console.error('GSC API error response:', errorData)
      } catch {
        console.error('GSC API error (non-JSON):', text)
        errorMessage = text || errorMessage
      }
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: gscResponse.status,
          details: text.substring(0, 500)
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await gscResponse.json() as GscApiResponse

    const rows = Array.isArray(data.rows) ? data.rows : []

    return new Response(
      JSON.stringify({
        rows,
        dimensions,
        startDate,
        endDate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error in gsc-search-analytics:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error in gsc-search-analytics'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: err instanceof Error ? err.stack : String(err)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

