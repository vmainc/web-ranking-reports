// Supabase Edge Function: Admin Integrations Summary
// Returns a list of all sites and their integration statuses (GA4 / GSC / Ads)
// Only accessible to doughigson@gmail.com

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ADMIN_EMAIL = 'doughigson@gmail.com'

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
}

interface AdminIntegrationRow {
  site_id: string
  site_name: string
  site_url: string
  created_at: string | null
  ga4_connected: boolean
  gsc_connected: boolean
  ads_connected: boolean
  integrations_updated_at: string | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser()

    if (userError || !user) {
      console.error('auth.getUser error:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await adminClient
      .from('sites')
      .select(
        `
        id,
        name,
        url,
        created_at,
        site_integrations:site_integrations(
          ga4_connected,
          gsc_connected,
          ads_connected,
          updated_at
        )
      `
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Query error:', error)
      return new Response(JSON.stringify({ error: 'Failed to load integrations summary' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const rows: AdminIntegrationRow[] = (data ?? []).map((row: any) => {
      const i = Array.isArray(row.site_integrations) && row.site_integrations.length > 0
        ? row.site_integrations[0]
        : null

      return {
        site_id: row.id,
        site_name: row.name,
        site_url: row.url,
        created_at: row.created_at ?? null,
        ga4_connected: i?.ga4_connected === true,
        gsc_connected: i?.gsc_connected === true,
        ads_connected: i?.ads_connected === true,
        integrations_updated_at: i?.updated_at ?? null
      }
    })

    return new Response(JSON.stringify({ rows }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

