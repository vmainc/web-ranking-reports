-- Create site_audits table to store audit and Lighthouse results
CREATE TABLE IF NOT EXISTS site_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Claude Audit Results (stored as JSONB for flexibility)
  audit_results JSONB,
  audit_score INTEGER, -- Overall score from audit (0-100)
  audit_status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  audit_error TEXT,
  audit_date TIMESTAMPTZ,
  
  -- Lighthouse/PageSpeed Insights Results
  lighthouse_score_performance INTEGER, -- 0-100
  lighthouse_score_accessibility INTEGER, -- 0-100
  lighthouse_score_best_practices INTEGER, -- 0-100
  lighthouse_score_seo INTEGER, -- 0-100
  lighthouse_results JSONB, -- Full Lighthouse results
  lighthouse_status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  lighthouse_error TEXT,
  lighthouse_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE site_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see audits for sites they own
CREATE POLICY "Users can view audits for their sites"
  ON site_audits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_audits.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audits for their sites"
  ON site_audits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_audits.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update audits for their sites"
  ON site_audits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_audits.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete audits for their sites"
  ON site_audits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_audits.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS site_audits_site_id_idx ON site_audits(site_id);
CREATE INDEX IF NOT EXISTS site_audits_created_at_idx ON site_audits(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_audits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_site_audits_updated_at
  BEFORE UPDATE ON site_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_site_audits_updated_at();

