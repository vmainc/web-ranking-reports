// Nuxt Server API Route: Auto-run audits after site creation
// This route runs both Claude audit and Lighthouse audit for a new site
// Accessible at: /api/sites/[id]/audit/auto

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

  try {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const supabaseServiceRoleKey = config.supabaseServiceRoleKey
    
    // Mark audits as running in database
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

    const now = new Date().toISOString()
    const initialData = {
      site_id: siteId,
      audit_status: 'running',
      lighthouse_status: 'running',
      updated_at: now,
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
        body: JSON.stringify(initialData)
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
        body: JSON.stringify(initialData)
      })
    }

    // Run both audits in parallel (don't wait, let them run in background)
    // We'll trigger them but not wait for results to avoid long response times
    
    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const auditUrl = `${baseUrl}/api/sites/${siteId}/audit/run`
    const lighthouseUrl = `${baseUrl}/api/sites/${siteId}/lighthouse/run`

    // Trigger both audits (fire and forget)
    Promise.all([
      fetch(auditUrl, { method: 'POST' }).catch(err => console.error('Audit error:', err)),
      fetch(lighthouseUrl, { method: 'POST' }).catch(err => console.error('Lighthouse error:', err))
    ]).catch(err => console.error('Failed to trigger audits:', err))

    // Return immediately to avoid blocking
    return {
      success: true,
      message: 'Audits started in background',
      siteId
    }
  } catch (error: any) {
    // Don't fail site creation if audits fail
    console.error('Error triggering auto-audits:', error)
    return {
      success: false,
      message: 'Audits failed to start, but site was created',
      error: error.message,
      siteId
    }
  }
})

