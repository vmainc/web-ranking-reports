import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SummaryRequest {
  site_id: string
  date_range?: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS'
}

interface CampaignData {
  id: string
  name: string
  impressions: number
  clicks: number
  costMicros: number
  conversions: number
}

serve(async (req) => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const googleAdsDeveloperToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser()

    if (userError || !user) {
      console.error('auth.getUser error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const body: SummaryRequest = await req.json()
    const { site_id, date_range = 'LAST_30_DAYS' } = body

    if (!site_id) {
      return new Response(
        JSON.stringify({ error: 'site_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify site ownership
    const { data: site, error: siteError } = await authClient
      .from('sites')
      .select('id, user_id')
      .eq('id', site_id)
      .single()

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (site.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get Google Ads connection
    const { data: connection, error: connError } = await adminClient
      .from('google_ads_connections')
      .select('customer_id, refresh_token, access_token, access_token_expires_at')
      .eq('site_id', site_id)
      .single()

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Google Ads not connected for this site' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if access token needs refresh
    let accessToken = connection.access_token
    const expiresAt = connection.access_token_expires_at
      ? new Date(connection.access_token_expires_at)
      : null

    if (!accessToken || (expiresAt && expiresAt.getTime() < Date.now() + 60000)) {
      // Refresh token
      const googleAdsClientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID') ?? ''
      const googleAdsClientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET') ?? ''

      if (!googleAdsClientId || !googleAdsClientSecret) {
        return new Response(
          JSON.stringify({ error: 'OAuth not configured' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleAdsClientId,
          client_secret: googleAdsClientSecret,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text()
        console.error('Token refresh failed:', errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to refresh access token' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update stored token
      const newExpiresAt = refreshData.expires_in
        ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        : null

      await adminClient
        .from('google_ads_connections')
        .update({
          access_token: accessToken,
          access_token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', site_id)
    }

    // Call Google Ads API
    const customerId = connection.customer_id
    const query = `SELECT
  campaign.id,
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions
FROM campaign
WHERE segments.date DURING ${date_range}
ORDER BY metrics.impressions DESC
LIMIT 100`

    const apiResponse = await fetch(
      `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': googleAdsDeveloperToken || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
        }),
      }
    )

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error('Google Ads API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google Ads data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse stream response
    const reader = apiResponse.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const campaigns: CampaignData[] = []

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const result = JSON.parse(line)
              if (result.results && result.results.length > 0) {
                for (const row of result.results) {
                  const campaign = row.campaign
                  const metrics = row.metrics
                  if (campaign && metrics) {
                    campaigns.push({
                      id: String(campaign.id || ''),
                      name: campaign.name || '',
                      impressions: Number(metrics.impressions || 0),
                      clicks: Number(metrics.clicks || 0),
                      costMicros: Number(metrics.costMicros || 0),
                      conversions: Number(metrics.conversions || 0),
                    })
                  }
                }
              }
            } catch (err) {
              // Skip invalid JSON lines
              continue
            }
          }
        }
      }
    }

    // Calculate totals
    const totals = campaigns.reduce(
      (acc, campaign) => ({
        impressions: acc.impressions + campaign.impressions,
        clicks: acc.clicks + campaign.clicks,
        costMicros: acc.costMicros + campaign.costMicros,
        conversions: acc.conversions + campaign.conversions,
      }),
      { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 }
    )

    return new Response(
      JSON.stringify({
        siteId: site_id,
        customerId: customerId,
        dateRange: date_range,
        totals,
        campaigns,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

