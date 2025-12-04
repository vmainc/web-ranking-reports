import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface KeywordResearchRequest {
  site_id: string
  keyword: string
}

interface KeywordData {
  keyword: string
  searchVolume: number | null
  competition: string | null
  cpc: number | null
}

interface KeywordResearchResponse {
  keyword: string
  searchVolume: number | null
  competition: string | null
  cpc: number | null
  relatedKeywords: KeywordData[]
  longTailKeywords: Array<{
    keyword: string
    searchVolume: number | null
    cpc: number | null
  }>
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  
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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

    // Authenticate user
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

    // Parse request body
    const body: KeywordResearchRequest = await req.json()
    const { site_id, keyword } = body
    
    console.log('Keyword research request:', { site_id, keyword })

    if (!site_id || !keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'site_id and keyword are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify site ownership
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: site, error: siteError } = await adminClient
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

    // TODO: Integrate with keyword research API
    // Options include:
    // - DataForSEO API (https://dataforseo.com/apis/keywords-data-api)
    // - SEMrush API (https://www.semrush.com/api/)
    // - Ahrefs API (https://ahrefs.com/api)
    // - Google Keyword Planner API (requires Google Ads account)
    // - Serpstat API (https://serpstat.com/api/)
    
    // For now, return a structured response with placeholder data
    // Replace this with actual API calls to your preferred service
    
    const keywordLower = keyword.trim().toLowerCase()
    
    // Mock data structure - replace with real API calls
    const response: KeywordResearchResponse = {
      keyword: keyword.trim(),
      searchVolume: Math.floor(Math.random() * 100000) + 1000, // Replace with real data
      competition: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)], // Replace with real data
      cpc: parseFloat((Math.random() * 5 + 0.5).toFixed(2)), // Replace with real data
      relatedKeywords: [
        {
          keyword: `${keywordLower} services`,
          searchVolume: Math.floor(Math.random() * 50000) + 500,
          competition: ['Low', 'Medium'][Math.floor(Math.random() * 2)],
          cpc: parseFloat((Math.random() * 4 + 0.5).toFixed(2)),
        },
        {
          keyword: `${keywordLower} tips`,
          searchVolume: Math.floor(Math.random() * 30000) + 300,
          competition: 'Low',
          cpc: parseFloat((Math.random() * 2 + 0.3).toFixed(2)),
        },
        {
          keyword: `best ${keywordLower}`,
          searchVolume: Math.floor(Math.random() * 40000) + 400,
          competition: 'Medium',
          cpc: parseFloat((Math.random() * 3 + 0.5).toFixed(2)),
        },
        {
          keyword: `how to ${keywordLower}`,
          searchVolume: Math.floor(Math.random() * 25000) + 250,
          competition: 'Low',
          cpc: parseFloat((Math.random() * 1.5 + 0.2).toFixed(2)),
        },
        {
          keyword: `${keywordLower} guide`,
          searchVolume: Math.floor(Math.random() * 20000) + 200,
          competition: 'Low',
          cpc: parseFloat((Math.random() * 1.2 + 0.2).toFixed(2)),
        },
      ],
      longTailKeywords: [
        {
          keyword: `${keywordLower} for beginners`,
          searchVolume: Math.floor(Math.random() * 5000) + 50,
          cpc: parseFloat((Math.random() * 1 + 0.1).toFixed(2)),
        },
        {
          keyword: `${keywordLower} best practices`,
          searchVolume: Math.floor(Math.random() * 3000) + 30,
          cpc: parseFloat((Math.random() * 0.8 + 0.1).toFixed(2)),
        },
        {
          keyword: `${keywordLower} examples`,
          searchVolume: Math.floor(Math.random() * 4000) + 40,
          cpc: parseFloat((Math.random() * 0.9 + 0.1).toFixed(2)),
        },
        {
          keyword: `${keywordLower} strategies`,
          searchVolume: Math.floor(Math.random() * 3500) + 35,
          cpc: parseFloat((Math.random() * 0.7 + 0.1).toFixed(2)),
        },
        {
          keyword: `${keywordLower} tools`,
          searchVolume: Math.floor(Math.random() * 6000) + 60,
          cpc: parseFloat((Math.random() * 1.2 + 0.2).toFixed(2)),
        },
        {
          keyword: `${keywordLower} software`,
          searchVolume: Math.floor(Math.random() * 4500) + 45,
          cpc: parseFloat((Math.random() * 1.1 + 0.2).toFixed(2)),
        },
      ],
    }

    console.log('Keyword research response:', {
      keyword: response.keyword,
      searchVolume: response.searchVolume,
      competition: response.competition,
      cpc: response.cpc,
      relatedCount: response.relatedKeywords.length,
      longTailCount: response.longTailKeywords.length,
    })

    return new Response(
      JSON.stringify(response),
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

