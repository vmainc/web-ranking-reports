-- ============================================================
-- SITES TABLE SCHEMA
-- ============================================================
-- This file contains the complete schema for the `sites` table
-- Run this SQL in Supabase SQL Editor if the table doesn't exist
-- ============================================================

-- Create sites table
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS sites_user_id_idx ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS sites_created_at_idx ON public.sites(created_at DESC);
CREATE INDEX IF NOT EXISTS sites_url_idx ON public.sites(url);

-- Enable Row Level Security
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can insert their own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can update their own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can delete their own sites" ON public.sites;

-- RLS Policy: Users can SELECT only their own sites
CREATE POLICY "Users can view their own sites" ON public.sites
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can INSERT sites where user_id matches their auth.uid()
CREATE POLICY "Users can insert their own sites" ON public.sites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can UPDATE only their own sites
CREATE POLICY "Users can update their own sites" ON public.sites
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can DELETE only their own sites
CREATE POLICY "Users can delete their own sites" ON public.sites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify table was created
SELECT 'Sites table created successfully!' as status;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sites'
ORDER BY ordinal_position;

