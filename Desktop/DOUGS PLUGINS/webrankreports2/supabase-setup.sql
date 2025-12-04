-- Create sites table for WebRankingReports
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  keyword_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own sites
CREATE POLICY "Users can view their own sites"
  ON sites FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own sites
CREATE POLICY "Users can insert their own sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own sites
CREATE POLICY "Users can update their own sites"
  ON sites FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own sites
CREATE POLICY "Users can delete their own sites"
  ON sites FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS sites_user_id_idx ON sites(user_id);
CREATE INDEX IF NOT EXISTS sites_created_at_idx ON sites(created_at DESC);

