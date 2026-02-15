#!/bin/bash
# Sync Senate committee data (chair, members, meeting schedule) from NYS API.
# Assembly data is not available via API — fill in manually.
# Usage: ./scripts/sync-committees.sh [session_year]

SUPABASE_URL="https://kwyjohornlgujoqypyvu.supabase.co/functions/v1/sync-members"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eWpvaG9ybmxndWpvcXlweXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTAyODcsImV4cCI6MjA2NzE4NjI4N30.nPewQZse07MkYAK5W9wCEwYhnndHkA8pKmedgHkvD9M"
SESSION_YEAR=${1:-2025}

echo "=== Senate Committee Sync ==="
echo "Session year: $SESSION_YEAR"
echo ""

echo "[$(date '+%H:%M:%S')] Syncing Senate committees..."

RESPONSE=$(curl -s -X POST "$SUPABASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -d "{\"action\":\"sync-senate-committees\",\"sessionYear\":$SESSION_YEAR}")

# Parse response
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
TOTAL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalFetched',0))" 2>/dev/null)
MATCHED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('matched',0))" 2>/dev/null)
UPDATED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('updated',0))" 2>/dev/null)
UNMATCHED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('unmatched',0))" 2>/dev/null)
ERRORS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',0))" 2>/dev/null)
DURATION=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('duration','?'))" 2>/dev/null)

if [ "$SUCCESS" != "True" ]; then
  echo "ERROR: Sync failed. Response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo ""
echo "=== Sync Complete ==="
echo "  Total fetched:  $TOTAL"
echo "  Matched:        $MATCHED"
echo "  Updated:        $UPDATED"
echo "  Unmatched:      $UNMATCHED"
echo "  Errors:         $ERRORS"
echo "  Duration:       $DURATION"

# Show unmatched committee names
if [ "$UNMATCHED" != "0" ] && [ "$UNMATCHED" != "" ]; then
  echo ""
  echo "Unmatched API committees (no DB match found):"
  echo "$RESPONSE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for name in d.get('unmatchedNames', []):
    print(f'  - {name}')
" 2>/dev/null
fi

# Show error details if any
if [ "$ERRORS" != "0" ] && [ "$ERRORS" != "" ]; then
  echo ""
  echo "Error details:"
  echo "$RESPONSE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for e in d.get('errorDetails', []):
    print(f'  - {e}')
" 2>/dev/null
fi
