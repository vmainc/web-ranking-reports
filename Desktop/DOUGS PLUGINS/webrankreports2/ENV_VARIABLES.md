# Environment Variables Setup Guide

## Required Environment Variables

Copy these to your `.env` file in the project root for local development:

```env
# Supabase Configuration
# Get these from your Supabase project settings -> API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Google OAuth Configuration
# Get these from Google Cloud Console -> Credentials -> OAuth 2.0 Client ID
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Google OAuth Redirect URI
# This must match exactly what you set in Google Cloud Console
# Format: https://your-project-id.supabase.co/functions/v1/google-ga4-callback
GOOGLE_REDIRECT_URI=https://your-project-id.supabase.co/functions/v1/google-ga4-callback

# Frontend URL (optional, for OAuth redirects)
# Used for redirecting back to your app after OAuth callback
# Local: http://localhost:3000
# Production: https://your-app-domain.com
FRONTEND_URL=http://localhost:3000

# Supabase Service Role Key (for Edge Functions only)
# Get this from Supabase project settings -> API -> service_role key
# Note: This is automatically available in Edge Functions environment
# Only needed if testing Edge Functions locally
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## For Supabase Edge Functions

These variables need to be set in **Supabase Dashboard**:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add each variable:

   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
   - `FRONTEND_URL` (optional)

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

## For Netlify Deployment (if using Netlify)

Set these in **Netlify Dashboard** → **Site Settings** → **Environment Variables**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_CLIENT_ID` (if needed by frontend)
- `GOOGLE_CLIENT_SECRET` (if needed by frontend)
- `FRONTEND_URL`

## Quick Setup Steps

1. **Copy the template above** to a `.env` file in your project root
2. **Fill in your actual values**:
   - Get Supabase values from: Dashboard → Settings → API
   - Get Google values from: Google Cloud Console → Credentials
3. **Never commit `.env` to git** (already in `.gitignore`)

