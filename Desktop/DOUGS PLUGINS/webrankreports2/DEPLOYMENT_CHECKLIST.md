# Web Ranking Reports – Add Site Fix & Deployment Checklist

This checklist ensures the "Add Site" feature works correctly on the live/production site.

---

## 1. Environment Variables (Netlify)

### Required Variables

Set these in **Netlify Dashboard** → **Site settings** → **Environment variables**:

#### `SUPABASE_URL`
- **Where to find it**: 
  1. Go to your Supabase project dashboard: https://app.supabase.com
  2. Select your project
  3. Go to **Settings** → **API**
  4. Copy the **Project URL** (format: `https://xxxxx.supabase.co`)
- **Example**: `https://dwiqmfauxwbfcqlaplfy.supabase.co`
- **Important**: Include the `https://` protocol

#### `SUPABASE_ANON_KEY`
- **Where to find it**:
  1. Same location as above: **Settings** → **API**
  2. Copy the **anon/public** key (starts with `eyJ...` or `sb_publishable__...`)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` or `sb_publishable__...`
- **Important**: This is the **anon** key, NOT the service_role key

### After Setting Variables

1. **Redeploy** your site:
   - Go to **Deploys** tab in Netlify
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Wait for build to complete (2-5 minutes)

2. **Verify** variables are loaded:
   - Visit `https://app.webrankingreports.com/debug/supabase` (after logging in)
   - Check that "Supabase URL" and "Supabase Anon Key" both show ✅ Configured

---

## 2. Supabase Database Setup

### Step 1: Verify `sites` Table Exists

Run this SQL in **Supabase SQL Editor** (Dashboard → SQL Editor):

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'sites';
```

**Expected result**: Should return 1 row with `table_name = 'sites'`

**If missing**: Continue to Step 2.

### Step 2: Create `sites` Table (if missing)

1. Open **Supabase SQL Editor**
2. Copy the **entire contents** of `supabase/schema/sites.sql` from this repository
3. Paste into SQL Editor
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Verify success message: `"Sites table created successfully!"`

### Step 3: Verify Row Level Security (RLS) Policies

Run this SQL to check policies:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'sites';
```

**Expected result**: Should show 4 policies:
- `Users can view their own sites` (SELECT)
- `Users can insert their own sites` (INSERT)
- `Users can update their own sites` (UPDATE)
- `Users can delete their own sites` (DELETE)

**If policies are missing**: Re-run the SQL from `supabase/schema/sites.sql` (it includes `DROP POLICY IF EXISTS` so it's safe to run again).

---

## 3. Testing Steps

### Step 1: Log In on Live Site

1. Visit `https://app.webrankingreports.com`
2. Log in with your account
3. Verify you can see the dashboard

### Step 2: Visit Sites Page

1. Navigate to `/sites` (or click "Sites" in navigation)
2. Verify the page loads without errors
3. Open **Browser DevTools** (F12) → **Console** tab

### Step 3: Test Diagnostic Page

1. Visit `https://app.webrankingreports.com/debug/supabase`
2. Verify all statuses show ✅:
   - ✅ Supabase URL: Configured
   - ✅ Supabase Anon Key: Configured
   - ✅ Supabase Client: Available
   - ✅ Session: Present
   - ✅ Sites Table Query: Success

**If any show ❌**: Follow the troubleshooting steps shown on that page.

### Step 4: Test Add Site Flow

1. On `/sites` page, click **"Add Site"** button
2. Fill in:
   - **Site Name**: `Test Site`
   - **Website URL**: `https://example.com`
3. Click **"Add Site"**
4. **Expected behavior**:
   - Modal closes
   - Site appears in the list
   - No errors in console
5. **Check Browser Console**:
   - Should see: `[handleAddSite] Site added successfully:`
   - Should NOT see any red errors

### Step 5: Verify Site Was Saved

1. Refresh the page
2. The site should still be in the list
3. Click on the site card to navigate to its dashboard
4. Verify it loads correctly

---

## 4. Common Issues & Solutions

### Issue: "Supabase is not configured" error

**Cause**: Environment variables not set or not loaded

**Solution**:
1. Check Netlify environment variables are set correctly
2. Redeploy the site (clear cache)
3. Wait 2-5 minutes for build to complete
4. Check `/debug/supabase` page

### Issue: "Database table not set up" error

**Cause**: `sites` table doesn't exist in Supabase

**Solution**:
1. Run SQL from `supabase/schema/sites.sql` in Supabase SQL Editor
2. Verify table exists (see Step 2.1 above)

### Issue: "Permission denied" error

**Cause**: RLS policies are missing or incorrect

**Solution**:
1. Re-run SQL from `supabase/schema/sites.sql` (includes RLS policies)
2. Verify policies exist (see Step 2.3 above)

### Issue: "You must be logged in" error

**Cause**: Auth session not found

**Solution**:
1. Log out and log back in
2. Clear browser cookies/localStorage
3. Check Supabase Auth is enabled in your project

### Issue: Button does nothing / Modal doesn't open

**Cause**: Frontend JavaScript error (unrelated to Supabase)

**Solution**:
1. Check browser console for errors
2. Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Check `/debug/supabase` to verify Supabase is configured

---

## 5. Quick Verification Commands

### Check Environment Variables (in Netlify)

1. Go to **Site settings** → **Environment variables**
2. Verify both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are listed
3. Values should NOT be empty

### Check Supabase Table (in Supabase SQL Editor)

```sql
-- Check table exists
SELECT COUNT(*) FROM sites;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'sites';
-- Should show: rowsecurity = true
```

### Check Browser Console (on Live Site)

1. Open `/sites` page
2. Open DevTools → Console
3. Look for:
   - ✅ `[handleAddSite] Function called` (when clicking Add Site)
   - ✅ `[handleAddSite] Session found, user ID: ...`
   - ✅ `[handleAddSite] Site added successfully:`
   - ❌ Any red errors (these indicate problems)

---

## 6. Post-Deployment Checklist

After deploying, verify:

- [ ] Environment variables are set in Netlify
- [ ] Site has been redeployed after setting env vars
- [ ] `/debug/supabase` shows all ✅ green
- [ ] Can log in on live site
- [ ] Can view `/sites` page
- [ ] Can click "Add Site" button (modal opens)
- [ ] Can submit form and site appears in list
- [ ] No errors in browser console
- [ ] Site persists after page refresh

---

## 7. Next Time You Deploy to a New Environment

1. **Set environment variables** (Step 1)
2. **Create `sites` table** (Step 2) - only if using a fresh Supabase project
3. **Test using diagnostic page** (Step 3)
4. **Test Add Site flow** (Step 4)

**Time estimate**: 5-10 minutes for a new environment setup.

---

## Support

If issues persist after following this checklist:

1. Check `/debug/supabase` page for specific error messages
2. Check browser console for detailed error logs
3. Check Netlify function logs (if using Edge Functions)
4. Verify Supabase project is active and not paused

---

**Last updated**: 2025-01-27

