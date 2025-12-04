// Supabase Edge Function: Google OAuth Callback (Unified)
// Handles OAuth callback from Google after user consent
// Exchanges authorization code for tokens and stores them in site_integrations
// Updates ga4_connected, gsc_connected, and ads_connected flags to true
// Redirects user back to the app

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
  id_token?: string
}

interface StatePayload {
  site_id: string
  redirect_to: string | null
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
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectBase = Deno.env.get('GOOGLE_REDIRECT_BASE')
    const appUrl = Deno.env.get('WEBRANKINGREPORTS_APP_URL') || 'http://localhost:3000'

    if (!clientId || !clientSecret || !redirectBase) {
      return new Response(
        '<html><body><h1>Configuration Error</h1><p>OAuth credentials not configured. Please contact support.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        '<html><body><h1>Configuration Error</h1><p>Supabase credentials not configured. Please contact support.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceKey)

    // Parse query parameters from Google redirect
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle user cancellation or OAuth error
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || error
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>OAuth Cancelled</h1>
            <p>${errorDescription}</p>
            <p><a href="${appUrl}">Return to app</a></p>
          </body>
        </html>
      `
      return new Response(html, { 
        status: 400, 
        headers: { 'Content-Type': 'text/html' } 
      })
    }

    // Validate required parameters
    if (!code || !state) {
      return new Response(
        '<html><body><h1>Invalid Request</h1><p>Missing code or state parameter.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Decode and parse state
    let statePayload: StatePayload
    try {
      const decodedState = atob(state)
      statePayload = JSON.parse(decodedState) as StatePayload
    } catch (parseError) {
      return new Response(
        '<html><body><h1>Invalid State</h1><p>Could not decode state parameter.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const { site_id: siteId, redirect_to: redirectTo } = statePayload

    // Validate site_id
    if (!siteId || !isUuid(siteId)) {
      return new Response(
        '<html><body><h1>Invalid Site ID</h1><p>Invalid site_id in state parameter.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Build redirect URI (must match what was used in OAuth start)
    const redirectUri = `${redirectBase}/google-oauth-callback`

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(
        '<html><body><h1>Token Exchange Failed</h1><p>Could not exchange authorization code for tokens. Please try again.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    if (!access_token) {
      return new Response(
        '<html><body><h1>No Access Token</h1><p>Google did not return an access token. Please try again.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Ensure site_integrations row exists
    const { data: existing, error: fetchError } = await supabase
      .from('site_integrations')
      .select('id')
      .eq('site_id', siteId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching site_integrations:', fetchError)
      throw fetchError
    }

    // If row doesn't exist, create it
    if (!existing) {
      const { error: insertError } = await supabase
        .from('site_integrations')
        .insert({
          site_id: siteId,
        })

      if (insertError) {
        console.error('Error creating site_integrations:', insertError)
        throw insertError
      }
    }

    // Update site_integrations with tokens for all services
    // Since we requested combined scopes, we can share the same tokens
    const { error: updateError } = await supabase
      .from('site_integrations')
      .update({
        // GA4 tokens
        ga4_access_token: access_token,
        ga4_refresh_token: refresh_token || null,
        ga4_token_expires_at: expiresAt,
        ga4_connected: true,

        // GSC tokens
        gsc_access_token: access_token,
        gsc_refresh_token: refresh_token || null,
        gsc_token_expires_at: expiresAt,
        gsc_connected: true,

        // Ads tokens
        ads_access_token: access_token,
        ads_refresh_token: refresh_token || null,
        ads_token_expires_at: expiresAt,
        ads_connected: true,

        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)

    if (updateError) {
      console.error('Error updating site_integrations:', updateError)
      throw updateError
    }

    // Build redirect URL back to app
    const finalRedirectUrl = redirectTo || `${appUrl}/sites/${siteId}/settings/integrations?google_connected=true`

    // Redirect user back to app
    return Response.redirect(finalRedirectUrl, 302)
  } catch (error) {
    console.error('OAuth callback error:', error)
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1>OAuth Error</h1>
          <p>An error occurred during the OAuth process: ${error.message || 'Unknown error'}</p>
          <p><a href="${Deno.env.get('WEBRANKINGREPORTS_APP_URL') || 'http://localhost:3000'}">Return to app</a></p>
        </body>
      </html>
    `
    return new Response(html, { 
      status: 500, 
      headers: { 'Content-Type': 'text/html' } 
    })
  }
})
