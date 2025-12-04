# Google OAuth Unified Setup - Complete

## Overview

This implementation provides a **unified Google OAuth flow** that connects all Google services (GA4, Search Console, and Ads) with a single "Connect Google" button click.

## What Was Built

### PART 1: Environment Configuration ✅

- **Updated `nuxt.config.ts`**:
  - Added `supabaseFunctionsUrl` to public runtime config
  - Added `appUrl` for OAuth redirects
  - All secrets remain private (server-side only)

- **Created `ENV_SETUP.md`**:
  - Complete guide for setting environment variables
  - Instructions for local dev, Supabase Edge Functions, and deployment

### PART 2: Unified OAuth Edge Functions ✅

#### `supabase/functions/google-oauth-start/index.ts`
- Initiates OAuth flow with **combined scopes**:
  - `https://www.googleapis.com/auth/analytics.readonly` (GA4)
  - `https://www.googleapis.com/auth/webmasters.readonly` (GSC)
  - `https://www.googleapis.com/auth/adwords` (Ads)
- Accepts `site_id` and optional `redirect_to` parameters
- Encodes state as base64 JSON for secure callback handling
- Redirects browser to Google OAuth consent screen

#### `supabase/functions/google-oauth-callback/index.ts`
- Handles OAuth callback from Google
- Exchanges authorization code for tokens
- Stores tokens in `site_integrations` for all three services:
  - Sets `ga4_connected`, `gsc_connected`, `ads_connected` to `true`
  - Stores `*_access_token`, `*_refresh_token`, `*_token_expires_at` for each service
- Creates `site_integrations` row if it doesn't exist
- Redirects user back to app with success indicator

### PART 3: Nuxt Integration ✅

#### Updated `pages/sites/[id]/settings/integrations.vue`:
- **Unified "Connect Google" button** at the top:
  - Shows "Connect Google" if not all services connected
  - Shows "Reconnect Google" if all services connected
  - Single click connects all three services
- **Connection status indicator**:
  - Shows combined status of all Google services
  - Updates automatically after OAuth flow
- **Success message handling**:
  - Detects `google_connected=true` query param
  - Shows success message and refreshes integration data
- **Backward compatibility**:
  - Legacy per-service OAuth buttons still work
  - Existing manual token entry still available

### PART 4: Token Refresh Helper ✅

#### `supabase/functions/_shared/token-refresh.ts`:
- **`refreshGoogleTokenIfNeeded()`**:
  - Checks if token is expired or expiring soon (5 min buffer)
  - Refreshes token using refresh_token if needed
  - Returns valid access token and refresh status
- **`updateTokenInDatabase()`**:
  - Updates token in `site_integrations` after refresh
  - Sets new expiration time (1 hour from now)

**Usage in Edge Functions:**
```typescript
import { refreshGoogleTokenIfNeeded, updateTokenInDatabase } from '../_shared/token-refresh.ts'

const result = await refreshGoogleTokenIfNeeded(
  integration.gsc_access_token,
  integration.gsc_refresh_token,
  integration.gsc_token_expires_at,
  'gsc'
)

if (result.wasRefreshed) {
  await updateTokenInDatabase(supabase, siteId, 'gsc', result.accessToken)
}

// Use result.accessToken for API calls
```

### PART 5: Database Schema ✅

#### `site-integrations-unified-oauth.sql`:
- Ensures all token columns exist (idempotent)
- Adds columns if missing:
  - `ga4_access_token`, `ga4_refresh_token`, `ga4_token_expires_at`, `ga4_token_scope`
  - `gsc_access_token`, `gsc_refresh_token`, `gsc_token_expires_at`, `gsc_token_scope`
  - `ads_access_token`, `ads_refresh_token`, `ads_token_expires_at`, `ads_token_scope`

## Setup Instructions

### 1. Run SQL Migration
Execute `site-integrations-unified-oauth.sql` in Supabase SQL Editor to ensure all columns exist.

### 2. Set Environment Variables

**In Supabase Dashboard → Edge Functions → Secrets:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_BASE` (e.g., `https://your-project.functions.supabase.co`)
- `WEBRANKINGREPORTS_APP_URL` (optional, e.g., `http://localhost:3000`)

**In local `.env` file:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for local testing)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_BASE`
- `WEBRANKINGREPORTS_APP_URL`

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI:
   - `https://your-project-ref.functions.supabase.co/google-oauth-callback`
4. Copy Client ID and Client Secret to environment variables

### 4. Deploy Edge Functions

```bash
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback
```

## How It Works

1. **User clicks "Connect Google"** on integrations page
2. **Frontend calls** `google-oauth-start?site_id=<UUID>&redirect_to=<URL>`
3. **Edge Function redirects** browser to Google OAuth consent screen
4. **User approves** access to GA4, GSC, and Ads
5. **Google redirects** to `google-oauth-callback?code=...&state=...`
6. **Callback function**:
   - Exchanges code for tokens
   - Stores tokens in `site_integrations` for all services
   - Sets all `*_connected` flags to `true`
   - Redirects back to app with `google_connected=true`
7. **Frontend detects** success and refreshes integration status

## Security Notes

✅ **Secure:**
- Service role key only used in Edge Functions (server-side)
- Google client secret only used in Edge Functions
- RLS policies ensure users can only access their own site integrations
- State parameter is base64 encoded JSON (not encrypted, but validated)

⚠️ **Important:**
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GOOGLE_CLIENT_SECRET` in frontend
- Always validate `site_id` in Edge Functions
- Tokens are stored encrypted at rest by Supabase

## Testing

1. Navigate to `/sites/[id]/settings/integrations`
2. Click "Connect Google"
3. Approve access in Google OAuth screen
4. Verify you're redirected back with success message
5. Check that all three services show "Connected"
6. Verify tokens are stored in `site_integrations` table

## Next Steps

- Use tokens in Edge Functions (e.g., `gsc-keywords` already uses GSC tokens)
- Implement GA4 data fetching
- Implement Ads data fetching
- Add token refresh logic to other Edge Functions using the shared helper

