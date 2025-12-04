-- Keyword Research Schema for WebRankingReports (Idempotent Version)
-- This version can be run multiple times safely
-- Run this SQL in your Supabase SQL Editor

-- ========================================
-- PART 1: Create keyword_lists table
-- ========================================
CREATE TABLE IF NOT EXISTS public.keyword_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.keyword_lists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view keyword lists for their sites" ON public.keyword_lists;
DROP POLICY IF EXISTS "Users can insert keyword lists for their sites" ON public.keyword_lists;
DROP POLICY IF EXISTS "Users can update keyword lists for their sites" ON public.keyword_lists;
DROP POLICY IF EXISTS "Users can delete keyword lists for their sites" ON public.keyword_lists;

-- Create policies
CREATE POLICY "Users can view keyword lists for their sites"
  ON public.keyword_lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keyword_lists.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keyword lists for their sites"
  ON public.keyword_lists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keyword_lists.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update keyword lists for their sites"
  ON public.keyword_lists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keyword_lists.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keyword lists for their sites"
  ON public.keyword_lists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keyword_lists.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS keyword_lists_site_id_idx ON public.keyword_lists(site_id);
CREATE INDEX IF NOT EXISTS keyword_lists_created_at_idx ON public.keyword_lists(created_at DESC);

-- ========================================
-- PART 2: Create keywords table
-- ========================================
CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE (site_id, phrase)
);

-- Enable Row Level Security
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view keywords for their sites" ON public.keywords;
DROP POLICY IF EXISTS "Users can insert keywords for their sites" ON public.keywords;
DROP POLICY IF EXISTS "Users can update keywords for their sites" ON public.keywords;
DROP POLICY IF EXISTS "Users can delete keywords for their sites" ON public.keywords;

-- Create policies
CREATE POLICY "Users can view keywords for their sites"
  ON public.keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keywords.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keywords for their sites"
  ON public.keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keywords.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update keywords for their sites"
  ON public.keywords FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keywords.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keywords for their sites"
  ON public.keywords FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.keywords.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS keywords_site_id_idx ON public.keywords(site_id);
CREATE INDEX IF NOT EXISTS keywords_phrase_idx ON public.keywords(phrase);
CREATE INDEX IF NOT EXISTS keywords_created_at_idx ON public.keywords(created_at DESC);

-- ========================================
-- PART 3: Create keyword_list_keywords join table
-- ========================================
CREATE TABLE IF NOT EXISTS public.keyword_list_keywords (
  id BIGSERIAL PRIMARY KEY,
  keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.keyword_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE (keyword_id, list_id)
);

-- Enable Row Level Security
ALTER TABLE public.keyword_list_keywords ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view keyword list assignments for their sites" ON public.keyword_list_keywords;
DROP POLICY IF EXISTS "Users can insert keyword list assignments for their sites" ON public.keyword_list_keywords;
DROP POLICY IF EXISTS "Users can delete keyword list assignments for their sites" ON public.keyword_list_keywords;

-- Create policies
CREATE POLICY "Users can view keyword list assignments for their sites"
  ON public.keyword_list_keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.keywords
      INNER JOIN public.sites ON public.sites.id = public.keywords.site_id
      WHERE public.keywords.id = public.keyword_list_keywords.keyword_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keyword list assignments for their sites"
  ON public.keyword_list_keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.keywords
      INNER JOIN public.sites ON public.sites.id = public.keywords.site_id
      WHERE public.keywords.id = public.keyword_list_keywords.keyword_id
      AND public.sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keyword list assignments for their sites"
  ON public.keyword_list_keywords FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.keywords
      INNER JOIN public.sites ON public.sites.id = public.keywords.site_id
      WHERE public.keywords.id = public.keyword_list_keywords.keyword_id
      AND public.sites.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS keyword_list_keywords_keyword_id_idx ON public.keyword_list_keywords(keyword_id);
CREATE INDEX IF NOT EXISTS keyword_list_keywords_list_id_idx ON public.keyword_list_keywords(list_id);

-- ========================================
-- PART 4: Create gsc_keyword_stats table
-- ========================================
CREATE TABLE IF NOT EXISTS public.gsc_keyword_stats (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  keyword_phrase TEXT NOT NULL,
  date_range_label TEXT NOT NULL DEFAULT 'last_28_days',
  clicks NUMERIC DEFAULT 0,
  impressions NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  avg_position NUMERIC DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE (site_id, keyword_phrase, date_range_label)
);

-- Enable Row Level Security
ALTER TABLE public.gsc_keyword_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view GSC keyword stats for their sites" ON public.gsc_keyword_stats;

-- Create policy
CREATE POLICY "Users can view GSC keyword stats for their sites"
  ON public.gsc_keyword_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE public.sites.id = public.gsc_keyword_stats.site_id
      AND public.sites.user_id = auth.uid()
    )
  );

-- Note: Edge Functions use service role key which bypasses RLS entirely
-- So INSERT/UPDATE operations from Edge Functions don't need explicit policies
-- The SELECT policy ensures users can only view stats for their own sites

-- Create indexes
CREATE INDEX IF NOT EXISTS gsc_keyword_stats_site_id_idx ON public.gsc_keyword_stats(site_id);
CREATE INDEX IF NOT EXISTS gsc_keyword_stats_keyword_phrase_idx ON public.gsc_keyword_stats(keyword_phrase);
CREATE INDEX IF NOT EXISTS gsc_keyword_stats_date_range_idx ON public.gsc_keyword_stats(date_range_label);
CREATE INDEX IF NOT EXISTS gsc_keyword_stats_fetched_at_idx ON public.gsc_keyword_stats(fetched_at DESC);

