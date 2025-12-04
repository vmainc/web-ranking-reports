-- Ensure lighthouse_audits table has all required columns
-- This migration is idempotent and can be run multiple times

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS lighthouse_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL CHECK (strategy IN ('mobile', 'desktop')),
  requested_url TEXT NOT NULL,
  overall_score INTEGER,
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  seo_score INTEGER,
  pwa_score INTEGER,
  fcp_ms INTEGER,
  lcp_ms INTEGER,
  cls NUMERIC,
  tbt_ms INTEGER,
  final_screenshot TEXT,
  loading_sequence JSONB,
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE lighthouse_audits
  ADD COLUMN IF NOT EXISTS strategy TEXT CHECK (strategy IN ('mobile', 'desktop')),
  ADD COLUMN IF NOT EXISTS requested_url TEXT,
  ADD COLUMN IF NOT EXISTS overall_score INTEGER,
  ADD COLUMN IF NOT EXISTS performance_score INTEGER,
  ADD COLUMN IF NOT EXISTS accessibility_score INTEGER,
  ADD COLUMN IF NOT EXISTS best_practices_score INTEGER,
  ADD COLUMN IF NOT EXISTS seo_score INTEGER,
  ADD COLUMN IF NOT EXISTS pwa_score INTEGER,
  ADD COLUMN IF NOT EXISTS fcp_ms INTEGER,
  ADD COLUMN IF NOT EXISTS lcp_ms INTEGER,
  ADD COLUMN IF NOT EXISTS cls NUMERIC,
  ADD COLUMN IF NOT EXISTS tbt_ms INTEGER,
  ADD COLUMN IF NOT EXISTS final_screenshot TEXT,
  ADD COLUMN IF NOT EXISTS loading_sequence JSONB,
  ADD COLUMN IF NOT EXISTS raw_json JSONB;

-- Rename 'url' to 'requested_url' if 'url' exists but 'requested_url' doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lighthouse_audits' 
    AND column_name = 'requested_url'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lighthouse_audits' 
      AND column_name = 'url'
    ) THEN
      ALTER TABLE lighthouse_audits RENAME COLUMN url TO requested_url;
    END IF;
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS lighthouse_audits_site_id_strategy_idx
  ON lighthouse_audits(site_id, strategy, created_at DESC);

CREATE INDEX IF NOT EXISTS lighthouse_audits_strategy_idx
  ON lighthouse_audits(strategy);

-- Enable Row Level Security
ALTER TABLE lighthouse_audits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users select their audits" ON lighthouse_audits;
DROP POLICY IF EXISTS "Users can view their own lighthouse audits" ON lighthouse_audits;
DROP POLICY IF EXISTS "Users insert their audits" ON lighthouse_audits;

-- Create RLS policies
CREATE POLICY "Users select their audits"
  ON lighthouse_audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = lighthouse_audits.site_id
        AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert their audits"
  ON lighthouse_audits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = lighthouse_audits.site_id
        AND sites.user_id = auth.uid()
    )
  );

