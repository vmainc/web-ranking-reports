// Nuxt Server API Route: Get stored audit results
// This route fetches the latest audit and Lighthouse results from the database
// Accessible at: /api/sites/[id]/audit/get

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

  if (!supabaseServiceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set'
    })
  }

  try {
    // Fetch latest audit results
    const auditApiUrl = `${supabaseUrl}/rest/v1/site_audits?site_id=eq.${siteId}&select=*&order=created_at.desc&limit=1`
    
    const auditResponse = await fetch(auditApiUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!auditResponse.ok) {
      const errorText = await auditResponse.text()
      throw createError({
        statusCode: auditResponse.status,
        statusMessage: `Database error: ${errorText}`
      })
    }

    const audits = await auditResponse.json()
    const audit = audits && audits.length > 0 ? audits[0] : null

    if (!audit) {
      // No audit results yet
      return {
        hasAudit: false,
        hasLighthouse: false,
        audit: null,
        lighthouse: null
      }
    }

    // Format response
    const response: any = {
      hasAudit: audit.audit_status === 'completed' && audit.audit_results !== null,
      hasLighthouse: audit.lighthouse_status === 'completed' && audit.lighthouse_results !== null,
      audit: null,
      lighthouse: null
    }

    if (response.hasAudit) {
      response.audit = {
        results: audit.audit_results,
        score: audit.audit_score,
        date: audit.audit_date,
        status: audit.audit_status
      }
    }

    if (response.hasLighthouse) {
      response.lighthouse = {
        scores: {
          performance: audit.lighthouse_score_performance,
          accessibility: audit.lighthouse_score_accessibility,
          bestPractices: audit.lighthouse_score_best_practices,
          seo: audit.lighthouse_score_seo
        },
        results: audit.lighthouse_results,
        date: audit.lighthouse_date,
        status: audit.lighthouse_status
      }
    }

    return response
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    // Otherwise, wrap it
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error fetching audit results'
    })
  }
})

