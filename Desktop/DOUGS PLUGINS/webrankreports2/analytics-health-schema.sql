-- Analytics Health Schema
-- Run this SQL in Supabase SQL Editor

-- Create analytics_health table
CREATE TABLE IF NOT EXISTS analytics_health (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  tracking_score INTEGER NOT NULL CHECK (tracking_score BETWEEN 0 AND 100),
  traffic_score INTEGER NOT NULL CHECK (traffic_score BETWEEN 0 AND 100),
  content_score INTEGER NOT NULL CHECK (content_score BETWEEN 0 AND 100),
  ux_score INTEGER NOT NULL CHECK (ux_score BETWEEN 0 AND 100),
  audience_score INTEGER NOT NULL CHECK (audience_score BETWEEN 0 AND 100),
  critical_alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS analytics_health_site_id_idx
  ON analytics_health(site_id, created_at DESC);

-- Enable RLS
ALTER TABLE analytics_health ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own analytics health
CREATE POLICY "Users can view their own analytics health"
  ON analytics_health
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = analytics_health.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Note: INSERT/UPDATE/DELETE will be done by Edge Functions using service role key
-- which bypasses RLS, so no additional policies needed for those operations

