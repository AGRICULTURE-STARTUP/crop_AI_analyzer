# Contabo: server logs & database access

**Stack path on VPS:** `/opt/agriscan/crop_AI_analyzer/infra`  
**Compose file:** `docker-compose.yml`  
**DB credentials:** `infra/.env` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — usually `agriscan`)

Always start from the infra directory:

```bash
cd /opt/agriscan/crop_AI_analyzer/infra
```

---

## 1. Server logs

| What | Command |
| ---- | ------- |
| All services (live follow) | `docker compose -f docker-compose.yml logs -f` |
| API only | `docker compose -f docker-compose.yml logs -f api` |
| Nginx | `docker compose -f docker-compose.yml logs -f nginx` |
| Scanner worker | `docker compose -f docker-compose.yml logs -f worker_scanner` |
| RAG worker | `docker compose -f docker-compose.yml logs -f worker_rag` |
| Postgres | `docker compose -f docker-compose.yml logs -f postgres` |
| Redis | `docker compose -f docker-compose.yml logs -f redis` |
| Last 100 lines (API) | `docker compose -f docker-compose.yml logs --tail=100 api` |
| Last 100 lines (all) | `docker compose -f docker-compose.yml logs --tail=100` |

Press `Ctrl+C` to stop following. Containers keep running.

### Useful status checks

```bash
docker compose -f docker-compose.yml ps
curl -s https://api.agriscan.co.ke/api/v1/health/
```

---

## 2. Database access (Postgres)

Postgres runs inside Docker and is **not** exposed on the public internet. Connect via `docker compose exec`.

### Option A — `psql` (list tables, inspect rows)

```bash
cd /opt/agriscan/crop_AI_analyzer/infra
docker compose -f docker-compose.yml exec postgres \
  psql -U agriscan -d agriscan
```

If your `.env` uses different `POSTGRES_USER` / `POSTGRES_DB`, substitute those values.

**Inside `psql`:**

```sql
\dt                                          -- list tables
\d+                                          -- tables with sizes / detail
\d tablename                                 -- describe one table
SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' ORDER BY 1;    -- all public tables
SELECT * FROM auth_user LIMIT 20;            -- example query
\q                                           -- quit
```

**One-shot (no interactive shell):**

```bash
docker compose -f docker-compose.yml exec postgres \
  psql -U agriscan -d agriscan -c '\dt'

docker compose -f docker-compose.yml exec postgres \
  psql -U agriscan -d agriscan -c 'SELECT id, email, username FROM auth_user LIMIT 20;'
```

### Option B — Django DB shell

```bash
docker compose -f docker-compose.yml exec api python manage.py dbshell
```

### Option C — Django admin (browser)

Django admin is currently **disabled** in code (`path('admin/', admin.site.urls)` is commented out in `apps/api/AgriProject/urls.py`).

To enable it:

1. Uncomment `path('admin/', admin.site.urls)` in `apps/api/AgriProject/urls.py`.
2. Create a superuser:

   ```bash
   docker compose -f docker-compose.yml exec api python manage.py createsuperuser
   ```

3. Rebuild / restart the API, then open:

   `https://api.agriscan.co.ke/admin/`

Until admin is enabled, use `psql` (Option A) to inspect tables.

### Option D — GUI from your laptop (TablePlus, DBeaver, etc.)

Do **not** publish Postgres on `0.0.0.0:5432`. Prefer SSH + localhost only.

1. On the VPS, optionally publish Postgres only on loopback by adding under the `postgres` service in `docker-compose.yml`:

   ```yaml
   ports:
     - "127.0.0.1:5432:5432"
   ```

   Then recreate:

   ```bash
   docker compose -f docker-compose.yml up -d postgres
   ```

2. On your laptop, open an SSH tunnel:

   ```bash
   ssh -L 5433:127.0.0.1:5432 root@YOUR_CONTABO_IP
   ```

3. Connect the GUI to:

   - Host: `127.0.0.1`
   - Port: `5433`
   - User / password / database: values from `infra/.env`

---

## 3. TLS certificate renewal (related ops)

Certbot was issued for `api.agriscan.co.ke`. Manual renew:

```bash
cd /opt/agriscan/crop_AI_analyzer/infra
docker compose -f docker-compose.yml --profile certs run --rm \
  --entrypoint certbot certbot renew
docker compose -f docker-compose.yml exec nginx nginx -s reload
```

Suggested monthly cron (`crontab -e` as root):

```cron
0 3 1 * * cd /opt/agriscan/crop_AI_analyzer/infra && docker compose -f docker-compose.yml --profile certs run --rm --entrypoint certbot certbot renew && docker compose -f docker-compose.yml exec nginx nginx -s reload
```

---

## 4. Quick reference

```bash
cd /opt/agriscan/crop_AI_analyzer/infra

# Live API logs
docker compose -f docker-compose.yml logs -f api

# Open database
docker compose -f docker-compose.yml exec postgres psql -U agriscan -d agriscan

# Health
curl -s https://api.agriscan.co.ke/api/v1/health/
```
