import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64Encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface StartRequest {
  site_id: string
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
    const googleAdsClientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID') ?? ''
    const googleAdsRedirectUri = Deno.env.get('GOOGLE_ADS_REDIRECT_URI') ?? ''
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:3000'

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!googleAdsClientId || !googleAdsRedirectUri) {
      console.error('Missing Google Ads OAuth environment variables')
      return new Response(
        JSON.stringify({ error: 'Google Ads OAuth not configured' }),
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

    const body: StartRequest = await req.json()
    const { site_id } = body

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

    // Create state parameter (base64 encoded JSON with site_id and user_id)
    const stateData = {
      site_id,
      user_id: user.id,
      timestamp: Date.now(),
    }
    const stateString = base64Encode(JSON.stringify(stateData))

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', googleAdsClientId)
    authUrl.searchParams.set('redirect_uri', googleAdsRedirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords')
    authUrl.searchParams.set('state', stateString)

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
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
