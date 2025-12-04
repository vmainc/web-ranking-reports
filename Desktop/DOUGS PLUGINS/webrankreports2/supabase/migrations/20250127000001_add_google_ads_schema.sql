-- Ensure site_integrations has Google Ads columns
ALTER TABLE site_integrations
  ADD COLUMN IF NOT EXISTS ads_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ads_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ads_updated_at TIMESTAMPTZ;

-- Create google_ads_connections table for storing tokens securely
CREATE TABLE IF NOT EXISTS google_ads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(site_id)
);

ALTER TABLE google_ads_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can select their own google ads connections"
  ON google_ads_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User can insert their own google ads connections"
  ON google_ads_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update their own google ads connections"
  ON google_ads_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS google_ads_connections_site_id_idx ON google_ads_connections(site_id);
CREATE INDEX IF NOT EXISTS google_ads_connections_user_id_idx ON google_ads_connections(user_id);

