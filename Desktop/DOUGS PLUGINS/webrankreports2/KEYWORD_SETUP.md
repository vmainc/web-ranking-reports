# Keyword Research Feature Setup Guide

## Issues and Solutions

### 1. Database Tables Missing (404 errors)

The keyword tables don't exist yet. You need to run the SQL schema.

**Solution:**

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Open the file `keyword-schema.sql` 
4. Copy and paste the entire SQL into the SQL Editor
5. Click "Run" to execute

This will create:
- `keyword_lists` table
- `keywords` table  
- `keyword_list_keywords` join table
- `gsc_keyword_stats` table
- All necessary RLS policies

### 2. Edge Function Not Deployed (CORS error)

The `gsc-keywords` Edge Function needs to be deployed.

**Solution:**

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy gsc-keywords
```

If you don't have Supabase CLI:

1. Open your Supabase Dashboard
2. Go to Edge Functions
3. Click "Create a new function"
4. Name it `gsc-keywords`
5. Copy the contents of `supabase/functions/gsc-keywords/index.ts`
6. Paste into the function editor
7. Deploy

### 3. Environment Variables Required

Make sure your Edge Function has these environment variables set in Supabase:

- `SUPABASE_URL` (should be auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` (should be auto-set)
- `GOOGLE_CLIENT_ID` (for OAuth)
- `GOOGLE_CLIENT_SECRET` (for OAuth)

### 4. Google Search Console Integration

Before syncing keywords, make sure:

1. The site has GSC connected in the integrations settings
2. The `site_integrations` table has:
   - `gsc_connected = true`
   - `gsc_access_token` set
   - `gsc_refresh_token` set
   - `gsc_property_url` set (e.g., `sc-domain:example.com` or `https://example.com`)

## Testing

After setup:

1. Go to `/sites/[id]/keywords` for any site
2. Try creating a keyword list
3. Try adding keywords manually
4. If GSC is connected, try "Sync with Search Console"

## Troubleshooting

**404 errors on keyword_lists/keywords tables:**
- Make sure you ran the SQL schema in Supabase SQL Editor

**CORS errors when syncing with GSC:**
- Make sure the Edge Function is deployed
- Check that the function URL is correct (should be `https://YOUR_PROJECT.functions.supabase.co/gsc-keywords`)
- Check browser console for detailed error messages

**GSC sync fails:**
- Verify GSC is connected for the site in integrations settings
- Check that `gsc_property_url` is set correctly
- Verify OAuth tokens are valid (may need to reconnect)

