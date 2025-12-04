# Quick Setup Instructions - Keyword Tables

## ⚠️ The 404 errors mean the tables don't exist yet!

## Steps to Fix (Takes 2 minutes):

### 1. Open Supabase Dashboard
   - Go to: https://supabase.com/dashboard
   - Select your project: **dwiqmfauxwbfcqlaplfy**

### 2. Open SQL Editor
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"** button

### 3. Copy the SQL File
   - Open `SETUP_KEYWORDS.sql` file from your project
   - Select ALL the text (Ctrl+A / Cmd+A)
   - Copy it (Ctrl+C / Cmd+C)

### 4. Paste and Run
   - Paste into the SQL Editor (Ctrl+V / Cmd+V)
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait for "Success" message

### 5. Verify
   - Click **"Table Editor"** in left sidebar
   - Look for these 4 tables:
     - ✅ `keyword_lists`
     - ✅ `keywords`
     - ✅ `keyword_list_keywords`
     - ✅ `gsc_keyword_stats`

### 6. Refresh Your App
   - Refresh your browser (F5)
   - The 404 errors should be gone!

## Troubleshooting

**If you see errors when running SQL:**
- Make sure you copied ALL the SQL
- Check for any error messages in red
- The tables might already exist - that's OK, the SQL is idempotent

**If tables still don't appear:**
- Wait 10-15 seconds for cache to refresh
- Try refreshing the Supabase dashboard
- Check that you're in the correct project

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd /Users/doughigson/Desktop/DOUGS\ PLUGINS/webrankreports2
supabase db reset  # This will reset your local database
```

Or manually run:
```bash
supabase db push
```

But the easiest way is to use the SQL Editor in the dashboard as described above.

