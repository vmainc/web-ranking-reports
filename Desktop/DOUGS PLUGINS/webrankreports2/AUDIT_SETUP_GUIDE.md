# Site Audit & Lighthouse Setup Guide

## Overview
When a new site is added, both a **Claude Site Audit** and **Google Lighthouse/PageSpeed Insights** audit automatically run in the background. Results are stored in the database and displayed on the audit page. Users can rerun audits manually when needed.

## Setup Steps

### 1. Create Database Table
Run the SQL schema to create the `site_audits` table:

```sql
-- Execute supabase-audit-schema.sql in Supabase SQL Editor
```

This creates:
- `site_audits` table with columns for both audit and Lighthouse results
- RLS policies ensuring users can only see their own audits
- Indexes for performance

### 2. Add Environment Variables

Add to your `.env` file:

```bash
# Google PageSpeed Insights API Key
GOOGLE_PAGESPEED_API_KEY=AIzaSyBWKef4pfJaGU3TkgeEElqGF6G6B7WR1Kw
```

**To get a Google API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "PageSpeed Insights API"
4. Go to APIs & Services -> Credentials
5. Create API Key or use existing one

### 3. Update .env.example (Optional)
Add the Google API key to your `.env.example` file for documentation:
```
GOOGLE_PAGESPEED_API_KEY=your-google-pagespeed-api-key-here
```

## How It Works

### Automatic Audits on Site Creation
1. User creates a new site via `/sites` page
2. Site is saved to database
3. `handleAddSite` automatically calls `/api/sites/[id]/audit/auto`
4. Auto route triggers both audits in background (non-blocking)
5. Results are saved to `site_audits` table when complete

### Manual Audit Reruns
- Users can click "Rerun Site Audit" to trigger new Claude audit
- Users can click "Rerun Lighthouse" to trigger new PageSpeed Insights audit
- New results replace old ones in the database

### Loading Stored Results
- On page load, `/api/sites/[id]/audit/get` fetches latest stored results
- Results are displayed immediately (no waiting for new audits)
- If no results exist, buttons show "Run" instead of "Rerun"

## API Routes

### `/api/sites/[id]/audit/run` (POST)
- Runs Claude AI site audit
- Saves results to `site_audits.audit_results`
- Returns audit data with scores and page issues

### `/api/sites/[id]/lighthouse/run` (POST)
- Runs Google PageSpeed Insights audit
- Extracts Performance, Accessibility, Best Practices, SEO scores
- Saves results to `site_audits` table
- Returns scores and full Lighthouse data

### `/api/sites/[id]/audit/get` (GET)
- Fetches latest stored audit and Lighthouse results
- Returns both if available, or null if none exist
- Used on page load to display cached results

### `/api/sites/[id]/audit/auto` (POST)
- Triggered automatically after site creation
- Marks audits as "running" in database
- Starts both audits in background (non-blocking)
- Returns immediately to avoid blocking site creation

## Database Schema

The `site_audits` table stores:

**Claude Audit:**
- `audit_results` (JSONB) - Full audit data with scores, findings, recommendations
- `audit_score` (INTEGER) - Overall score 0-100
- `audit_status` (TEXT) - pending, running, completed, failed
- `audit_date` (TIMESTAMPTZ)

**Lighthouse:**
- `lighthouse_score_performance` (INTEGER) - 0-100
- `lighthouse_score_accessibility` (INTEGER) - 0-100
- `lighthouse_score_best_practices` (INTEGER) - 0-100
- `lighthouse_score_seo` (INTEGER) - 0-100
- `lighthouse_results` (JSONB) - Full Lighthouse data
- `lighthouse_status` (TEXT) - pending, running, completed, failed
- `lighthouse_date` (TIMESTAMPTZ)

## UI Features

### Audit Page (`/sites/[id]/audit`)
- **Loads stored results** on page load (fast)
- **Run Audit** button - Triggers new Claude audit
- **Run Lighthouse** button - Triggers new PageSpeed Insights audit
- **Lighthouse Scores** card - Shows 4 scores with color coding
- **Audit Summary** - Shows overall score and pages analyzed
- **Page Issues** - Detailed breakdown by page and category
- **Category Filters** - Filter issues by type

## Troubleshooting

### Audits not running automatically
- Check that `/api/sites/[id]/audit/auto` is being called after site creation
- Check server logs for errors
- Verify API keys are set in `.env`

### Lighthouse failing
- Verify `GOOGLE_PAGESPEED_API_KEY` is set correctly
- Check that PageSpeed Insights API is enabled in Google Cloud
- Ensure API key has proper permissions

### Results not saving
- Check database connection
- Verify `site_audits` table exists
- Check RLS policies allow inserts/updates

## Next Steps

1. Run the SQL schema in Supabase
2. Add `GOOGLE_PAGESPEED_API_KEY` to `.env`
3. Restart dev server
4. Create a new site to test automatic audits
5. Check `/sites/[id]/audit` page to see results

