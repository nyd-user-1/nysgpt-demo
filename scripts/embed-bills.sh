#!/bin/bash
# Batch embed all bills for semantic search (pgvector).
# Runs in batches of 10, resumable via offset argument.
# Usage: ./scripts/embed-bills.sh [starting_offset]

SUPABASE_URL="https://kwyjohornlgujoqypyvu.supabase.co/functions/v1/embed-bill-chunks"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eWpvaG9ybmxndWpvcXlweXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTAyODcsImV4cCI6MjA2NzE4NjI4N30.nPewQZse07MkYAK5W9wCEwYhnndHkA8pKmedgHkvD9M"
SESSION_YEAR=2025
BATCH_SIZE=10
OFFSET=${1:-0}

echo "=== Bill Embedding Script ==="
echo "Starting at offset: $OFFSET"
echo "Batch size: $BATCH_SIZE"
echo ""

# Show initial status
echo "Checking current status..."
STATUS=$(curl -s -X POST "$SUPABASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -d "{\"action\":\"status\",\"sessionYear\":$SESSION_YEAR}")

TOTAL_CHUNKS=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalChunks',0))" 2>/dev/null)
BILLS_EMBEDDED=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('billsEmbedded',0))" 2>/dev/null)
TOTAL_BILLS=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalBills',0))" 2>/dev/null)
echo "Current: $BILLS_EMBEDDED / $TOTAL_BILLS bills embedded ($TOTAL_CHUNKS chunks)"
echo ""

while true; do
  echo "[$(date '+%H:%M:%S')] Processing batch at offset $OFFSET..."

  RESPONSE=$(curl -s -X POST "$SUPABASE_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "apikey: $ANON_KEY" \
    -d "{\"action\":\"embed-batch\",\"sessionYear\":$SESSION_YEAR,\"batchSize\":$BATCH_SIZE,\"offset\":$OFFSET}")

  # Parse response
  SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
  PROCESSED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('processed',0))" 2>/dev/null)
  SUCCEEDED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('succeeded',0))" 2>/dev/null)
  ERRORS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',0))" 2>/dev/null)
  CHUNKS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalChunks',0))" 2>/dev/null)
  DURATION=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('duration','?'))" 2>/dev/null)
  NEXT_OFFSET=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('nextOffset','null'))" 2>/dev/null)
  TOTAL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalBills',0))" 2>/dev/null)
  HAS_MORE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hasMore',False))" 2>/dev/null)

  if [ "$SUCCESS" != "True" ]; then
    echo "ERROR: Request failed. Response:"
    echo "$RESPONSE"
    echo ""
    echo "To resume, run: ./scripts/embed-bills.sh $OFFSET"
    exit 1
  fi

  PROGRESS_NUM=$((OFFSET + PROCESSED))
  if [ "$TOTAL" -gt 0 ] 2>/dev/null; then
    PERCENT=$(( PROGRESS_NUM * 100 / TOTAL ))
  else
    PERCENT=0
  fi
  echo "  Processed: $PROCESSED | Succeeded: $SUCCEEDED | Errors: $ERRORS | Chunks: $CHUNKS | Duration: $DURATION"
  echo "  Progress: $PROGRESS_NUM / $TOTAL ($PERCENT%)"

  if [ "$HAS_MORE" != "True" ] || [ "$NEXT_OFFSET" = "null" ] || [ "$NEXT_OFFSET" = "None" ]; then
    echo ""
    echo "=== Embedding complete! ==="
    echo "Total bills processed through offset $PROGRESS_NUM of $TOTAL"
    exit 0
  fi

  OFFSET=$NEXT_OFFSET

  # Pause between batches (longer than resync since each bill hits NYS API + OpenAI)
  sleep 3
done
