#!/usr/bin/env bash
# Restore a pg_dump created by backup-volumes.sh into the Compose postgres service.
# Usage:
#   ./scripts/restore-volumes.sh ./backups/pg_YYYYMMDDTHHMMSSZ.sql
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <path-to-pg_dump.sql>"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

echo "WARNING: This replaces data in database '${POSTGRES_DB:-ukulimabora}'."
echo "Dump: $DUMP"
read -r -p "Type RESTORE to continue: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Dropping and recreating database..."
docker compose exec -T postgres \
  psql -U "${POSTGRES_USER:-ukulimabora}" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB:-ukulimabora}' AND pid <> pg_backend_pid();" \
  || true

docker compose exec -T postgres \
  psql -U "${POSTGRES_USER:-ukulimabora}" -d postgres \
  -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-ukulimabora};"

docker compose exec -T postgres \
  psql -U "${POSTGRES_USER:-ukulimabora}" -d postgres \
  -c "CREATE DATABASE ${POSTGRES_DB:-ukulimabora} OWNER ${POSTGRES_USER:-ukulimabora};"

echo "Restoring..."
docker compose exec -T postgres \
  psql -U "${POSTGRES_USER:-ukulimabora}" -d "${POSTGRES_DB:-ukulimabora}" \
  < "$DUMP"

echo "Running migrations to catch schema drift..."
docker compose run --rm api python manage.py migrate --noinput

echo "Restore complete. Spot-check: docker compose exec api python manage.py shell -c \"from django.contrib.auth.models import User; print(User.objects.count())\""
