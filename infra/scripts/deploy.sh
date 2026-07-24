#!/usr/bin/env bash
# Deploy AgriScan Compose stack on Contabo (run from infra/ or any cwd).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing infra/.env — copy .env.example and fill secrets."
  exit 1
fi

docker compose pull || true
docker compose build
docker compose run --rm api python manage.py migrate --noinput
docker compose run --rm api python manage.py collectstatic --noinput
docker compose up -d
docker compose ps
echo "Deploy complete. Tail logs: docker compose logs -f api worker_scanner worker_rag"
