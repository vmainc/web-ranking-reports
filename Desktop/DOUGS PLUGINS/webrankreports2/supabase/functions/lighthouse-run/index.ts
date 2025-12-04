// Supabase Edge Function: Lighthouse Run
// Calls Google PageSpeed Insights API v5 to run Lighthouse audits
// Stores results in lighthouse_audits table
//
// POST /functions/v1/lighthouse-run
// Body: { site_id: UUID, strategy?: 'mobile' | 'desktop' }
// Returns: { siteId, strategy, fetchedAt, scores, metrics, screenshots }
//
// GET /functions/v1/lighthouse-run?site_id=UUID&strategy=mobile|desktop
// Returns: Latest audit for that site/strategy

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const pageSpeedApiKey = Deno.env.get('GOOGLE_PAGESPEED_API_KEY') ?? ''

if (!supabaseUrl || !supabaseServiceKey || !pageSpeedApiKey) {
  console.error('Missing required environment variables')
}

const isUuid = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
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

interface LighthouseAudit {
  [key: string]: unknown
  numericValue?: number | null
  details?: {
    data?: string
    items?: Array<{
      data?: string
      timing?: number
    }>
  }
}

interface LighthouseResult {
  categories?: LighthouseCategories
  audits?: Record<string, LighthouseAudit>
}

interface PageSpeedResponse {
  lighthouseResult?: LighthouseResult
  [key: string]: unknown
}

serve(async (req) => {
  // Handle CORS preflight - must be first
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // GET: Return latest audit
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const siteId = url.searchParams.get('site_id')
      const strategy = url.searchParams.get('strategy') || 'mobile'

      if (!siteId || !isUuid(siteId)) {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing site_id' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey)

      const { data: audit, error: queryError } = await adminClient
        .from('lighthouse_audits')
        .select('*')
        .eq('site_id', siteId)
        .eq('strategy', strategy)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (queryError) {
        console.error('Query error:', queryError)
        return new Response(
          JSON.stringify({ error: 'Failed to load audit' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      if (!audit) {
        return new Response(
          JSON.stringify({ error: 'No audit found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Extract loading sequence from JSONB
      const loadingSequence = (audit.loading_sequence as any) || []

      // Extract category audits from raw_json
      const rawJson = audit.raw_json as any
      const lighthouse = rawJson?.lighthouseResult || rawJson
      const categoriesObj = lighthouse?.categories || {}
      const audits = lighthouse?.audits || {}

      const extractCategoryAudits = (categoryKey: string) => {
        const category = categoriesObj[categoryKey]
        if (!category || !category.auditRefs) {
          return { errors: [], passed: [] }
        }

        const errors: Array<{ id: string; title: string; description: string; displayValue?: string }> = []
        const passed: Array<{ id: string; title: string; description: string; displayValue?: string }> = []

        for (const auditRef of category.auditRefs) {
          const auditId = auditRef.id
          const auditItem = audits[auditId]
          if (!auditItem) continue

          const item = {
            id: auditId,
            title: auditItem.title || auditId,
            description: auditItem.description || '',
            displayValue: auditItem.displayValue || undefined,
          }

          const score = auditItem.score
          if (score === null || (typeof score === 'number' && score < 0.9)) {
            errors.push(item)
          } else {
            passed.push(item)
          }
        }

        return { errors, passed }
      }

      const categoryAudits = {
        performance: extractCategoryAudits('performance'),
        accessibility: extractCategoryAudits('accessibility'),
        bestPractices: extractCategoryAudits('best-practices'),
        seo: extractCategoryAudits('seo'),
      }

      return new Response(
        JSON.stringify({
          siteId: audit.site_id,
          strategy: audit.strategy,
          fetchedAt: audit.created_at,
          scores: {
            overall: audit.overall_score,
            performance: audit.performance_score,
            accessibility: audit.accessibility_score,
            bestPractices: audit.best_practices_score,
            seo: audit.seo_score,
            pwa: audit.pwa_score,
          },
          metrics: {
            fcpMs: audit.fcp_ms,
            lcpMs: audit.lcp_ms,
            cls: audit.cls,
            tbtMs: audit.tbt_ms,
          },
          screenshots: {
            final: audit.final_screenshot,
            loadingSequence: loadingSequence,
          },
          categoryAudits,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // POST: Run new audit
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const body = await req.json() as { site_id: string; strategy?: 'mobile' | 'desktop' }

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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify site ownership
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: site, error: siteError } = await adminClient
      .from('sites')
      .select('url, user_id')
      .eq('id', siteId)
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

    const siteUrl = site.url as string

    if (!siteUrl) {
      return new Response(
        JSON.stringify({ error: 'Site has no URL' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Build PageSpeed API URL
    const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
    apiUrl.searchParams.set('url', siteUrl)
    apiUrl.searchParams.set('strategy', strategy)
    apiUrl.searchParams.set('key', pageSpeedApiKey)

    // Request all categories - PageSpeed API v5 requires each category as a separate parameter
    // Note: PWA category was removed from the API in October 2025
    // The API may only return categories that are available/calculated for the site
    const categories = ['performance', 'accessibility', 'best-practices', 'seo']
    categories.forEach((cat) => {
      apiUrl.searchParams.append('category', cat)
    })

    const requestUrl = apiUrl.toString()
    console.log('PageSpeed API URL (redacted):', requestUrl.replace(pageSpeedApiKey, 'REDACTED'))
    console.log('Requested categories:', categories.join(', '))
    console.log('Category parameters in URL:', apiUrl.searchParams.getAll('category'))

    // Call PageSpeed API
    const psResponse = await fetch(apiUrl.toString())
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

    // Log full response structure for debugging
    console.log('PageSpeed API response keys:', Object.keys(data))
    console.log('Has lighthouseResult:', !!data.lighthouseResult)

    const lighthouse = data.lighthouseResult

    if (!lighthouse) {
      console.error('Missing lighthouseResult in PageSpeed response')
      console.error('Response structure:', JSON.stringify(data, null, 2).substring(0, 2000))
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

    const categoriesObj = lighthouse.categories

    // Log detailed category information
    const categoryKeys = Object.keys(categoriesObj)
    console.log('Available category keys:', categoryKeys)
    console.log('Requested categories:', categories.join(', '))
    console.log('Missing categories:', categories.filter(cat => !categoryKeys.includes(cat)))
    
    // Log each category's score if available
    categoryKeys.forEach(key => {
      const cat = categoriesObj[key as keyof LighthouseCategories]
      if (cat) {
        console.log(`Category ${key}: score=${cat.score}, id=${cat.id}, title=${cat.title}`)
      }
    })

    // Extract scores - handle both direct property access and iteration
    const scoreFromCategory = (key: string): number | null => {
      // Try direct access first
      const cat = categoriesObj[key as keyof LighthouseCategories]
      if (cat && typeof cat.score === 'number') {
        return Math.round(cat.score * 100)
      }
      
      // If direct access failed, iterate over all categories to find a match
      for (const [catKey, category] of Object.entries(categoriesObj)) {
        const cat = category as LighthouseCategory
        const catId = cat.id || catKey.toLowerCase()
        if ((catId === key || catId === key.replace('-', '')) && typeof cat.score === 'number') {
          return Math.round(cat.score * 100)
        }
      }
      
      return null
    }

    const performanceScore = scoreFromCategory('performance')
    const accessibilityScore = scoreFromCategory('accessibility')
    const bestPracticesScore = scoreFromCategory('best-practices')
    const seoScore = scoreFromCategory('seo')
    const pwaScore = scoreFromCategory('pwa')

    console.log('Extracted scores:', {
      performance: performanceScore,
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      seo: seoScore,
      pwa: pwaScore,
    })

    // Overall score defaults to performance
    const overallScore = performanceScore !== null ? performanceScore : null

    // Extract metrics
    const audits = lighthouse.audits || {}
    const fcpMs = typeof audits['first-contentful-paint']?.numericValue === 'number'
      ? Math.round(audits['first-contentful-paint'].numericValue)
      : null
    const lcpMs = typeof audits['largest-contentful-paint']?.numericValue === 'number'
      ? Math.round(audits['largest-contentful-paint'].numericValue)
      : null
    const cls = typeof audits['cumulative-layout-shift']?.numericValue === 'number'
      ? audits['cumulative-layout-shift'].numericValue
      : null
    const tbtMs = typeof audits['total-blocking-time']?.numericValue === 'number'
      ? Math.round(audits['total-blocking-time'].numericValue)
      : null

    // Extract screenshots
    const finalScreenshot = audits['final-screenshot']?.details?.data ?? null
    const screenshotItems = audits['screenshot-thumbnails']?.details?.items ?? []
    const loadingSequence = Array.isArray(screenshotItems)
      ? screenshotItems
          .map((item: any) => ({
            data: item.data ?? null,
            timing: typeof item.timing === 'number' ? item.timing : null,
          }))
          .filter((item: any) => item.data)
      : []

    console.log('Final screenshot present:', !!finalScreenshot)
    console.log('Loading frames:', loadingSequence.length)

    // Extract audit details for each category
    const extractCategoryAudits = (categoryKey: string) => {
      const category = categoriesObj[categoryKey as keyof LighthouseCategories]
      if (!category || !category.auditRefs) {
        return { errors: [], passed: [] }
      }

      const errors: Array<{ id: string; title: string; description: string; displayValue?: string }> = []
      const passed: Array<{ id: string; title: string; description: string; displayValue?: string }> = []

      for (const auditRef of category.auditRefs) {
        const auditId = auditRef.id
        const audit = audits[auditId]
        if (!audit) continue

        const auditItem = {
          id: auditId,
          title: audit.title || auditId,
          description: audit.description || '',
          displayValue: audit.displayValue || undefined,
        }

        // Score of null or < 0.9 means it failed/needs improvement
        const score = audit.score
        if (score === null || (typeof score === 'number' && score < 0.9)) {
          errors.push(auditItem)
        } else {
          passed.push(auditItem)
        }
      }

      return { errors, passed }
    }

    const categoryAudits = {
      performance: extractCategoryAudits('performance'),
      accessibility: extractCategoryAudits('accessibility'),
      bestPractices: extractCategoryAudits('best-practices'),
      seo: extractCategoryAudits('seo'),
    }

    // Insert into database
    // First, try with all columns including optional metrics/screenshots
    // Use 'url' for older schemas, 'requested_url' for newer ones
    let insertData: Record<string, unknown> = {
      site_id: siteId,
      strategy,
      url: siteUrl, // Try 'url' first (original schema)
      overall_score: overallScore ?? 0, // overall_score is NOT NULL in original schema
      performance_score: performanceScore,
      accessibility_score: accessibilityScore,
      best_practices_score: bestPracticesScore,
      seo_score: seoScore,
      pwa_score: pwaScore,
      raw_json: lighthouse,
    }

    // Add optional columns if they have values
    if (fcpMs !== null && fcpMs !== undefined) {
      insertData.fcp_ms = fcpMs
    }
    if (lcpMs !== null && lcpMs !== undefined) {
      insertData.lcp_ms = lcpMs
    }
    if (cls !== null && cls !== undefined) {
      insertData.cls = cls
    }
    if (tbtMs !== null && tbtMs !== undefined) {
      insertData.tbt_ms = tbtMs
    }
    if (finalScreenshot) {
      insertData.final_screenshot = finalScreenshot
    }
    if (loadingSequence && loadingSequence.length > 0) {
      insertData.loading_sequence = loadingSequence
    }

    console.log('Inserting audit with columns:', Object.keys(insertData))

    let { data: inserted, error: insertError } = await adminClient
      .from('lighthouse_audits')
      .insert(insertData)
      .select()
      .single()

    // If insert failed due to missing columns, try again with minimal columns
    if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('column'))) {
      console.log('Retrying insert with minimal columns (missing columns detected)')
      console.log('Original error:', insertError.message)
      
      // Try with url instead of requested_url (for older schemas)
      let retryData: Record<string, unknown> = {
        site_id: siteId,
        strategy,
        overall_score: overallScore,
        performance_score: performanceScore,
        accessibility_score: accessibilityScore,
        best_practices_score: bestPracticesScore,
        seo_score: seoScore,
        pwa_score: pwaScore,
        raw_json: lighthouse,
      }

      // Use 'url' for original schema (it's the standard column name)
      retryData.url = siteUrl

      const retryResult = await adminClient
        .from('lighthouse_audits')
        .insert(retryData)
        .select()
        .single()

      if (retryResult.error) {
        console.error('Retry insert error:', retryResult.error)
        console.error('Retry error code:', retryResult.error.code)
        console.error('Retry error message:', retryResult.error.message)
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to store Lighthouse audit',
            details: retryResult.error.message,
            code: retryResult.error.code,
            hint: 'Please run the database migration. The table may be missing required columns.'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      inserted = retryResult.data
      insertError = null
      console.log('Successfully inserted with minimal columns')
    }

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store Lighthouse audit',
          details: insertError.message,
          hint: 'Please run the database migration to add missing columns'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!inserted) {
      console.error('Insert succeeded but no data returned')
      return new Response(
        JSON.stringify({ error: 'Failed to store Lighthouse audit: No data returned' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Return normalized response
    return new Response(
      JSON.stringify({
        siteId,
        strategy,
        fetchedAt: inserted.created_at,
        scores: {
          overall: overallScore,
          performance: performanceScore,
          accessibility: accessibilityScore,
          bestPractices: bestPracticesScore,
          seo: seoScore,
          pwa: pwaScore,
        },
        metrics: {
          fcpMs,
          lcpMs,
          cls,
          tbtMs,
        },
        screenshots: {
          final: finalScreenshot,
          loadingSequence,
        },
        categoryAudits,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error in lighthouse-run:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected error in lighthouse-run' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

