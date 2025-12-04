-- Migration: Ensure all OAuth token columns exist in site_integrations
-- This migration is idempotent and can be run multiple times safely
-- Run this SQL in your Supabase SQL Editor

-- Add columns for Google Analytics 4 OAuth tokens (if they don't exist)
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS ga4_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ga4_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS ga4_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ga4_token_scope TEXT;

-- Add columns for Google Search Console OAuth tokens (if they don't exist)
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS gsc_access_token TEXT,
  ADD COLUMN IF NOT EXISTS gsc_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS gsc_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gsc_token_scope TEXT;

-- Add columns for Google Ads OAuth tokens (if they don't exist)
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS ads_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ads_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS ads_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ads_token_scope TEXT;

-- Note: These token columns are automatically protected by the existing RLS policies
-- Users can only read/update tokens for sites they own

-- Verify columns exist
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'site_integrations' 
  AND column_name LIKE '%_token%' 
  OR column_name LIKE '%_expires%'
ORDER BY column_name;

