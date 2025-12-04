#!/bin/bash

# Deploy Edge Functions to Supabase
# Run this script after logging in: supabase login

PROJECT_REF="dwiqmfauxwbfcqlaplfy"

echo "🚀 Deploying Edge Functions to Supabase..."
echo ""

# Deploy google-ga4-start
echo "📦 Deploying google-ga4-start function..."
supabase functions deploy google-ga4-start --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
  echo "✅ google-ga4-start deployed successfully"
else
  echo "❌ Failed to deploy google-ga4-start"
  exit 1
fi

echo ""

# Deploy google-ga4-callback
echo "📦 Deploying google-ga4-callback function..."
supabase functions deploy google-ga4-callback --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
  echo "✅ google-ga4-callback deployed successfully"
else
  echo "❌ Failed to deploy google-ga4-callback"
  exit 1
fi

echo ""
echo "🎉 All functions deployed!"
echo ""
echo "⚠️  Don't forget to set these secrets in Supabase Dashboard:"
echo "   - GOOGLE_CLIENT_ID"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - GOOGLE_REDIRECT_URI (https://dwiqmfauxwbfcqlaplfy.supabase.co/functions/v1/google-ga4-callback)"
echo "   - FRONTEND_URL (http://localhost:3000)"
echo ""
echo "   Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"

