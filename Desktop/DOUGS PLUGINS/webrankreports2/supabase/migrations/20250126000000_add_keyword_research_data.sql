-- Add keyword research data columns to keywords table
-- Run this in Supabase SQL Editor

ALTER TABLE public.keywords
  ADD COLUMN IF NOT EXISTS search_volume INTEGER,
  ADD COLUMN IF NOT EXISTS competition TEXT,
  ADD COLUMN IF NOT EXISTS cpc NUMERIC;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'keywords' 
  AND column_name IN ('search_volume', 'competition', 'cpc');

