ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS google_reviews_count INT,
  ADD COLUMN IF NOT EXISTS google_category VARCHAR(150);

-- Prevents re-importing the same Google Maps place on a repeat search.
CREATE UNIQUE INDEX IF NOT EXISTS companies_google_place_id_uq
  ON companies (google_place_id) WHERE google_place_id IS NOT NULL;
