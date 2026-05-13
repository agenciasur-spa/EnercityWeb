#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# db-emergency-dump.sh
# Dumps all CMS tables from PRODUCTION Supabase to JSON files.
# Run when the site is healthy — keep as a restore point.
#
# Usage:
#   ./scripts/db-emergency-dump.sh                     # interactive
#   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=eyJ... ./scripts/db-emergency-dump.sh
#
# Output: backups/db-dump-YYYY-MM-DDTHHMMSS/
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# --- Config ---
URL="${SUPABASE_URL:-}"
KEY="${SUPABASE_SERVICE_KEY:-}"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY"
  echo ""
  echo "  export SUPABASE_URL=https://ydkrzmmeklplnpsykltl.supabase.co"
  echo "  export SUPABASE_SERVICE_KEY=eyJ..."
  echo "  ./scripts/db-emergency-dump.sh"
  exit 1
fi

TABLES=("site_content" "stats" "projects" "solutions" "nav_links" "settings" "comunas" "precios_kits")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H%M%SZ")
OUT_DIR="backups/db-dump-${TIMESTAMP}"
HEADER_AUTH="Authorization: Bearer ${KEY}"

mkdir -p "$OUT_DIR"

echo "=== Emergency Dump — ${TIMESTAMP} ==="
echo "Target: ${URL}"
echo "Output: ${OUT_DIR}/"
echo ""

for table in "${TABLES[@]}"; do
  OUTFILE="${OUT_DIR}/${table}.json"
  echo -n "  ${table}... "

  # settings has no id column, site_content orders by section
  ORDER=""
  case "$table" in
    settings)       ORDER="" ;;
    site_content)   ORDER="&order=section" ;;
    nav_links)      ORDER="&order=location,sort_order" ;;
    *)              ORDER="&order=id" ;;
  esac

  DATA=$(curl -sf "${URL}/rest/v1/${table}?select=*${ORDER}" \
    -H "apikey: ${KEY}" \
    -H "${HEADER_AUTH}" \
    -H "Accept: application/json") || {
    echo "FAILED (curl error)"
    continue
  }

  COUNT=$(echo "$DATA" | jq '. | length')
  echo "$DATA" | jq '.' > "$OUTFILE"
  echo "${COUNT} rows → ${OUTFILE}"
done

# Save metadata
cat > "${OUT_DIR}/meta.json" << META
{
  "timestamp": "${TIMESTAMP}",
  "source": "${URL}",
  "tables": $(printf '%s\n' "${TABLES[@]}" | jq -R . | jq -s .),
  "generated_by": "db-emergency-dump.sh"
}
META

echo ""
echo "=== Done. Verify with: jq . ${OUT_DIR}/meta.json ==="
echo "=== To restore: ./scripts/db-emergency-restore.sh ${OUT_DIR} ==="
