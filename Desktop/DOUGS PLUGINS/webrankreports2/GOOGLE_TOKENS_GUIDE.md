# Google Tokens Setup Guide

## Where to Store Google OAuth Tokens

### Option 1: Manual Token Entry (Current)

1. Navigate to: `/sites/[id]/settings/integrations`
2. Expand "Manually Add Tokens" section for each integration
3. Paste your:
   - **Access Token** (e.g., `ya29.xxx...`)
   - **Refresh Token** (optional, e.g., `1//xxx...`)
4. Click "Save Tokens"
5. Tokens are stored in the `site_integrations` table

### Option 2: OAuth Flow (Future - Edge Functions Ready)

The Supabase Edge Functions are set up and ready:

**Functions Created:**
- `supabase/functions/google-oauth-start/index.ts` - Initiates OAuth flow
- `supabase/functions/google-oauth-callback/index.ts` - Handles callback and stores tokens

**Environment Variables Needed (in Supabase Dashboard):**
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
- `SUPABASE_URL` - Already set
- `SUPABASE_SERVICE_ROLE_KEY` - Already set (for admin access)

## Database Columns for Tokens

Tokens are stored in the `site_integrations` table:

**GA4:**
- `ga4_access_token` - OAuth access token
- `ga4_refresh_token` - OAuth refresh token
- `ga4_token_expires_at` - Token expiration timestamp
- `ga4_token_scope` - Token permissions

**Search Console:**
- `gsc_access_token`
- `gsc_refresh_token`
- `gsc_token_expires_at`
- `gsc_token_scope`

**Google Ads:**
- `ads_access_token`
- `ads_refresh_token`
- `ads_token_expires_at`
- `ads_token_scope`

## How Tokens Work

1. **Access Token**: Short-lived (typically 1 hour), used to make API calls
2. **Refresh Token**: Long-lived, used to get new access tokens when they expire
3. **Expiration**: Access tokens expire, refresh tokens can be used to get new ones
4. **Connection Status**: The `*_connected` boolean is set to `true` when tokens exist

## Security Notes

- Tokens are protected by Row Level Security (RLS)
- Users can only access tokens for sites they own
- Tokens are stored in password-masked input fields
- Never expose tokens in the frontend (use server-side API calls)

## Next Steps

1. Run the migration SQL: `site-integrations-tokens-migration.sql` in Supabase
2. Add tokens manually via the settings page, OR
3. Deploy the Edge Functions and set up OAuth redirects

