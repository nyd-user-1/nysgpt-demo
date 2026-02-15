-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create bill_chunks table for storing chunked bill text with embeddings
CREATE TABLE IF NOT EXISTS bill_chunks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id INT NOT NULL,
  bill_number TEXT NOT NULL,
  session_id INT NOT NULL,
  chunk_index INT NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('title', 'summary', 'memo', 'body')),
  content TEXT NOT NULL,
  token_count INT,
  embedding vector(256),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (bill_id, chunk_index)
);

-- HNSW index for fast cosine similarity search on embeddings
CREATE INDEX IF NOT EXISTS idx_bill_chunks_embedding
  ON bill_chunks USING hnsw (embedding vector_cosine_ops);

-- B-tree indexes for filtering
CREATE INDEX IF NOT EXISTS idx_bill_chunks_bill_id ON bill_chunks (bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_chunks_bill_number ON bill_chunks (bill_number);
CREATE INDEX IF NOT EXISTS idx_bill_chunks_session_id ON bill_chunks (session_id);

-- RLS: public read, service_role write
ALTER TABLE bill_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to bill_chunks"
  ON bill_chunks FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role write access to bill_chunks"
  ON bill_chunks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RPC function: match bill chunks by embedding similarity
CREATE OR REPLACE FUNCTION match_bill_chunks(
  query_embedding vector(256),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_session_id INT DEFAULT NULL,
  filter_bill_number TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  bill_id INT,
  bill_number TEXT,
  session_id INT,
  chunk_index INT,
  chunk_type TEXT,
  content TEXT,
  token_count INT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.bill_id,
    bc.bill_number,
    bc.session_id,
    bc.chunk_index,
    bc.chunk_type,
    bc.content,
    bc.token_count,
    bc.metadata,
    1 - (bc.embedding <=> query_embedding) AS similarity
  FROM bill_chunks bc
  WHERE bc.embedding IS NOT NULL
    AND 1 - (bc.embedding <=> query_embedding) > match_threshold
    AND (filter_session_id IS NULL OR bc.session_id = filter_session_id)
    AND (filter_bill_number IS NULL OR bc.bill_number = filter_bill_number)
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
