// Supabase Edge Function: Lighthouse Audit
// Calls Google PageSpeed Insights API to run Lighthouse audits
// Stores results in lighthouse_audits table
//
// Endpoint: POST /functions/v1/lighthouse-audit
// Body: { site_id: UUID, url?: string, strategy?: 'mobile' | 'desktop' }
// Returns: { audit: LighthouseAudit }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface LighthouseAuditRequest {
  site_id: string
  url?: string
  strategy?: 'mobile' | 'desktop'
}

interface LighthouseCategory {
  id?: string
  score?: number | null
  title?: string
}

interface LighthouseCategories {
  performance?: LighthouseCategory
  accessibility?: LighthouseCategory
  'best-practices'?: LighthouseCategory
  seo?: LighthouseCategory
  pwa?: LighthouseCategory
}

interface LighthouseResult {
  categories?: LighthouseCategories
}

interface PageSpeedResponse {
  lighthouseResult?: LighthouseResult
  [key: string]: unknown
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceKey)

const apiKey = Deno.env.get('GOOGLE_PAGESPEED_API_KEY')!

const isUuid = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
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
    const body = await req.json() as LighthouseAuditRequest

    if (!body.site_id || !isUuid(body.site_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid site_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const siteId = body.site_id
    const strategy = body.strategy === 'desktop' ? 'desktop' : 'mobile'

    let targetUrl = body.url

    if (!targetUrl) {
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('url')
        .eq('id', siteId)
        .single()

      if (siteError || !site || !site.url) {
        console.error('Site lookup error:', siteError)
        return new Response(
          JSON.stringify({ error: 'Site not found or has no URL' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      targetUrl = site.url as string
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google PageSpeed API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const pageSpeedUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
    pageSpeedUrl.searchParams.set('url', targetUrl)
    pageSpeedUrl.searchParams.set('strategy', strategy)
    pageSpeedUrl.searchParams.set('key', apiKey)
    
    // Request all categories - PageSpeed API v5 accepts multiple 'category' parameters
    // Each category must be added separately using append()
    const categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
    categories.forEach((cat) => {
      pageSpeedUrl.searchParams.append('category', cat)
    })
    
    console.log('PageSpeed API URL:', pageSpeedUrl.toString().replace(apiKey, 'REDACTED'))
    console.log('Requested categories:', categories.join(', '))
    console.log('Category parameters in URL:', pageSpeedUrl.searchParams.getAll('category'))

    const psResponse = await fetch(pageSpeedUrl.toString())
    if (!psResponse.ok) {
      const text = await psResponse.text()
      console.error('PageSpeed API error:', text)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Lighthouse data from PageSpeed API' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await psResponse.json() as PageSpeedResponse
    
    // Log the full response structure to debug
    console.log('PageSpeed API response keys:', Object.keys(data))
    console.log('Has lighthouseResult:', !!data.lighthouseResult)
    
    const lighthouse = data.lighthouseResult

    if (!lighthouse) {
      console.error('Missing lighthouseResult in PageSpeed response')
      console.error('Response structure:', JSON.stringify(data, null, 2).substring(0, 1000))
      return new Response(
        JSON.stringify({ error: 'Invalid Lighthouse response from PageSpeed API' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!lighthouse.categories) {
      console.error('Missing categories in lighthouseResult')
      console.error('Lighthouse keys:', Object.keys(lighthouse))
      return new Response(
        JSON.stringify({ error: 'No categories found in Lighthouse response' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const categories = lighthouse.categories

    // Log categories for debugging
    const categoryKeys = Object.keys(categories || {})
    console.log('Available category keys:', categoryKeys)
    console.log('Categories object:', JSON.stringify(categories, null, 2))
    
    // Check if we're missing categories - log the full request URL for debugging
    const requestedCategories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
    const missingCategories = requestedCategories.filter(cat => !categoryKeys.includes(cat))
    if (missingCategories.length > 0) {
      console.log('WARNING: Missing categories in API response:', missingCategories)
      console.log('This might be due to API limitations or the site not supporting all categories')
    }

    const toScore = (cat?: LighthouseCategory): number | null => {
      if (!cat) {
        return null
      }
      // Handle null scores - PageSpeed API may return null for some categories
      if (cat.score === null || cat.score === undefined) {
        return null
      }
      if (typeof cat.score !== 'number') {
        return null
      }
      // Score is 0-1, convert to 0-100
      return Math.round(cat.score * 100)
    }

    // Extract scores by iterating over categories object
    // PageSpeed API returns categories as an object with keys like 'performance', 'accessibility', etc.
    let performanceScore: number | null = null
    let accessibilityScore: number | null = null
    let bestPracticesScore: number | null = null
    let seoScore: number | null = null
    let pwaScore: number | null = null

    // Try direct property access first
    if (categories.performance) {
      performanceScore = toScore(categories.performance)
    }
    if (categories.accessibility) {
      accessibilityScore = toScore(categories.accessibility)
    }
    if (categories['best-practices']) {
      bestPracticesScore = toScore(categories['best-practices'])
    }
    if (categories.seo) {
      seoScore = toScore(categories.seo)
    }
    if (categories.pwa) {
      pwaScore = toScore(categories.pwa)
    }

    // If direct access didn't work, try iterating over the categories object
    if (!performanceScore || !accessibilityScore || !bestPracticesScore || !seoScore) {
      for (const [key, category] of Object.entries(categories)) {
        const cat = category as LighthouseCategory
        const score = toScore(cat)
        
        if (score !== null) {
          // Match by category ID or key name
          const catId = cat.id || key.toLowerCase()
          if (catId === 'performance' && !performanceScore) {
            performanceScore = score
          } else if (catId === 'accessibility' && !accessibilityScore) {
            accessibilityScore = score
          } else if ((catId === 'best-practices' || catId === 'bestpractices') && !bestPracticesScore) {
            bestPracticesScore = score
          } else if (catId === 'seo' && !seoScore) {
            seoScore = score
          } else if (catId === 'pwa' && !pwaScore) {
            pwaScore = score
          }
        }
      }
    }

    console.log('Final extracted scores:', {
      performance: performanceScore,
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      seo: seoScore,
      pwa: pwaScore,
    })

    // Extract screenshots
    const audits = lighthouse.audits || {}
    
    // Final screenshot
    const finalScreenshotAudit = audits['final-screenshot']
    const finalScreenshot = finalScreenshotAudit?.details?.data || null
    
    // Loading sequence thumbnails
    const screenshotThumbnailsAudit = audits['screenshot-thumbnails']
    const screenshotItems = screenshotThumbnailsAudit?.details?.items || []
    const loadingSequence = Array.isArray(screenshotItems)
      ? screenshotItems.map((item: any) => ({
          data: item.data || null,
          timing: typeof item.timing === 'number' ? item.timing : null
        })).filter((item: any) => item.data !== null)
      : []

    console.log('Lighthouse categories keys:', Object.keys(lighthouse.categories || {}))
    console.log('Final screenshot present:', !!finalScreenshot)
    console.log('Loading sequence count:', loadingSequence.length)

    const categoryScores: number[] = []
    if (performanceScore !== null) categoryScores.push(performanceScore)
    if (accessibilityScore !== null) categoryScores.push(accessibilityScore)
    if (bestPracticesScore !== null) categoryScores.push(bestPracticesScore)
    if (seoScore !== null) categoryScores.push(seoScore)
    if (pwaScore !== null) categoryScores.push(pwaScore)

    // Overall score defaults to performance if available, otherwise average
    const overallScore = performanceScore !== null 
      ? performanceScore 
      : (categoryScores.length > 0 
          ? Math.round(categoryScores.reduce((sum, value) => sum + value, 0) / categoryScores.length)
          : null)

    const { data: inserted, error: insertError } = await supabase
      .from('lighthouse_audits')
      .insert({
        site_id: siteId,
        url: targetUrl,
        strategy,
        overall_score: overallScore,
        performance_score: performanceScore,
        accessibility_score: accessibilityScore,
        best_practices_score: bestPracticesScore,
        seo_score: seoScore,
        pwa_score: pwaScore,
        raw_json: data,
      })
      .select('*')
      .single()

    if (insertError || !inserted) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store Lighthouse audit' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Return audit with screenshots embedded for immediate use
    return new Response(
      JSON.stringify({ 
        audit: inserted,
        screenshots: {
          final: finalScreenshot,
          loadingSequence: loadingSequence
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error in lighthouse-audit:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected error in lighthouse-audit' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
