-- Accurate count of distinct bills that have been embedded
-- (Avoids the Supabase JS client 1000-row default limit issue)
CREATE OR REPLACE FUNCTION count_embedded_bills(p_session_id INT)
RETURNS INT AS $$
  SELECT COUNT(DISTINCT bill_number)::INT
  FROM bill_chunks
  WHERE session_id = p_session_id;
$$ LANGUAGE sql STABLE;
