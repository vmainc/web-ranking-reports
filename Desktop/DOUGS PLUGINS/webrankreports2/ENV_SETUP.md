# Environment Variables Setup Guide

## Required Environment Variables

### Supabase Configuration
Get these from your Supabase project settings: https://supabase.com/dashboard/project/_/settings/api

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
```

### Google OAuth Configuration
Get these from Google Cloud Console: https://console.cloud.google.com/apis/credentials

1. Create an OAuth 2.0 Client ID
2. Set authorized redirect URIs:
   - **Production**: `https://your-project-ref.functions.supabase.co/google-oauth-callback`
   - **Local Dev**: `http://localhost:54321/functions/v1/google-oauth-callback`

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_BASE=https://your-project-ref.functions.supabase.co
```

### Application URL (Optional)
For OAuth redirects after successful connection:

```bash
# Local development
WEBRANKINGREPORTS_APP_URL=http://localhost:3000

# Production
WEBRANKINGREPORTS_APP_URL=https://your-app-domain.com
```

### Optional API Keys
```bash
GOOGLE_PAGESPEED_API_KEY=your-pagespeed-api-key
CLAUDE_API_KEY=your-claude-api-key
```

## Where to Set Environment Variables

### Local Development (.env file)
Create a `.env` file in the project root with all variables above.

### Supabase Edge Functions
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_BASE`
   - `WEBRANKINGREPORTS_APP_URL` (optional)

### Netlify/Vercel Deployment
Add environment variables in your hosting platform's dashboard.

## Security Notes

⚠️ **NEVER commit these to git:**
- `SUPABASE_SERVICE_ROLE_KEY` (only used in Edge Functions)
- `GOOGLE_CLIENT_SECRET` (only used in Edge Functions)
- Any access tokens or refresh tokens

✅ **Safe to expose in frontend:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_CLIENT_ID`

## Verification

After setting up, verify:
1. Supabase client connects (check browser console)
2. Edge Functions can read env vars (check function logs)
3. OAuth flow redirects correctly

