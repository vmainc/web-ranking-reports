# Where to See Debug Logs

## 1. Browser Console (PRIMARY LOCATION)

### How to Open:
1. **Open your site**: http://localhost:3000/sites
2. **Open DevTools**:
   - **Mac**: Press `Cmd + Option + I` (or `Cmd + Option + J` for Console only)
   - **Windows/Linux**: Press `F12` or `Ctrl + Shift + I`
3. **Click the "Console" tab** at the top

### What You Should See:

When you click "Add Site" button, you should see:
```
[handleAddSite] Function called
[handleAddSite] Getting session...
[handleAddSite] Session found, user ID: xxxxx
[handleAddSite] Inserting site: {name: "...", url: "...", user_id: "..."}
[handleAddSite] Site added successfully: {...}
```

When the page loads, you should see:
```
[onMounted] Starting...
[fetchSites] Fetched X sites
```

### If You See Errors:
- **Red errors** = Problems (check the error message)
- **Yellow warnings** = Non-critical issues
- **Gray logs** = Normal debug info

---

## 2. Diagnostic Page

### Visit:
**http://localhost:3000/debug/supabase**

### What It Shows:
- ✅/❌ Supabase URL configured
- ✅/❌ Supabase Anon Key configured  
- ✅/❌ Supabase Client available
- ✅/❌ Auth session present
- ✅/❌ Database connection works

### How to Use:
1. Log in first (if not already)
2. Visit the debug page
3. Click "Test Database Connection" button
4. Check all statuses show ✅

---

## 3. Terminal/Server Logs

The dev server terminal shows:
- Build errors
- Server-side errors
- Compilation warnings

**Location**: The terminal where you ran `npm run dev`

---

## 4. Network Tab (For API Calls)

### How to Open:
1. Open DevTools (F12)
2. Click **"Network"** tab
3. Filter by **"Fetch/XHR"**

### What to Look For:
- Requests to Supabase (should show status 200 for success)
- Any failed requests (red, status 4xx or 5xx)

---

## Quick Test Steps:

1. **Open Browser Console** (F12 → Console tab)
2. **Clear console** (click 🚫 icon or `Cmd+K` / `Ctrl+L`)
3. **Visit**: http://localhost:3000/sites
4. **Check console** for:
   - `[onMounted] Starting...`
   - `[fetchSites] Fetched X sites`
5. **Click "Add Site"** button
6. **Check console** for:
   - `[handleAddSite] Function called`
   - Any errors in red

---

## If You Don't See Any Logs:

1. **Hard refresh** the page:
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

2. **Check if console is filtered**:
   - Look for filter buttons (All, Errors, Warnings, Info)
   - Make sure "All" is selected

3. **Check if logs are being cleared**:
   - Uncheck "Preserve log" if it's checked
   - Or check "Preserve log" to keep logs across page loads

4. **Restart dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

---

## Common Issues:

### "Nothing in console"
- Make sure you're on the Console tab (not Network, Elements, etc.)
- Try refreshing the page
- Check if console filter is hiding logs

### "Changes not showing"
- Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- Restart dev server
- Clear browser cache

### "Can't see debug page"
- Make sure you're logged in
- URL should be: http://localhost:3000/debug/supabase
- Check browser console for errors

