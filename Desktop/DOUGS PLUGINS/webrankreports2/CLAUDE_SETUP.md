# Claude API Setup for Site Audit

The Claude API has been integrated for site audits. Here's what you need to do:

## ✅ What's Already Done

1. **Server API Route Created**: `/api/sites/[id]/audit/run`
   - Handles audit requests
   - Calls Claude API to analyze websites
   - Returns structured audit results

2. **Audit Page Updated**: `/sites/[id]/audit`
   - "Run Audit" button is now functional
   - Displays audit results dynamically
   - Shows scores for each category

3. **Runtime Config Updated**: `nuxt.config.ts`
   - Added `claudeApiKey` to private runtime config

## 🔧 Setup Steps

### Step 1: Add Claude API Key to Local .env

Add the API key to your `.env` file:
```
CLAUDE_API_KEY=sk-ant-api03-...your-key-here...
```

### Step 2: Add Claude API Key to Supabase Edge Functions Secrets

If you want to use Claude in Edge Functions later, add the secret to Supabase:

1. Go to: https://supabase.com/dashboard/project/dwiqmfauxwbfcqlaplfy/edge-functions/secrets
2. Click "Add new secret"
3. Add:
   - Name: `CLAUDE_API_KEY`
   - Value: `sk-ant-api03-...your-key-here...`

**Note**: Currently, the audit runs from your Nuxt server (not Edge Functions), so the `.env` file is sufficient for now.

## 🚀 How to Use

1. **Go to Site Audit Page**:
   - Navigate to: `/sites/[site-id]/audit`

2. **Run Audit**:
   - Click the "Run Audit" button
   - Wait for Claude to analyze the site (usually 10-30 seconds)
   - Results will appear automatically

3. **View Results**:
   - Each category shows:
     - Score (0-100)
     - Key findings
     - Recommendations (in the full report)

## 📊 Audit Categories

The audit covers 4 main categories:

1. **Technical Health** (0-100)
   - Site structure, broken links, crawlability, mobile responsiveness, security

2. **On-Page SEO** (0-100)
   - Meta tags, headings, content optimization, internal linking, schema markup

3. **Core Web Vitals** (0-100)
   - LCP, FID, CLS, overall loading performance

4. **Index Coverage** (0-100)
   - Indexability, robots.txt, sitemap, canonical tags, duplicate content

## 🔄 Restart Your Dev Server

After adding the API key, restart your Nuxt dev server:

```bash
npm run dev
```

## ⚠️ Important Notes

- **API Key Security**: The API key is stored in `.env` which is gitignored. Never commit it to version control.
- **Production**: For production, set the `CLAUDE_API_KEY` environment variable on your hosting platform (Netlify, Vercel, etc.)
- **Rate Limits**: Be aware of Claude API rate limits for your account
- **Costs**: Claude API usage is billed based on token usage. Monitor your usage in the Anthropic dashboard.

## 🐛 Troubleshooting

### Error: "CLAUDE_API_KEY is not set"
- Make sure the API key is in your `.env` file
- Restart your dev server after adding it

### Error: "Claude API error"
- Check that your API key is valid
- Verify you have credits/quota in your Anthropic account
- Check the API key format (should start with `sk-ant-`)

### Audit takes too long
- Claude analysis can take 10-30 seconds
- Check your internet connection
- Verify Claude API is accessible

## 📝 Future Enhancements

Potential improvements:
- Save audit results to database
- Schedule regular audits
- Compare audits over time
- Export audit reports as PDF
- Email audit reports
- Add more detailed findings view

