-- Migration: Add Google Ads OAuth credential columns to site_integrations
-- This migration is idempotent and can be run multiple times safely

-- Add columns for Google Ads OAuth credentials (if they don't exist)
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS ads_login_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ads_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ads_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ads_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS ads_token_expires_at TIMESTAMPTZ;

-- Note: ads_access_token, ads_refresh_token, and ads_token_expires_at may already exist
-- from the previous migration (20251122063733_ensure_oauth_token_columns.sql)
-- This migration ensures ads_login_customer_id and ads_customer_id exist
-- and is safe to run even if all columns already exist

-- Verify columns exist
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'site_integrations' 
  AND column_name LIKE 'ads_%'
ORDER BY column_name;

