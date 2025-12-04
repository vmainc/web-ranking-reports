import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decode as base64Decode } from 'https://deno.land/std@0.177.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface StateData {
  site_id: string
  user_id: string
  timestamp: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (req.method !== 'GET') {
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const googleAdsClientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID') ?? ''
    const googleAdsClientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET') ?? ''
    const googleAdsRedirectUri = Deno.env.get('GOOGLE_ADS_REDIRECT_URI') ?? ''
    const googleAdsDeveloperToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? ''
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:3000'

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        '<html><body><h1>Error</h1><p>Server configuration error</p></body></html>',
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    if (!googleAdsClientId || !googleAdsClientSecret || !googleAdsRedirectUri) {
      console.error('Missing Google Ads OAuth environment variables')
      return new Response(
        '<html><body><h1>Error</h1><p>Google Ads OAuth not configured</p></body></html>',
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>${error}</p><p>You can close this tab.</p></body></html>`,
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    if (!code || !state) {
      return new Response(
        '<html><body><h1>Error</h1><p>Missing code or state parameter</p></body></html>',
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    // Decode state
    let stateData: StateData
    try {
      const decodedState = new TextDecoder().decode(base64Decode(state))
      stateData = JSON.parse(decodedState) as StateData
    } catch (err) {
      console.error('Failed to decode state:', err)
      return new Response(
        '<html><body><h1>Error</h1><p>Invalid state parameter</p></body></html>',
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    const { site_id, user_id } = stateData

    // Verify state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return new Response(
        '<html><body><h1>Error</h1><p>State expired. Please try again.</p></body></html>',
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify site ownership
    const { data: site, error: siteError } = await adminClient
      .from('sites')
      .select('id, user_id')
      .eq('id', site_id)
      .single()

    if (siteError || !site) {
      console.error('Site not found:', siteError)
      return new Response(
        '<html><body><h1>Error</h1><p>Site not found</p></body></html>',
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    if (site.user_id !== user_id) {
      console.error('Site ownership mismatch')
      return new Response(
        '<html><body><h1>Error</h1><p>Forbidden</p></body></html>',
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleAdsClientId,
        client_secret: googleAdsClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: googleAdsRedirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(
        '<html><body><h1>Error</h1><p>Failed to exchange authorization code for tokens</p></body></html>',
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token || !refresh_token) {
      console.error('Missing tokens in response')
      return new Response(
        '<html><body><h1>Error</h1><p>Invalid token response</p></body></html>',
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    // Get customer ID by calling Google Ads API
    let customerId = ''
    try {
      const customersResponse = await fetch(
        'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'developer-token': googleAdsDeveloperToken || '',
          },
        }
      )

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        const resourceNames = customersData.resourceNames || []
        if (resourceNames.length > 0) {
          // Extract customer ID from resource name like "customers/1234567890"
          const match = resourceNames[0].match(/customers\/(\d+)/)
          if (match) {
            customerId = match[1]
          }
        }
      }
    } catch (err) {
      console.error('Error fetching accessible customers:', err)
    }

    if (!customerId) {
      console.error('Could not determine customer ID')
      return new Response(
        '<html><body><h1>Error</h1><p>Could not determine Google Ads customer ID</p></body></html>',
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    // Calculate token expiry
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Store connection using service role client
    const { error: upsertError } = await adminClient
      .from('google_ads_connections')
      .upsert(
        {
          site_id,
          user_id,
          customer_id: customerId,
          refresh_token: refresh_token,
          access_token: access_token,
          access_token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'site_id',
        }
      )

    if (upsertError) {
      console.error('Error storing connection:', upsertError)
      return new Response(
        '<html><body><h1>Error</h1><p>Failed to store connection</p></body></html>',
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      )
    }

    // Update site_integrations
    const { error: updateError } = await adminClient
      .from('site_integrations')
      .upsert(
        {
          site_id,
          ads_connected: true,
          ads_customer_id: customerId,
          ads_updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'site_id',
        }
      )

    if (updateError) {
      console.error('Error updating site_integrations:', updateError)
      // Don't fail the whole flow, just log it
    }

    // Redirect back to frontend
    const redirectUrl = `${appBaseUrl}/sites/${site_id}/settings/integrations?ads=connected`
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      '<html><body><h1>Error</h1><p>Unexpected error occurred</p></body></html>',
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      }
    )
  }
})
