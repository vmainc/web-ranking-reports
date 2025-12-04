-- Lighthouse Audits Schema
-- Run this SQL in Supabase SQL Editor

-- Create lighthouse_audits table
CREATE TABLE IF NOT EXISTS lighthouse_audits (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('mobile', 'desktop')),
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  performance_score INTEGER CHECK (performance_score BETWEEN 0 AND 100),
  accessibility_score INTEGER CHECK (accessibility_score BETWEEN 0 AND 100),
  best_practices_score INTEGER CHECK (best_practices_score BETWEEN 0 AND 100),
  seo_score INTEGER CHECK (seo_score BETWEEN 0 AND 100),
  pwa_score INTEGER CHECK (pwa_score BETWEEN 0 AND 100),
  raw_json JSONB NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS lighthouse_audits_site_id_idx
  ON lighthouse_audits(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lighthouse_audits_strategy_idx
  ON lighthouse_audits(strategy);

-- Enable RLS
ALTER TABLE lighthouse_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own lighthouse audits
CREATE POLICY "Users can view their own lighthouse audits"
  ON lighthouse_audits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = lighthouse_audits.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Note: INSERT/UPDATE/DELETE will be done by Edge Functions using service role key
-- which bypasses RLS, so no additional policies needed for those operations

