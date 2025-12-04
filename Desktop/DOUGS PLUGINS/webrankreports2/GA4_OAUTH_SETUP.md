# GA4 OAuth Setup Guide

## Overview

This guide explains how to set up Google Analytics 4 (GA4) OAuth flow using Supabase Edge Functions.

## Prerequisites

1. Google Cloud Console project with OAuth 2.0 credentials
2. Supabase project with Edge Functions enabled
3. `site_integrations` table created (run `site-integrations-setup.sql` and `site-integrations-tokens-migration.sql`)

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "Google Analytics Reporting API" and "Google Analytics Data API"
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Add Authorized redirect URIs:
   - Production: `https://<your-supabase-project>.supabase.co/functions/v1/google-ga4-callback`
   - Local (if testing): `http://localhost:54321/functions/v1/google-ga4-callback`
7. Copy your Client ID and Client Secret

## Step 2: Configure Supabase Environment Variables

In your Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following environment variables:

   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret  
   - `GOOGLE_REDIRECT_URI` - Full callback URL:
     - `https://<your-project-id>.supabase.co/functions/v1/google-ga4-callback`

3. Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set (these are usually set automatically)

## Step 3: Deploy Edge Functions

If using Supabase CLI:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref <your-project-ref>

# Deploy functions
supabase functions deploy google-ga4-start
supabase functions deploy google-ga4-callback
```

Or deploy via Supabase Dashboard:
- Upload the function files directly in the Edge Functions section

## Step 4: How It Works

### OAuth Flow

1. **User clicks "Connect with Google"** on `/sites/[id]/settings/integrations`
   - Frontend calls: `https://<project>.supabase.co/functions/v1/google-ga4-start?site_id=<UUID>`

2. **google-ga4-start function:**
   - Validates `site_id` (must be a valid UUID)
   - Encodes `site_id` in base64 state parameter
   - Redirects to Google OAuth consent screen

3. **User authorizes on Google:**
   - Google redirects to: `https://<project>.supabase.co/functions/v1/google-ga4-callback?code=...&state=...`

4. **google-ga4-callback function:**
   - Extracts `code` and `state` from query params
   - Decodes `state` to get `site_id`
   - Exchanges `code` for `access_token` + `refresh_token`
   - Stores tokens in `site_integrations` table
   - Sets `ga4_connected = true`
   - Shows success page to user

5. **Frontend updates:**
   - User returns to settings page
   - `useSiteIntegrations(siteId)` composable refreshes
   - Status chips update to show "Connected"

## Step 5: Testing

1. Navigate to: `/sites/[id]/settings/integrations`
2. Click "Connect with Google" button
3. Authorize on Google's consent screen
4. You'll be redirected back with a success message
5. Return to the settings page - status should show "Connected"

## Troubleshooting

### Function not found (404)
- Make sure functions are deployed to Supabase
- Check the function names match exactly: `google-ga4-start` and `google-ga4-callback`

### Invalid redirect_uri
- Ensure the redirect URI in Google Console exactly matches `GOOGLE_REDIRECT_URI` env var
- Check for trailing slashes or protocol mismatches

### Token exchange fails
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Make sure APIs are enabled in Google Cloud Console
- Check function logs in Supabase Dashboard

### Database errors
- Ensure `site_integrations` table exists
- Verify RLS policies are configured correctly
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

## Manual Token Entry

If OAuth isn't working yet, you can still manually add tokens:

1. Go to `/sites/[id]/settings/integrations`
2. Expand "Manually Add Tokens" for GA4
3. Paste your access token and refresh token
4. Click "Save Tokens"
5. Connection status will update

## Security Notes

- Edge Functions use service role key to bypass RLS (server-side only)
- Tokens are stored securely in the database
- RLS ensures users can only access tokens for their own sites
- Never expose tokens in the frontend - always use server-side API calls

