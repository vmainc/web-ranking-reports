-- Create competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tech JSONB DEFAULT '{}'::jsonb,
  discovered_from TEXT CHECK (discovered_from IN ('gsc','wappalyzer','serp')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (site_id, domain)
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User selects competitors" ON competitors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitors.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "User inserts competitors" ON competitors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitors.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "User updates competitors" ON competitors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitors.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "User deletes competitors" ON competitors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitors.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS competitors_site_id_idx ON competitors(site_id);
CREATE INDEX IF NOT EXISTS competitors_domain_idx ON competitors(domain);

-- Create competitor_keywords table
CREATE TABLE IF NOT EXISTS competitor_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position INTEGER,
  url TEXT,
  est_traffic INTEGER,
  source TEXT CHECK (source IN ('serp')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  UNIQUE (competitor_id, keyword)
);

ALTER TABLE competitor_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User select competitor_keywords" ON competitor_keywords
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitor_keywords.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "User insert competitor_keywords" ON competitor_keywords
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitor_keywords.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "User update competitor_keywords" ON competitor_keywords
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitor_keywords.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "User delete competitor_keywords" ON competitor_keywords
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = competitor_keywords.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS competitor_keywords_site_id_idx ON competitor_keywords(site_id);
CREATE INDEX IF NOT EXISTS competitor_keywords_competitor_id_idx ON competitor_keywords(competitor_id);
CREATE INDEX IF NOT EXISTS competitor_keywords_keyword_idx ON competitor_keywords(keyword);
