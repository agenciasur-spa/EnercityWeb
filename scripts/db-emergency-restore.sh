#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# db-emergency-restore.sh
# Restores all CMS tables to PRODUCTION from a dump directory.
#
# WARNING: This DELETES existing data before inserting.
# Tables with FK constraints (comunas, precios_kits) use PATCH
# instead of DELETE+INSERT to preserve referential integrity.
#
# Usage:
#   ./scripts/db-emergency-restore.sh backups/db-dump-2026-05-13T150000Z/
#
# Required env vars:
#   SUPABASE_URL=https://...
#   SUPABASE_SERVICE_KEY=eyJ...
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# --- Config ---
URL="${SUPABASE_URL:-}"
KEY="${SUPABASE_SERVICE_KEY:-}"
DUMP_DIR="${1:-}"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY"
  exit 1
fi

if [ -z "$DUMP_DIR" ] || [ ! -d "$DUMP_DIR" ]; then
  echo "ERROR: Pass dump directory as argument"
  echo "  ./scripts/db-emergency-restore.sh backups/db-dump-2026-05-13T150000Z/"
  exit 1
fi

# Tables that can be wiped (no FK dependencies)
WIPE_TABLES=("stats" "projects" "solutions" "nav_links")
# Tables with FK from leads — use PATCH by ID
FK_TABLES=("comunas" "precios_kits")
# Tables with string PK — use PATCH by key
PATCH_TABLES=("settings" "site_content")

HEADER_AUTH="Authorization: Bearer ${KEY}"

echo "╔══════════════════════════════════════════════════╗"
echo "║  ⚠️  PRODUCTION RESTORE — VERIFY BEFORE CONTINUE  ║"
echo "╚══════════════════════════════════════════════════╝"
echo "Target:  ${URL}"
echo "Source:  ${DUMP_DIR}/"

if [ -f "${DUMP_DIR}/meta.json" ]; then
  echo "Dumped:  $(jq -r '.timestamp' "${DUMP_DIR}/meta.json")"
fi

echo ""
read -p "Type 'RESTORE' to proceed: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Aborted."
  exit 0
fi
echo ""

# --- 1) Wipe tables (DELETE all, then INSERT) ---
for table in "${WIPE_TABLES[@]}"; do
  INFILE="${DUMP_DIR}/${table}.json"
  [ ! -f "$INFILE" ] && { echo "  SKIP ${table} (no file)"; continue; }

  echo "=== ${table} (wipe + insert) ==="

  # Delete all
  curl -sf -X DELETE "${URL}/rest/v1/${table}?id=not.is.null" \
    -H "apikey: ${KEY}" \
    -H "${HEADER_AUTH}" \
    -H "Prefer: return=minimal" || echo "  DELETE failed"
  echo "  Deleted existing rows"

  # Insert from dump
  RESULT=$(curl -sf -X POST "${URL}/rest/v1/${table}" \
    -H "apikey: ${KEY}" \
    -H "${HEADER_AUTH}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d @"$INFILE" 2>&1) || {
    echo "  INSERT error: ${RESULT}"
    continue
  }

  COUNT=$(curl -sf "${URL}/rest/v1/${table}?select=id" \
    -H "apikey: ${KEY}" \
    -H "${HEADER_AUTH}" | jq '. | length')
  echo "  Restored: ${COUNT} rows"
done

# --- 2) FK tables (PATCH by id) ---
for table in "${FK_TABLES[@]}"; do
  INFILE="${DUMP_DIR}/${table}.json"
  [ ! -f "$INFILE" ] && { echo "  SKIP ${table} (no file)"; continue; }

  echo "=== ${table} (patch by id) ==="
  TOTAL=$(jq '. | length' "$INFILE")
  PATCHED=0

  jq -c '.[]' "$INFILE" | while read -r record; do
    ID=$(echo "$record" | jq -r '.id')
    curl -sf -X PATCH "${URL}/rest/v1/${table}?id=eq.${ID}" \
      -H "apikey: ${KEY}" \
      -H "${HEADER_AUTH}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "$record" || echo "  PATCH failed for id=${ID}"
    PATCHED=$((PATCHED + 1))
  done
  echo "  Patched ${TOTAL} rows"
done

# --- 3) Settings (PATCH by key) ---
SETTINGS_FILE="${DUMP_DIR}/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  echo "=== settings (patch by key) ==="
  TOTAL=$(jq '. | length' "$SETTINGS_FILE")

  jq -c '.[]' "$SETTINGS_FILE" | while read -r record; do
    KEY_NAME=$(echo "$record" | jq -r '.key')
    curl -sf -X PATCH "${URL}/rest/v1/settings?key=eq.${KEY_NAME}" \
      -H "apikey: ${KEY}" \
      -H "${HEADER_AUTH}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "$record" || echo "  PATCH failed for key=${KEY_NAME}"
  done
  echo "  Patched ${TOTAL} rows"
fi

# --- 4) Site content (PATCH by section) ---
SC_FILE="${DUMP_DIR}/site_content.json"
if [ -f "$SC_FILE" ]; then
  echo "=== site_content (patch by section) ==="
  TOTAL=$(jq '. | length' "$SC_FILE")

  jq -c '.[]' "$SC_FILE" | while read -r record; do
    SECTION=$(echo "$record" | jq -r '.section')
    # Extract only the data field for the PATCH
    DATA_ONLY=$(echo "$record" | jq '{data: .data}')
    curl -sf -X PATCH "${URL}/rest/v1/site_content?section=eq.${SECTION}" \
      -H "apikey: ${KEY}" \
      -H "${HEADER_AUTH}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "$DATA_ONLY" || echo "  PATCH failed for section=${SECTION}"
  done
  echo "  Patched ${TOTAL} rows"
fi

echo ""
echo "=== Restore complete. Verify at https://enercity-web.vercel.app/ ==="
