# Google OAuth Setup Status

## ✅ Completed Automatically

1. **SQL Migration Applied**
   - All OAuth token columns verified/created in `site_integrations` table
   - Migration file: `supabase/migrations/20251122063733_ensure_oauth_token_columns.sql`

2. **Edge Functions Deployed**
   - ✅ `google-oauth-start` - ACTIVE (Version 1)
   - ✅ `google-oauth-callback` - ACTIVE (Version 1)
   - Both functions are live and ready to use

## ✅ Environment Variables Set

All required environment variables have been configured in Supabase:

- ✅ `GOOGLE_CLIENT_ID` - Set
- ✅ `GOOGLE_CLIENT_SECRET` - Set
- ✅ `GOOGLE_REDIRECT_BASE` - Set to `https://dwiqmfauxwbfcqlaplfy.functions.supabase.co`
- ✅ `WEBRANKINGREPORTS_APP_URL` - Set to `http://localhost:3000`
- ✅ `SUPABASE_URL` - Automatically available
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Automatically available

### 2. Configure Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Open your OAuth 2.0 Client ID
3. Add this **Authorized redirect URI**:
   ```
   https://dwiqmfauxwbfcqlaplfy.functions.supabase.co/google-oauth-callback
   ```
4. Save changes

### 3. Verify Local Environment Variables

Ensure your local `.env` file has:

```bash
SUPABASE_URL=https://dwiqmfauxwbfcqlaplfy.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_BASE=https://dwiqmfauxwbfcqlaplfy.functions.supabase.co
WEBRANKINGREPORTS_APP_URL=http://localhost:3000
```

## 🧪 Testing

Once environment variables are set:

1. Navigate to: `http://localhost:3000/sites/[site-id]/settings/integrations`
2. Click **"Connect Google"** button
3. You should be redirected to Google OAuth consent screen
4. After approval, you'll be redirected back with all services connected

## 📊 Current Status

- ✅ Database schema ready
- ✅ Edge Functions deployed and active
- ✅ Environment variables configured
- ⏳ Google OAuth redirect URI needs to be configured (manual step in Google Cloud Console)

## 🔗 Useful Links

- **Supabase Functions Dashboard**: https://supabase.com/dashboard/project/dwiqmfauxwbfcqlaplfy/functions
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- **Supabase Project Settings**: https://supabase.com/dashboard/project/dwiqmfauxwbfcqlaplfy/settings/functions

