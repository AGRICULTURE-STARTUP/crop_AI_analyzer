#!/usr/bin/env bash
# Ukulimabora auto-deploy watcher.
# Run by cron every 2 minutes. Only rebuilds when origin/main has new commits.
set -euo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export GIT_PAGER=cat

cd /var/www/ukulimabora.co.ke
LOG=/var/www/ukulimabora.co.ke/auto-deploy.log

# Prevent overlapping runs (e.g. a slow build while the next cron tick fires).
exec 9>/var/www/ukulimabora.co.ke/.auto-deploy.lock
flock -n 9 || { echo "$(date -u +%FT%TZ) another deploy running, skip"; exit 0; }

{
  echo "=== $(date -u +%FT%TZ) check ==="
  git fetch origin

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)

  if [ "$LOCAL" = "$REMOTE" ]; then
    echo "No new commits (HEAD $LOCAL). Nothing to do."
    exit 0
  fi

  echo "New commits detected: $LOCAL -> $REMOTE"
  git pull --ff-only

  echo "==> rebuild + restart"
  docker compose up -d --build

  echo "==> migrate"
  docker compose exec -T api python manage.py migrate --noinput

  echo "==> health"
  curl -sf http://127.0.0.1:8000/api/v1/health/ -H 'Host: ukulimabora.co.ke' \
    && echo "HEALTH OK" \
    || echo "HEALTH CHECK FAILED — run: docker compose logs api"

  echo "==> status"
  docker compose ps
  echo "=== deploy complete ==="
} >> "$LOG" 2>&1
