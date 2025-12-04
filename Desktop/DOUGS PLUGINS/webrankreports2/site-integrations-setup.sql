-- Create site_integrations table for WebRankingReports
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  ga4_property_id TEXT,
  ga4_measurement_id TEXT,
  gsc_property_url TEXT,
  ads_customer_id TEXT,
  ga4_connected BOOLEAN DEFAULT FALSE,
  gsc_connected BOOLEAN DEFAULT FALSE,
  ads_connected BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE site_integrations ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view integrations for sites they own
CREATE POLICY "Users can view their own site integrations"
  ON site_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_integrations.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Create policy: Users can insert integrations for sites they own
CREATE POLICY "Users can insert their own site integrations"
  ON site_integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_integrations.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Create policy: Users can update integrations for sites they own
CREATE POLICY "Users can update their own site integrations"
  ON site_integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_integrations.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Create policy: Users can delete integrations for sites they own
CREATE POLICY "Users can delete their own site integrations"
  ON site_integrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_integrations.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS site_integrations_site_id_idx ON site_integrations(site_id);

