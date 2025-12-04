import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DiscoverRequest {
  site_id: string
  url: string
}

interface Competitor {
  domain: string
  tech?: Record<string, any>
  discovered_from: 'gsc' | 'wappalyzer' | 'serp'
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
    const wappalyzerApiKey = Deno.env.get('WAPPALYZER_API_KEY') ?? ''
    const serpApiKey = Deno.env.get('SERP_API_KEY') ?? ''

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

    const body: DiscoverRequest = await req.json()
    const { site_id, url } = body

    if (!site_id || !url) {
      return new Response(
        JSON.stringify({ error: 'site_id and url are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: site, error: siteError } = await adminClient
      .from('sites')
      .select('id, user_id, url')
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

    const competitors: Competitor[] = []
    const discoveredDomains = new Set<string>()

    // Extract domain from URL
    const targetDomain = new URL(url).hostname.replace(/^www\./, '')

    // 1. Wappalyzer - Get tech stack and similar sites
    if (wappalyzerApiKey) {
      try {
        const wappalyzerUrl = `https://api.wappalyzer.com/v2/lookup?urls=${encodeURIComponent(url)}`
        const wappalyzerResponse = await fetch(wappalyzerUrl, {
          headers: {
            'X-Api-Key': wappalyzerApiKey,
          },
        })

        if (wappalyzerResponse.ok) {
          const wappalyzerData = await wappalyzerResponse.json()
          if (wappalyzerData && wappalyzerData.length > 0) {
            const tech = wappalyzerData[0].technologies || []
            
            // Store tech stack for the target site
            // For now, we'll discover competitors from SERP
            console.log('Wappalyzer tech stack retrieved:', tech.length, 'technologies')
          }
        }
      } catch (err) {
        console.error('Wappalyzer error:', err)
      }
    }

    // 2. SERP API - Find competitors ranking for similar keywords
    if (serpApiKey) {
      try {
        // Search for the domain to find competitors
        const serpUrl = `https://api.serpapi.com/search?engine=google&q=${encodeURIComponent(targetDomain)}&api_key=${serpApiKey}&num=20`
        const serpResponse = await fetch(serpUrl)

        if (serpResponse.ok) {
          const serpData = await serpResponse.json()
          const organicResults = serpData.organic_results || []

          for (const result of organicResults) {
            try {
              const resultUrl = result.link || ''
              const resultDomain = new URL(resultUrl).hostname.replace(/^www\./, '')
              
              if (resultDomain !== targetDomain && !discoveredDomains.has(resultDomain)) {
                discoveredDomains.add(resultDomain)
                competitors.push({
                  domain: resultDomain,
                  discovered_from: 'serp',
                })
              }
            } catch (err) {
              // Skip invalid URLs
              continue
            }
          }
        }
      } catch (err) {
        console.error('SERP API error:', err)
      }
    }

    // 3. GSC - Get competing domains (if GSC is connected)
    // This would require GSC API integration - for now, we'll skip if not available
    // TODO: Add GSC API integration when available

    // 4. Mock data if no API keys available (for testing)
    if (competitors.length === 0 && !serpApiKey && !wappalyzerApiKey) {
      console.log('No API keys available, using mock competitor data')
      // Generate some mock competitors based on the target domain
      const domainParts = targetDomain.split('.')
      const baseDomain = domainParts[0]
      
      const mockCompetitors = [
        { domain: `${baseDomain}-competitor.com`, discovered_from: 'serp' as const },
        { domain: `best${baseDomain}.com`, discovered_from: 'serp' as const },
        { domain: `${baseDomain}pro.com`, discovered_from: 'serp' as const },
        { domain: `top${baseDomain}.net`, discovered_from: 'serp' as const },
        { domain: `${baseDomain}hub.com`, discovered_from: 'serp' as const },
      ]
      
      for (const mock of mockCompetitors) {
        if (!discoveredDomains.has(mock.domain)) {
          discoveredDomains.add(mock.domain)
          competitors.push(mock)
        }
      }
    }

    // Store competitors in database
    const storedCompetitors = []
    for (const competitor of competitors) {
      const { data: existing } = await adminClient
        .from('competitors')
        .select('id')
        .eq('site_id', site_id)
        .eq('domain', competitor.domain)
        .single()

      if (!existing) {
        const { data: inserted, error: insertError } = await adminClient
          .from('competitors')
          .insert({
            site_id,
            domain: competitor.domain,
            tech: competitor.tech || {},
            discovered_from: competitor.discovered_from,
          })
          .select('id, domain, discovered_from, created_at')
          .single()

        if (!insertError && inserted) {
          storedCompetitors.push(inserted)
        }
      } else {
        // Update existing competitor
        const { data: updated } = await adminClient
          .from('competitors')
          .update({
            tech: competitor.tech || {},
            discovered_from: competitor.discovered_from,
          })
          .eq('id', existing.id)
          .select('id, domain, discovered_from, created_at')
          .single()

        if (updated) {
          storedCompetitors.push(updated)
        }
      }
    }

    return new Response(
      JSON.stringify({
        competitors: storedCompetitors,
        count: storedCompetitors.length,
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
