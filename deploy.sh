#!/usr/bin/env bash
# Ukulimabora redeploy — pull latest code + rebuild + migrate + verify.
# Usage: bash deploy.sh   (run from anywhere)
set -euo pipefail

cd /var/www/ukulimabora.co.ke

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Rebuilding & restarting containers"
docker compose up -d --build

echo "==> Running migrations (idempotent)"
docker compose exec -T api python manage.py migrate --noinput

echo "==> Health check"
sleep 2
curl -sf http://127.0.0.1:8000/api/v1/health/ -H 'Host: ukulimabora.co.ke' \
  && echo "HEALTH OK" \
  || echo "HEALTH CHECK FAILED — run: docker compose logs api"

echo "==> Status"
docker compose ps
