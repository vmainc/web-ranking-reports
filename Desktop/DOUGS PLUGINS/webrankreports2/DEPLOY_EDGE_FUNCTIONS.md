# Deploy Edge Functions to Supabase

Your project reference: `dwiqmfauxwbfcqlaplfy`

## Step 1: Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication.

## Step 2: Deploy the Edge Functions

Once logged in, deploy both functions:

```bash
# Deploy google-ga4-start function
supabase functions deploy google-ga4-start --project-ref dwiqmfauxwbfcqlaplfy

# Deploy google-ga4-callback function  
supabase functions deploy google-ga4-callback --project-ref dwiqmfauxwbfcqlaplfy
```

## Step 3: Set Environment Variables (Secrets)

After deploying, you MUST set the environment variables in Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/dwiqmfauxwbfcqlaplfy/settings/functions
2. Click on "Secrets" tab
3. Add these secrets:
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
   - `GOOGLE_REDIRECT_URI` - Must be: `https://dwiqmfauxwbfcqlaplfy.supabase.co/functions/v1/google-ga4-callback`
   - `FRONTEND_URL` - Your frontend URL (e.g., `http://localhost:3000` for local dev)

## Alternative: Deploy via Supabase Dashboard

If you prefer using the dashboard:
1. Go to: https://supabase.com/dashboard/project/dwiqmfauxwbfcqlaplfy/functions
2. Click "Create a new function"
3. Upload the function code from `supabase/functions/google-ga4-start/index.ts` and `supabase/functions/google-ga4-callback/index.ts`

## Verify Deployment

After deployment, test the function:
```
https://dwiqmfauxwbfcqlaplfy.supabase.co/functions/v1/google-ga4-start?site_id=YOUR_SITE_ID
```

You should get redirected to Google OAuth (not a 404 error).

