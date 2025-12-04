// Nuxt Server API Route: GA4 Data Proxy
// This route proxies requests to the Supabase Edge Function with proper authentication
// Accessible at: /api/sites/[id]/ga4-data

export default defineEventHandler(async (event) => {
  const siteId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const startDate = (query.start_date as string) || '30daysAgo'
  const endDate = (query.end_date as string) || 'today'

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
    // Fetch site_integrations record using Supabase REST API directly
    // This avoids module resolution issues with @supabase/supabase-js in Nitro
    const supabaseApiUrl = `${supabaseUrl}/rest/v1/site_integrations?site_id=eq.${siteId}&select=ga4_access_token,ga4_refresh_token,ga4_token_expires_at,ga4_property_id,ga4_connected`
    
    const dbResponse = await fetch(supabaseApiUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    })

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text()
      throw createError({
        statusCode: dbResponse.status,
        statusMessage: `Database error: ${errorText}`
      })
    }

    const integrations = await dbResponse.json()
    const integration = integrations && integrations.length > 0 ? integrations[0] : null

    if (!integration) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Site integration not found'
      })
    }

    // Check if GA4 is properly connected (both flag and token must be present)
    if (!integration.ga4_connected || !integration.ga4_access_token) {
      // If flag is true but token is missing, suggest reconnecting
      if (integration.ga4_connected && !integration.ga4_access_token) {
        throw createError({
          statusCode: 400,
          statusMessage: 'GA4 connection status is set, but access token is missing. Please reconnect GA4 through the integrations settings page.'
        })
      }
      // Otherwise, GA4 is not connected
      throw createError({
        statusCode: 400,
        statusMessage: 'GA4 is not connected for this site. Please connect GA4 through the integrations settings page.'
      })
    }

    if (!integration.ga4_property_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'GA4 Property ID is not set. Please configure it in the integrations settings.'
      })
    }

    // Check if token needs refresh
    const now = new Date()
    const expiryDate = integration.ga4_token_expires_at ? new Date(integration.ga4_token_expires_at) : new Date(0)
    const bufferTime = 5 * 60 * 1000 // 5 minutes

    let accessToken = integration.ga4_access_token

    if (expiryDate.getTime() - bufferTime <= now.getTime()) {
      // Token expired or expiring soon, refresh it
      if (!integration.ga4_refresh_token) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Access token expired and no refresh token available'
        })
      }

      const clientId = config.googleClientId
      const clientSecret = config.googleClientSecret

      if (!clientId || !clientSecret) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Google OAuth credentials not configured'
        })
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.ga4_refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
      })

      if (!refreshResponse.ok) {
        const error = await refreshResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw createError({
          statusCode: 401,
          statusMessage: `Token refresh failed: ${error.error_description || error.error}`
        })
      }

      const tokenData = await refreshResponse.json()
      accessToken = tokenData.access_token

      // Update stored token using Supabase REST API
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const updateUrl = `${supabaseUrl}/rest/v1/site_integrations?site_id=eq.${siteId}`
      
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ga4_access_token: accessToken,
          ga4_token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
      })
    }

    // Fetch GA4 data from Google Analytics Data API
    const propertyIdClean = integration.ga4_property_id.replace(/^properties\//, '')
    const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyIdClean}:runReport`

    const ga4Response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'newUsers' },
          { name: 'activeUsers' },
        ],
      }),
    })

    if (!ga4Response.ok) {
      const error = await ga4Response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw createError({
        statusCode: ga4Response.status,
        statusMessage: `GA4 API error: ${error.error?.message || JSON.stringify(error)}`
      })
    }

    const ga4Data = await ga4Response.json()

    // Extract metrics from the response
    let sessions = 0
    let users = 0
    let pageviews = 0
    let totalDuration = 0
    let totalBounceRate = 0
    let newUsers = 0
    let rowCount = 0

    if (ga4Data.rows && ga4Data.rows.length > 0) {
      for (const row of ga4Data.rows) {
        const metrics = row.metricValues || []
        sessions += parseFloat(metrics[0]?.value || '0')
        users += parseFloat(metrics[1]?.value || '0')
        pageviews += parseFloat(metrics[2]?.value || '0')
        totalDuration += parseFloat(metrics[3]?.value || '0')
        totalBounceRate += parseFloat(metrics[4]?.value || '0')
        newUsers += parseFloat(metrics[5]?.value || '0')
        rowCount++
      }
    } else if (ga4Data.totals && ga4Data.totals.length > 0 && ga4Data.totals[0].metricValues) {
      const metrics = ga4Data.totals[0].metricValues
      sessions = parseFloat(metrics[0]?.value || '0')
      users = parseFloat(metrics[1]?.value || '0')
      pageviews = parseFloat(metrics[2]?.value || '0')
      totalDuration = parseFloat(metrics[3]?.value || '0')
      totalBounceRate = parseFloat(metrics[4]?.value || '0')
      newUsers = parseFloat(metrics[5]?.value || '0')
      rowCount = 1
    }

    return {
      sessions: Math.round(sessions),
      users: Math.round(users),
      pageviews: Math.round(pageviews),
      averageSessionDuration: rowCount > 0 ? totalDuration / rowCount : 0,
      bounceRate: rowCount > 0 ? totalBounceRate / rowCount : 0,
      newUsers: Math.round(newUsers),
      returningUsers: Math.round(users - newUsers),
    }
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    // Otherwise, wrap it
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

