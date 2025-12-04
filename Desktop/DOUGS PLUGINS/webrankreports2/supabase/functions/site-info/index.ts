// Supabase Edge Function: Site Info
// Calls APILayer WHOIS API to get domain information
// Endpoint: POST /functions/v1/site-info
// Body: { site_id: UUID }
// Returns: Normalized WHOIS data with domain health status

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SiteInfoRequest {
  site_id: string
}

interface Site {
  id: string
  name: string
  url: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const apilayerKey = Deno.env.get('APILAYER_WHOIS_KEY')
const supabase = createClient(supabaseUrl, serviceKey)

if (!apilayerKey) {
  console.error('APILAYER_WHOIS_KEY environment variable is not set')
}

const isUuid = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

const extractDomain = (url: string): string | null => {
  try {
    // Remove protocol
    let domain = url.replace(/^https?:\/\//, '')
    // Remove www. prefix
    domain = domain.replace(/^www\./, '')
    // Remove path, query, fragment, and port
    domain = domain.split('/')[0]
    domain = domain.split('?')[0]
    domain = domain.split('#')[0]
    domain = domain.split(':')[0]
    // Trim whitespace
    domain = domain.trim()
    if (domain.length === 0) {
      return null
    }
    return domain
  } catch {
    return null
  }
}

const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return null
    }
    return date
  } catch {
    return null
  }
}

const daysBetween = (a: Date, b: Date): number => {
  const diffTime = Math.abs(b.getTime() - a.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

type HealthStatus = 'ok' | 'warning' | 'critical'

interface NormalizedWhois {
  domain_name: string | null
  domain_registered: string | null
  create_date: string | null
  update_date: string | null
  expiry_date: string | null
  domain_registrar: string | null
  name_servers: string[]
  domain_age_days: number | null
  days_to_expiry: number | null
  health_status: HealthStatus
}

const normalizeWhois = (raw: any): NormalizedWhois => {
  const now = new Date()
  
  // APILayer returns data nested in a "result" object, so check that first
  const data = raw.result || raw
  
  // Extract domain name - try multiple field names
  const domainName = data.domain_name || data.domain || data.Domain || data.domainName || 
                     raw.domain_name || raw.domain || raw.Domain || raw.domainName || null
  
  // Extract registration status - try multiple field names
  // If status is an array, check if it contains any active status indicators
  let domainRegistered: string | null = null
  if (data.status) {
    if (Array.isArray(data.status) && data.status.length > 0) {
      domainRegistered = 'yes' // If status array exists and has items, domain is registered
    } else if (typeof data.status === 'string') {
      domainRegistered = data.status
    }
  } else {
    domainRegistered = data.domain_registered || data.Status || data.registered || data.Registered || 
                       raw.domain_registered || raw.status || raw.Status || raw.registered || raw.Registered || null
  }
  
  // Extract dates - try multiple field names and formats
  const createDate = data.creation_date || data.create_date || data.created_date || 
                     data.Creation || data.CreationDate || data.created || data.Created ||
                     raw.create_date || raw.creation_date || raw.created_date || 
                     raw.Creation || raw.CreationDate || raw.created || raw.Created || null
  const updateDate = data.updated_date || data.update_date || data.modified_date || 
                     data.Updated || data.UpdateDate || data.updated || data.Updated ||
                     raw.update_date || raw.updated_date || raw.modified_date || 
                     raw.Updated || raw.UpdateDate || raw.updated || raw.Updated || null
  const expiryDate = data.expiration_date || data.expiry_date || data.expires_date || 
                     data.Expiration || data.ExpirationDate || data.expires || data.Expires ||
                     raw.expiry_date || raw.expiration_date || raw.expires_date || 
                     raw.Expiration || raw.ExpirationDate || raw.expires || raw.Expires || null
  
  // Extract registrar - try multiple field names
  let domainRegistrar: string | null = null
  if (typeof data.registrar === 'string') {
    domainRegistrar = data.registrar
  } else if (data.registrar && typeof data.registrar === 'object') {
    domainRegistrar = data.registrar.name || data.registrar.organization || null
  } else if (typeof data.domain_registrar === 'string') {
    domainRegistrar = data.domain_registrar
  } else if (data.domain_registrar && typeof data.domain_registrar === 'object') {
    domainRegistrar = data.domain_registrar.name || data.domain_registrar.organization || null
  } else if (typeof raw.domain_registrar === 'string') {
    domainRegistrar = raw.domain_registrar
  } else if (raw.domain_registrar && typeof raw.domain_registrar === 'object') {
    domainRegistrar = raw.domain_registrar.name || raw.domain_registrar.organization || null
  } else if (raw.registrar) {
    if (typeof raw.registrar === 'string') {
      domainRegistrar = raw.registrar
    } else if (typeof raw.registrar === 'object') {
      domainRegistrar = raw.registrar.name || raw.registrar.organization || null
    }
  } else if (raw.Registrar) {
    if (typeof raw.Registrar === 'string') {
      domainRegistrar = raw.Registrar
    } else if (typeof raw.Registrar === 'object') {
      domainRegistrar = raw.Registrar.name || raw.Registrar.organization || null
    }
  } else if (raw.registrar_name) {
    domainRegistrar = raw.registrar_name
  }
  
  // Extract name servers - try multiple field names
  let nameServers: string[] = []
  if (Array.isArray(data.name_servers)) {
    nameServers = data.name_servers.filter((ns: any) => typeof ns === 'string')
  } else if (typeof data.name_servers === 'string') {
    nameServers = data.name_servers.split(',').map((ns: string) => ns.trim()).filter(Boolean)
  } else if (Array.isArray(raw.name_servers)) {
    nameServers = raw.name_servers.filter((ns: any) => typeof ns === 'string')
  } else if (typeof raw.name_servers === 'string') {
    nameServers = raw.name_servers.split(',').map((ns: string) => ns.trim()).filter(Boolean)
  } else if (Array.isArray(raw.name_servers_list)) {
    nameServers = raw.name_servers_list.filter((ns: any) => typeof ns === 'string')
  } else if (Array.isArray(raw.NameServers)) {
    nameServers = raw.NameServers.filter((ns: any) => typeof ns === 'string')
  } else if (typeof raw.NameServers === 'string') {
    nameServers = raw.NameServers.split(',').map((ns: string) => ns.trim()).filter(Boolean)
  } else if (Array.isArray(raw.nameservers)) {
    nameServers = raw.nameservers.filter((ns: any) => typeof ns === 'string')
  } else if (typeof raw.nameservers === 'string') {
    nameServers = raw.nameservers.split(',').map((ns: string) => ns.trim()).filter(Boolean)
  }
  
  // Compute domain age
  let domainAgeDays: number | null = null
  const createDateObj = parseDate(createDate)
  if (createDateObj) {
    domainAgeDays = daysBetween(createDateObj, now)
  }
  
  // Compute days to expiry
  let daysToExpiry: number | null = null
  const expiryDateObj = parseDate(expiryDate)
  if (expiryDateObj) {
    daysToExpiry = daysBetween(now, expiryDateObj)
    // If expiry is in the past, make it negative
    if (expiryDateObj < now) {
      daysToExpiry = -daysToExpiry
    }
  }
  
  // Compute health status
  let healthStatus: HealthStatus = 'ok'
  if (domainRegistered === 'no' || domainRegistered === false || daysToExpiry !== null && daysToExpiry <= 0) {
    healthStatus = 'critical'
  } else if (daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 90) {
    healthStatus = 'warning'
  }
  
  return {
    domain_name: domainName,
    domain_registered: domainRegistered ? String(domainRegistered) : null,
    create_date: createDate,
    update_date: updateDate,
    expiry_date: expiryDate,
    domain_registrar: domainRegistrar,
    name_servers: nameServers,
    domain_age_days: domainAgeDays,
    days_to_expiry: daysToExpiry,
    health_status: healthStatus,
  }
}

serve(async (req) => {
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
    let body: SiteInfoRequest
    try {
      body = await req.json() as SiteInfoRequest
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!body.site_id || !isUuid(body.site_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid site_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!apilayerKey) {
      console.error('APILAYER_WHOIS_KEY not configured')
      console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('API') || k.includes('WHOIS')))
      return new Response(
        JSON.stringify({ error: 'WHOIS API key not configured. Please set APILAYER_WHOIS_KEY secret.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    console.log('APILAYER_WHOIS_KEY is configured (length:', apilayerKey.length, ')')

    const siteId = body.site_id

    // Load site from database
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, url')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      console.error('Site lookup error:', siteError)
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const siteData = site as Site

    // Extract domain from URL
    const domain = extractDomain(siteData.url)
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Could not extract domain from site URL' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Call APILayer WHOIS API
    const whoisUrl = `https://api.apilayer.com/whois/query?domain=${encodeURIComponent(domain)}`
    
    console.log('Calling WHOIS API for domain:', domain)
    console.log('WHOIS URL:', whoisUrl)

    const whoisResponse = await fetch(whoisUrl, {
      method: 'GET',
      headers: {
        'apikey': apilayerKey,
      },
    })
    
    console.log('WHOIS API response status:', whoisResponse.status, whoisResponse.statusText)

    if (!whoisResponse.ok) {
      const errorText = await whoisResponse.text()
      console.error('WHOIS API error:', errorText)
      let errorMessage = 'Failed to fetch WHOIS data'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: whoisResponse.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let rawWhois: any
    try {
      rawWhois = await whoisResponse.json()
      console.log('WHOIS API response received (first 1000 chars):', JSON.stringify(rawWhois).substring(0, 1000))
    } catch (parseError) {
      console.error('Failed to parse WHOIS response as JSON:', parseError)
      const textResponse = await whoisResponse.text()
      console.error('Raw response text:', textResponse.substring(0, 500))
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format from WHOIS API',
          details: textResponse.substring(0, 200)
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if response is empty or has error
    if (!rawWhois || (typeof rawWhois === 'object' && Object.keys(rawWhois).length === 0)) {
      console.warn('Empty WHOIS response received')
      return new Response(
        JSON.stringify({ 
          error: 'No data returned from WHOIS API',
          details: 'The API returned an empty response'
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Normalize WHOIS data
    const normalized = normalizeWhois(rawWhois)
    
    console.log('Normalized WHOIS data:', JSON.stringify(normalized))

    // Return combined response
    return new Response(
      JSON.stringify({
        site: {
          id: siteData.id,
          name: siteData.name,
          url: siteData.url,
          domain: domain,
        },
        normalized,
        raw: rawWhois,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error in site-info:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error in site-info'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: err instanceof Error ? err.stack : String(err)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// ==================================================
// FUTURE TECH STACK INTEGRATION
// ==================================================
// In the future, we may want to add technology stack detection
// (e.g., Wappalyzer, BuiltWith, or similar services).
//
// Suggested pattern:
// 1. Add another env var: TECHSTACK_API_KEY
// 2. Make an additional HTTP request to the tech stack API using the site URL
// 3. Extend the returned JSON to include:
//    {
//      tech_stack: {
//        categories: string[],
//        technologies: Array<{
//          name: string,
//          category: string,
//          confidence: number
//        }>
//      }
//    }
//
// This would allow us to show:
// - CMS (WordPress, Drupal, etc.)
// - E-commerce platforms (Shopify, WooCommerce, etc.)
// - Analytics tools (GA4, Google Tag Manager, etc.)
// - CDN providers (Cloudflare, AWS CloudFront, etc.)
// - And more
//
// Implementation would follow a similar pattern:
// - Call the tech stack API after WHOIS succeeds
// - Normalize the response
// - Merge into the final response object
// - Handle errors gracefully (don't fail WHOIS if tech stack fails)
// ==================================================

