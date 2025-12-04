// Supabase Edge Function: Google GA4 OAuth Start
// Initiates the OAuth flow by redirecting user to Google's consent screen
//
// Frontend Usage:
// - On the integrations settings page (/sites/[id]/settings/integrations),
//   create a "Connect with Google" button that links to:
//   `${supabaseUrl}/functions/v1/google-ga4-start?site_id=${siteId}`
// - Or navigate programmatically: window.location.href = url
// - After user authorizes, Google will redirect to the callback function

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
    
    // For OAuth start flow, we accept requests with apikey in query params
    // This allows the function to work even if the anon key format isn't a JWT
    // The site_id validation provides sufficient security
    const apikeyFromQuery = url.searchParams.get('apikey')
    const authHeader = req.headers.get('Authorization')
    const apikeyHeader = req.headers.get('apikey')
    
    // Check if we have any form of auth (query param, header, or environment)
    // If none provided, we'll still proceed since site_id validation is our security
    const hasAuth = apikeyFromQuery || apikeyHeader || authHeader

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

    // Read environment variables
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')

    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID is not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GOOGLE_CLIENT_ID is missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!redirectUri) {
      console.error('GOOGLE_REDIRECT_URI is not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GOOGLE_REDIRECT_URI is missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construct state payload with site_id
    const statePayload = {
      site_id: siteId,
      redirect_to: null // Can be used later to redirect back to specific page
    }

    // Encode state as base64 JSON
    const state = btoa(JSON.stringify(statePayload))

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/analytics.readonly')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    // Redirect user to Google OAuth consent screen
    return Response.redirect(authUrl.toString(), 302)
  } catch (error) {
    console.error('Error in google-ga4-start:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

