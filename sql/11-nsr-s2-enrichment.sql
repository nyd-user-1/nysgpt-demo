-- Semantic Scholar enrichment data for NSR records.
-- Kept separate from core nsr table so S2 data can be refreshed independently.

CREATE TABLE nsr_s2 (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nsr_id BIGINT NOT NULL REFERENCES nsr(id) ON DELETE CASCADE,
  doi TEXT NOT NULL,
  s2_paper_id TEXT,
  citation_count INT,
  influential_citation_count INT,
  reference_count INT,
  abstract TEXT,
  tldr TEXT,
  venue TEXT,
  publication_date TEXT,
  is_open_access BOOLEAN DEFAULT FALSE,
  open_access_pdf_url TEXT,
  fields_of_study TEXT[],
  authors JSONB,                -- [{name, hIndex, affiliations}]
  bibtex TEXT,
  lookup_status TEXT NOT NULL DEFAULT 'pending',  -- pending | found | not_found | error
  looked_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nsr_id)
);

CREATE INDEX idx_nsr_s2_nsr_id ON nsr_s2(nsr_id);
CREATE INDEX idx_nsr_s2_doi ON nsr_s2(doi);
CREATE INDEX idx_nsr_s2_status ON nsr_s2(lookup_status);
