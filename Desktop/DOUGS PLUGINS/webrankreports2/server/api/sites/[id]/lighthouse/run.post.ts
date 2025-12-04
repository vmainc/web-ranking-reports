// Nuxt Server API Route: Lighthouse/PageSpeed Insights Audit
// This route runs a Lighthouse audit using Google PageSpeed Insights API
// Accessible at: /api/sites/[id]/lighthouse/run

export default defineEventHandler(async (event) => {
  const siteId = getRouterParam(event, 'id')

  if (!siteId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing site_id parameter'
    })
  }

  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(siteId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid site_id format. Must be a valid UUID'
    })
  }

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceRoleKey = config.supabaseServiceRoleKey
  const googlePageSpeedApiKey = config.googlePageSpeedApiKey

  if (!supabaseServiceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set'
    })
  }

  if (!googlePageSpeedApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: GOOGLE_PAGESPEED_API_KEY is not set'
    })
  }

  try {
    // Fetch site information
    const siteApiUrl = `${supabaseUrl}/rest/v1/sites?id=eq.${siteId}&select=id,name,url`
    
    const siteResponse = await fetch(siteApiUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!siteResponse.ok) {
      const errorText = await siteResponse.text()
      throw createError({
        statusCode: siteResponse.status,
        statusMessage: `Database error: ${errorText}`
      })
    }

    const sites = await siteResponse.json()
    const site = sites && sites.length > 0 ? sites[0] : null

    if (!site) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Site not found'
      })
    }

    const siteUrl = site.url

    // Run PageSpeed Insights audit (mobile and desktop)
    const categories = 'PERFORMANCE,ACCESSIBILITY,BEST_PRACTICES,SEO'
    const strategy = 'mobile' // Can be 'mobile' or 'desktop'
    
    const pageSpeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(siteUrl)}&key=${googlePageSpeedApiKey}&category=${categories}&strategy=${strategy}`

    const lighthouseResponse = await fetch(pageSpeedUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!lighthouseResponse.ok) {
      const errorText = await lighthouseResponse.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { error: { message: errorText || 'Unknown error' } }
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: `PageSpeed Insights API error: ${error.error?.message || JSON.stringify(error)}`
      })
    }

    const lighthouseData = await lighthouseResponse.json()

    // Extract scores from Lighthouse results
    const lighthouseResult = lighthouseData.lighthouseResult
    const audits = lighthouseResult?.audits || {}
    const categories_result = lighthouseResult?.categories || {}

    const scores = {
      performance: Math.round((categories_result.performance?.score || 0) * 100),
      accessibility: Math.round((categories_result.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories_result['best-practices']?.score || 0) * 100),
      seo: Math.round((categories_result.seo?.score || 0) * 100),
    }

    // Save results to database
    const auditApiUrl = `${supabaseUrl}/rest/v1/site_audits?site_id=eq.${siteId}&select=id`
    
    // Check if audit record exists
    const existingAuditResponse = await fetch(auditApiUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      }
    })

    let existingAudit = null
    if (existingAuditResponse.ok) {
      const existingAudits = await existingAuditResponse.json()
      existingAudit = existingAudits && existingAudits.length > 0 ? existingAudits[0] : null
    }

    const lighthouseDate = new Date().toISOString()
    const updateData = {
      site_id: siteId,
      lighthouse_score_performance: scores.performance,
      lighthouse_score_accessibility: scores.accessibility,
      lighthouse_score_best_practices: scores.bestPractices,
      lighthouse_score_seo: scores.seo,
      lighthouse_results: lighthouseData,
      lighthouse_status: 'completed',
      lighthouse_error: null,
      lighthouse_date: lighthouseDate,
      updated_at: lighthouseDate,
    }

    let saveResponse
    if (existingAudit) {
      // Update existing audit
      saveResponse = await fetch(`${supabaseUrl}/rest/v1/site_audits?id=eq.${existingAudit.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      })
    } else {
      // Create new audit record
      saveResponse = await fetch(`${supabaseUrl}/rest/v1/site_audits`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      })
    }

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text()
      console.error('Failed to save Lighthouse results:', errorText)
      // Don't fail the request if save fails, just log it
    }

    return {
      siteId: site.id,
      siteUrl: site.url,
      scores,
      auditDate: lighthouseDate,
      strategy: 'mobile',
      fullResults: lighthouseData
    }
  } catch (error: any) {
    // Save error state to database
    try {
      const auditApiUrl = `${supabaseUrl}/rest/v1/site_audits?site_id=eq.${siteId}&select=id`
      const existingAuditResponse = await fetch(auditApiUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
        }
      })

      let existingAudit = null
      if (existingAuditResponse.ok) {
        const existingAudits = await existingAuditResponse.json()
        existingAudit = existingAudits && existingAudits.length > 0 ? existingAudits[0] : null
      }

      const updateData = {
        site_id: siteId,
        lighthouse_status: 'failed',
        lighthouse_error: error.message || 'Unknown error',
        updated_at: new Date().toISOString(),
      }

      if (existingAudit) {
        await fetch(`${supabaseUrl}/rest/v1/site_audits?id=eq.${existingAudit.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceRoleKey,
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData)
        })
      } else {
        await fetch(`${supabaseUrl}/rest/v1/site_audits`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceRoleKey,
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData)
        })
      }
    } catch (saveError) {
      console.error('Failed to save error state:', saveError)
    }

    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    // Otherwise, wrap it
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error during Lighthouse audit'
    })
  }
})

