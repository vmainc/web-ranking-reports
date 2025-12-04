// Supabase Edge Function: Google OAuth Start (Unified)
// Initiates a unified OAuth flow that grants scopes for GA4, GSC, and Ads
// Called from Nuxt frontend: /google-oauth-start?site_id=<UUID>&redirect_to=<optional URL>
// Redirects browser to Google OAuth consent screen with combined scopes

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (value: string): boolean => {
  return uuidRegex.test(value)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Read environment variables
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectBase = Deno.env.get('GOOGLE_REDIRECT_BASE')
    const appUrl = Deno.env.get('WEBRANKINGREPORTS_APP_URL') || 'http://localhost:3000'

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_CLIENT_ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!redirectBase) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_REDIRECT_BASE not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse query parameters
    const url = new URL(req.url)
    const siteId = url.searchParams.get('site_id')
    const redirectTo = url.searchParams.get('redirect_to')

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

    // Build redirect URI for callback
    const redirectUri = `${redirectBase}/google-oauth-callback`

    // Build default redirect_to if not provided
    const finalRedirectTo = redirectTo || `${appUrl}/sites/${siteId}/settings/integrations`

    // Create state payload (base64 encoded JSON)
    const statePayload = {
      site_id: siteId,
      redirect_to: finalRedirectTo,
    }
    const state = btoa(JSON.stringify(statePayload))

    // Build Google OAuth URL with combined scopes
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/adwords',
    ].join(' '))
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    // Redirect browser to Google OAuth consent screen
    return Response.redirect(authUrl.toString(), 302)
  } catch (error) {
    console.error('OAuth start error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
