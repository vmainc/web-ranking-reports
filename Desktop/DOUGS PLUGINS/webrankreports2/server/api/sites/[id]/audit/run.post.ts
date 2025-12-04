// Nuxt Server API Route: Site Audit with Claude
// This route runs a site audit using Claude AI to analyze SEO, technical health, and performance
// Accessible at: /api/sites/[id]/audit/run

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
  const claudeApiKey = config.claudeApiKey

  if (!supabaseServiceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set'
    })
  }

  if (!claudeApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: CLAUDE_API_KEY is not set'
    })
  }

  // Validate API key format
  if (!claudeApiKey.startsWith('sk-ant-')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: Invalid CLAUDE_API_KEY format'
    })
  }

  try {
    // Fetch site information from Supabase
    const siteResponse = await fetch(`${supabaseUrl}/rest/v1/sites?id=eq.${siteId}&select=id,name,url`, {
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

    // Create audit prompt for Claude
    const auditPrompt = `You are an expert SEO and technical website auditor. Analyze the website "${siteUrl}" and provide a comprehensive audit report covering:

1. **Technical Health** (0-100 score):
   - Site structure and architecture
   - Broken links and redirects
   - Crawlability issues
   - Mobile responsiveness
   - Server response times
   - HTTPS and security

2. **On-Page SEO** (0-100 score):
   - Meta tags (title, description)
   - Heading structure (H1-H6)
   - Content quality and optimization
   - Internal linking
   - Image optimization
   - Schema markup

3. **Core Web Vitals** (0-100 score):
   - Largest Contentful Paint (LCP)
   - First Input Delay (FID)
   - Cumulative Layout Shift (CLS)
   - Overall loading performance

4. **Index Coverage** (0-100 score):
   - Indexability issues
   - Robots.txt and meta robots
   - Sitemap quality
   - Canonical tags
   - Duplicate content issues

Please provide a detailed audit report with:
- A score (0-100) for each category
- Key findings and issues
- Priority recommendations (High/Medium/Low)
- Actionable next steps
- An estimate of how many pages were analyzed or could be found on the site
- **IMPORTANT**: A breakdown of specific pages with errors, including the page URL and the issues found on each page

Format your response as JSON with this structure:
{
  "pagesAnalyzed": number (estimate of pages analyzed),
  "technicalHealth": {
    "score": 0-100,
    "findings": ["finding1", "finding2", ...],
    "recommendations": [{"priority": "High|Medium|Low", "action": "description"}, ...]
  },
  "onPageSeo": {
    "score": 0-100,
    "findings": ["finding1", "finding2", ...],
    "recommendations": [{"priority": "High|Medium|Low", "action": "description"}, ...]
  },
  "coreWebVitals": {
    "score": 0-100,
    "findings": ["finding1", "finding2", ...],
    "recommendations": [{"priority": "High|Medium|Low", "action": "description"}, ...]
  },
  "indexCoverage": {
    "score": 0-100,
    "findings": ["finding1", "finding2", ...],
    "recommendations": [{"priority": "High|Medium|Low", "action": "description"}, ...]
  },
  "pageIssues": [
    {
      "url": "https://example.com/page",
      "category": "technicalHealth|onPageSeo|coreWebVitals|indexCoverage",
      "issue": "Brief description of the issue",
      "priority": "High|Medium|Low",
      "details": "More detailed explanation",
      "recommendation": "What should be done to fix it"
    },
    ...
  ],
  "overallScore": 0-100,
  "summary": "Overall summary of the audit"
}

IMPORTANT: The "pageIssues" array should include at least 5-10 specific pages with their URLs and issues. Even if you cannot directly access the website, estimate common page URLs (like /, /about, /contact, /blog, etc.) and provide realistic issues for each based on common SEO problems.

Note: Since I cannot directly access the website, base your analysis on common SEO best practices and typical issues for websites. If possible, suggest tools or methods to verify specific issues.`

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Using Claude Haiku - fastest and most cost-effective model
        // Alternative options:
        // - 'claude-3-5-sonnet-20241022' (mid-range, better quality, ~10x more expensive)
        // - 'claude-3-opus-20240229' (best quality, ~60x more expensive)
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: auditPrompt
          }
        ]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { error: { message: errorText || 'Unknown error' } }
      }
      
      console.error('Claude API Error:', {
        status: claudeResponse.status,
        statusText: claudeResponse.statusText,
        error: error
      })
      
      // Return 500 for Claude API errors, not the API's status code
      const errorMessage = error.error?.message || error.error?.type || error.type || error.message || JSON.stringify(error)
      throw createError({
        statusCode: 500,
        statusMessage: `Claude API error (${claudeResponse.status}): ${errorMessage}`
      })
    }

    const claudeData = await claudeResponse.json()
    const auditContent = claudeData.content?.[0]?.text || ''

    // Try to parse JSON from Claude's response
    let auditResult
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = auditContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || auditContent.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : auditContent
      auditResult = JSON.parse(jsonString)
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
      auditResult = {
        pagesAnalyzed: 0,
        technicalHealth: { score: 0, findings: [], recommendations: [] },
        onPageSeo: { score: 0, findings: [], recommendations: [] },
        coreWebVitals: { score: 0, findings: [], recommendations: [] },
        indexCoverage: { score: 0, findings: [], recommendations: [] },
        pageIssues: [],
        overallScore: 0,
        summary: auditContent,
        rawResponse: auditContent
      }
    }

    // Ensure pageIssues exists and is an array
    if (!auditResult.pageIssues || !Array.isArray(auditResult.pageIssues)) {
      auditResult.pageIssues = []
    }

    const auditDate = new Date().toISOString()

    // Save audit result to database
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

    const updateData = {
      site_id: siteId,
      audit_results: auditResult,
      audit_score: auditResult.overallScore || 0,
      audit_status: 'completed',
      audit_error: null,
      audit_date: auditDate,
      updated_at: auditDate,
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
      console.error('Failed to save audit results:', errorText)
      // Don't fail the request if save fails, just log it
    }

    return {
      siteId: site.id,
      siteUrl: site.url,
      siteName: site.name,
      auditDate,
      ...auditResult
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

