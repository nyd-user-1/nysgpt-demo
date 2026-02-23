#!/bin/bash
# Batch enrich NSR records with Semantic Scholar data.
# Calls the enrich-s2 Edge Function in a loop until all DOIs are processed.
# Usage: ./scripts/enrich-s2.sh

SUPABASE_URL="https://kwyjohornlgujoqypyvu.supabase.co/functions/v1/enrich-s2"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eWpvaG9ybmxndWpvcXlweXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTAyODcsImV4cCI6MjA2NzE4NjI4N30.nPewQZse07MkYAK5W9wCEwYhnndHkA8pKmedgHkvD9M"
BATCH_SIZE=500

echo "=== Semantic Scholar Enrichment Script ==="
echo "Batch size: $BATCH_SIZE"
echo ""

TOTAL_PROCESSED=0
TOTAL_FOUND=0
TOTAL_NOT_FOUND=0
TOTAL_ERRORS=0
ITERATION=0

while true; do
  ITERATION=$((ITERATION + 1))
  echo "[$(date '+%H:%M:%S')] Batch $ITERATION..."

  RESPONSE=$(curl -s -X POST "$SUPABASE_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "apikey: $ANON_KEY" \
    -d "{\"batch_size\": $BATCH_SIZE}")

  PROCESSED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('processed',0))" 2>/dev/null)
  FOUND=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('found',0))" 2>/dev/null)
  NOT_FOUND=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('not_found',0))" 2>/dev/null)
  ERRORS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',0))" 2>/dev/null)
  SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)

  if [ "$SUCCESS" != "True" ]; then
    echo "ERROR: Request failed. Response:"
    echo "$RESPONSE"
    exit 1
  fi

  TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
  TOTAL_FOUND=$((TOTAL_FOUND + FOUND))
  TOTAL_NOT_FOUND=$((TOTAL_NOT_FOUND + NOT_FOUND))
  TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

  echo "  Batch: processed=$PROCESSED found=$FOUND not_found=$NOT_FOUND errors=$ERRORS"
  echo "  Total: processed=$TOTAL_PROCESSED found=$TOTAL_FOUND not_found=$TOTAL_NOT_FOUND errors=$TOTAL_ERRORS"

  if [ "$PROCESSED" -eq 0 ]; then
    echo ""
    echo "=== Enrichment complete! ==="
    echo "Total processed: $TOTAL_PROCESSED"
    echo "Found on S2: $TOTAL_FOUND"
    echo "Not found: $TOTAL_NOT_FOUND"
    echo "Errors: $TOTAL_ERRORS"
    exit 0
  fi

  sleep 2
done
