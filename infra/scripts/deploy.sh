#!/usr/bin/env bash
# Deploy Ukulima Bora Compose stack on Contabo (run from infra/ or any cwd).
# Explicitly uses docker-compose.yml only — never loads the dev override.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.yml"

if [[ ! -f .env ]]; then
  echo "Missing infra/.env — copy .env.example and fill secrets."
  exit 1
fi

$COMPOSE pull || true
$COMPOSE build

# Database migrations
$COMPOSE run --rm api python manage.py migrate --noinput
$COMPOSE run --rm api python manage.py collectstatic --noinput

# Download and validate all 18 crop models into /models volume.
echo "Syncing crop models from Hugging Face…"
$COMPOSE run --rm \
  -e HF_HUB_OFFLINE=0 \
  worker_scanner python manage.py sync_models

# Start/restart all services
$COMPOSE up -d
$COMPOSE ps
echo "Deploy complete. Tail logs: $COMPOSE logs -f api worker_scanner worker_rag"
