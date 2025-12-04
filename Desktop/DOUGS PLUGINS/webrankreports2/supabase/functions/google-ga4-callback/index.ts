// Supabase Edge Function: Google GA4 OAuth Callback
// Handles the OAuth callback from Google, exchanges code for tokens, and stores them
//
// How it works:
// 1. User authorizes on Google's consent screen
// 2. Google redirects to this function with ?code=...&state=...
// 3. Function exchanges code for access_token + refresh_token
// 4. Stores tokens in site_integrations table for the site_id from state
// 5. Sets ga4_connected = true
//
// Frontend Integration:
// - After this function completes, the user's browser is redirected to a success page
// - The integrations settings page uses useSiteIntegrations(siteId) composable
// - Calling refresh() on that composable will fetch the updated row with ga4_connected = true
// - The status chips on the dashboard and settings page will update automatically

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
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Handle Google OAuth errors
    if (error) {
      console.error('Google OAuth error:', error, errorDescription)
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Authorization Failed</h1>
    <p>Google returned an error: <strong>${error}</strong></p>
    ${errorDescription ? `<p>${errorDescription}</p>` : ''}
    <p>Please try again or contact support if this persists.</p>
  </div>
</body>
</html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Validate required parameters
    if (!code) {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Invalid Request</h1>
    <p>Missing authorization code from Google.</p>
    <p>Please try the connection process again.</p>
  </div>
</body>
</html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (!state) {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Invalid Request</h1>
    <p>Missing state parameter. The OAuth request may have been tampered with.</p>
    <p>Please try the connection process again.</p>
  </div>
</body>
</html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Decode and parse state
    let statePayload: StatePayload
    try {
      const decodedState = atob(state)
      statePayload = JSON.parse(decodedState) as StatePayload
    } catch (e) {
      console.error('Failed to decode state:', e)
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Invalid State</h1>
    <p>Could not decode state parameter. The OAuth request may have been tampered with.</p>
    <p>Please try the connection process again.</p>
  </div>
</body>
</html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Extract and validate site_id
    const siteId = statePayload.site_id
    if (!siteId || !isUuid(siteId)) {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Invalid Site ID</h1>
    <p>The site ID in the state parameter is invalid or missing.</p>
    <p>Please try the connection process again.</p>
  </div>
</body>
</html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Read environment variables
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing required Google OAuth environment variables')
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Server Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Configuration Error</h1>
    <p>The server is missing required OAuth configuration. Please contact support.</p>
  </div>
</body>
</html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing required Supabase environment variables')
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Server Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Configuration Error</h1>
    <p>The server is missing required database configuration. Please contact support.</p>
  </div>
</body>
</html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

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
        `<!DOCTYPE html>
<html>
<head>
  <title>Token Exchange Failed</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Token Exchange Failed</h1>
    <p>Could not exchange authorization code for tokens.</p>
    <p>Please try the connection process again.</p>
  </div>
</body>
</html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()

    if (!tokens.access_token) {
      console.error('Token response missing access_token:', tokens)
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Token Exchange Failed</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Token Exchange Failed</h1>
    <p>The token response from Google was invalid.</p>
    <p>Please try the connection process again.</p>
  </div>
</body>
</html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Ensure site_integrations row exists
    const { data: existing, error: fetchError } = await supabase
      .from('site_integrations')
      .select('id')
      .eq('site_id', siteId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error checking for existing site_integrations row:', fetchError)
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Database Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Database Error</h1>
    <p>Could not check for existing integration record.</p>
    <p>Please try again or contact support.</p>
  </div>
</body>
</html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Insert row if it doesn't exist
    if (!existing) {
      const { error: insertError } = await supabase
        .from('site_integrations')
        .insert({
          site_id: siteId
        })

      if (insertError) {
        console.error('Error inserting site_integrations row:', insertError)
        return new Response(
          `<!DOCTYPE html>
<html>
<head>
  <title>Database Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Database Error</h1>
    <p>Could not create integration record.</p>
    <p>Please try again or contact support.</p>
  </div>
</body>
</html>`,
          { status: 500, headers: { 'Content-Type': 'text/html' } }
        )
      }
    }

    // Update GA4 token fields
    const { error: updateError } = await supabase
      .from('site_integrations')
      .update({
        ga4_access_token: tokens.access_token,
        ga4_refresh_token: tokens.refresh_token ?? null,
        ga4_token_expires_at: expiresAt,
        ga4_token_scope: tokens.scope ?? null,
        ga4_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId)

    if (updateError) {
      console.error('Error updating site_integrations with GA4 tokens:', updateError)
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Database Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Database Error</h1>
    <p>Could not save GA4 tokens to database.</p>
    <p>Please try again or contact support.</p>
  </div>
</body>
</html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Success response - redirect back to settings page
    // The frontend will detect the success parameter and refresh useSiteIntegrations
    // If redirect_to is in state, use it; otherwise construct default settings URL
    const redirectTo = statePayload.redirect_to || null
    
    // Try to get frontend URL from env, otherwise use a default
    const frontendUrl = Deno.env.get('FRONTEND_URL') || ''
    let settingsUrl: string
    
    if (redirectTo) {
      settingsUrl = redirectTo
    } else if (frontendUrl) {
      settingsUrl = `${frontendUrl}/sites/${siteId}/settings/integrations?success=true&integration=ga4`
    } else {
      // Fallback: Show success page with message to close and return to app
      const successHtml = `<!DOCTYPE html>
<html>
<head>
  <title>GA4 Connected</title>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="3;url=/sites/${siteId}/settings/integrations">
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      background: #f9fafb;
    }
    .success {
      background: white;
      border: 1px solid #10b981;
      border-left: 4px solid #10b981;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #059669;
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 600;
    }
    p {
      color: #374151;
      margin: 8px 0;
      line-height: 1.6;
    }
    .checkmark {
      width: 48px;
      height: 48px;
      background: #d1fae5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .checkmark svg {
      width: 24px;
      height: 24px;
      color: #059669;
    }
  </style>
</head>
<body>
  <div class="success">
    <div class="checkmark">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1>Google Analytics 4 Connected Successfully!</h1>
    <p>Your GA4 account has been connected and tokens have been saved.</p>
    <p>You can close this tab and return to WebRankingReports. The connection status will update automatically.</p>
  </div>
</body>
</html>`
      
      return new Response(successHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
    
    // Redirect to frontend settings page with success flag
    return Response.redirect(settingsUrl, 302)
  } catch (error) {
    console.error('Error in google-ga4-callback:', error)
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Server Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c33; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Internal Server Error</h1>
    <p>An unexpected error occurred while processing your request.</p>
    <p>Please try again or contact support if this persists.</p>
  </div>
</body>
</html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
})

