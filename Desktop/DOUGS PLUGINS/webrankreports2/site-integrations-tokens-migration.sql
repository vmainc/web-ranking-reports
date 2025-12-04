-- Migration: Add OAuth token columns to site_integrations table
-- Run this SQL in your Supabase SQL Editor AFTER the initial site_integrations table is created

-- Add columns for Google Analytics 4 OAuth tokens
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS ga4_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ga4_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS ga4_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ga4_token_scope TEXT;

-- Add columns for Google Search Console OAuth tokens
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS gsc_access_token TEXT,
  ADD COLUMN IF NOT EXISTS gsc_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS gsc_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gsc_token_scope TEXT;

-- Add columns for Google Ads OAuth tokens
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS ads_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ads_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS ads_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ads_token_scope TEXT;

-- Note: These token columns are automatically protected by the existing RLS policies
-- Users can only read/update tokens for sites they own

