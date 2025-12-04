# Google OAuth Setup for GA4 Integration

This guide will help you set up Google OAuth so users can easily connect their GA4 accounts.

## Prerequisites
- A Google Cloud account
- Access to your Supabase project dashboard

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing project
   - Note your project ID

3. **Enable Google Analytics Data API**
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Google Analytics Data API"
   - Click on it and press "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" (unless you have a Google Workspace account)
     - Fill in app name: "WebRankingReports" (or your app name)
     - Fill in user support email
     - Add your email to developer contact
     - Click "Save and Continue"
     - Skip scopes for now (we'll add them automatically)
     - Add test users if needed (for testing)
     - Click "Save and Continue"
     - Review and go back to dashboard

5. **Create OAuth Client ID**
   - Application type: **Web application**
   - Name: "WebRankingReports GA4 Integration"
   - **Authorized redirect URIs**: Add this EXACT URL:
     ```
     https://dwiqmfauxwbfcqlaplfy.supabase.co/functions/v1/google-ga4-callback
     ```
   - Click "Create"
   - **IMPORTANT**: Copy your:
     - **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-xxxxx`)

## Step 2: Set Supabase Edge Functions Secrets

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/dwiqmfauxwbfcqlaplfy
   - Navigate to: **Edge Functions** → **Secrets**

2. **Add the following secrets:**
   - Click "Add new secret"
   - Add each of these:

   **Secret 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: (paste your Client ID from Step 1)

   **Secret 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: (paste your Client Secret from Step 1)

   **Secret 3:**
   - Name: `GOOGLE_REDIRECT_URI`
   - Value: `https://dwiqmfauxwbfcqlaplfy.supabase.co/functions/v1/google-ga4-callback`

   **Secret 4 (optional, for better redirects):**
   - Name: `FRONTEND_URL`
   - Value: `http://localhost:3000` (for local dev) or your production URL

3. **Verify Secrets are Set**
   - Make sure all 3 secrets are listed
   - They should be visible but the values will be hidden

## Step 3: Deploy Edge Functions (if not already deployed)

The Edge Functions should already exist, but verify they're deployed:

```bash
# If you have Supabase CLI installed
supabase functions deploy google-ga4-start
supabase functions deploy google-ga4-callback
```

Or verify in Supabase Dashboard:
- Go to: Edge Functions
- Check that `google-ga4-start` and `google-ga4-callback` are listed

## Step 4: Test the OAuth Flow

1. **Go to your integrations page:**
   - Navigate to: `/sites/[your-site-id]/settings/integrations`
   - Click "Connect with Google" on the GA4 card

2. **Expected flow:**
   - You'll be redirected to Google's consent screen
   - Sign in and authorize access
   - You'll be redirected back to your app
   - Tokens will be saved automatically

## Troubleshooting

### Error: "GOOGLE_CLIENT_ID is missing"
- Make sure you've set the secrets in Supabase Dashboard → Edge Functions → Secrets
- Wait a few minutes for secrets to propagate

### Error: "redirect_uri_mismatch"
- Double-check the redirect URI in Google Cloud Console matches EXACTLY:
  `https://dwiqmfauxwbfcqlaplfy.supabase.co/functions/v1/google-ga4-callback`
- Make sure there are no trailing slashes or spaces

### Error: "Function not found"
- Make sure the Edge Functions are deployed
- Check Supabase Dashboard → Edge Functions to see if they're listed

### OAuth consent screen issues
- Make sure you've configured the OAuth consent screen
- If you're testing, add your email as a test user
- For production, you'll need to verify your app with Google

## Production Considerations

For production, you'll also need to:
1. **Update FRONTEND_URL secret** to your production domain
2. **Update redirect URI** in Google Cloud Console for your production domain (if different)
3. **Verify your app** with Google (required for public use)
4. **Add production domain** to authorized redirect URIs in Google Cloud Console

## Quick Checklist

- [ ] Created Google Cloud project
- [ ] Enabled Google Analytics Data API
- [ ] Created OAuth 2.0 credentials (Web application)
- [ ] Added redirect URI: `https://dwiqmfauxwbfcqlaplfy.supabase.co/functions/v1/google-ga4-callback`
- [ ] Set `GOOGLE_CLIENT_ID` secret in Supabase
- [ ] Set `GOOGLE_CLIENT_SECRET` secret in Supabase
- [ ] Set `GOOGLE_REDIRECT_URI` secret in Supabase
- [ ] Edge Functions are deployed
- [ ] Tested the OAuth flow

