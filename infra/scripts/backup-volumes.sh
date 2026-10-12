#!/usr/bin/env bash
# Backup Postgres dump + note volume names for Contabo snapshot workflow.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"

# shellcheck disable=SC1091
set -a
source .env
set +a

echo "Dumping Postgres to $OUT_DIR/pg_$STAMP.sql ..."
docker compose exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-ukulimabora}" "${POSTGRES_DB:-ukulimabora}" \
  > "$OUT_DIR/pg_$STAMP.sql"

echo "Volumes to include in host/Contabo snapshots: pgdata chroma_data models_data kb_data"
echo "Done: $OUT_DIR/pg_$STAMP.sql"
