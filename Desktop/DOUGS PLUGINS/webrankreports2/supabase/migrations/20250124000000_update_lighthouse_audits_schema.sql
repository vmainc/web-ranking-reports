-- Update lighthouse_audits table to include metrics and screenshots
-- This migration adds missing columns if they don't exist

-- Add metrics columns
ALTER TABLE lighthouse_audits
  ADD COLUMN IF NOT EXISTS fcp_ms INTEGER,
  ADD COLUMN IF NOT EXISTS lcp_ms INTEGER,
  ADD COLUMN IF NOT EXISTS cls NUMERIC,
  ADD COLUMN IF NOT EXISTS tbt_ms INTEGER;

-- Add screenshot columns
ALTER TABLE lighthouse_audits
  ADD COLUMN IF NOT EXISTS final_screenshot TEXT,
  ADD COLUMN IF NOT EXISTS loading_sequence JSONB;

-- Update requested_url column name if needed (some schemas use 'url')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lighthouse_audits' 
    AND column_name = 'requested_url'
  ) THEN
    -- If 'url' exists but 'requested_url' doesn't, rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lighthouse_audits' 
      AND column_name = 'url'
    ) THEN
      ALTER TABLE lighthouse_audits RENAME COLUMN url TO requested_url;
    ELSE
      -- If neither exists, add requested_url
      ALTER TABLE lighthouse_audits ADD COLUMN requested_url TEXT;
    END IF;
  END IF;
END $$;

-- Ensure overall_score can be NULL (for cases where no categories are available)
ALTER TABLE lighthouse_audits
  ALTER COLUMN overall_score DROP NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE lighthouse_audits IS 'Stores Lighthouse audit results from Google PageSpeed Insights API';
COMMENT ON COLUMN lighthouse_audits.fcp_ms IS 'First Contentful Paint in milliseconds';
COMMENT ON COLUMN lighthouse_audits.lcp_ms IS 'Largest Contentful Paint in milliseconds';
COMMENT ON COLUMN lighthouse_audits.cls IS 'Cumulative Layout Shift score';
COMMENT ON COLUMN lighthouse_audits.tbt_ms IS 'Total Blocking Time in milliseconds';
COMMENT ON COLUMN lighthouse_audits.final_screenshot IS 'Base64-encoded final screenshot from Lighthouse';
COMMENT ON COLUMN lighthouse_audits.loading_sequence IS 'JSONB array of loading sequence frames with data and timing';

