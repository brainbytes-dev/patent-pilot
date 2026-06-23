# Patent Pilot — Coolify Pipeline Runbook

Pipeline läuft auf Proxmox/Coolify. Mac komplett raus.

## Architektur

```
Proxmox (NUC)
├── Coolify
│   ├── postgres-patent (Container, Port 5432 intern)
│   └── patent-pipeline (Docker Image, nur Cron-Jobs)
│
└── Supabase (extern, Web-App Read-Replica)
    └── ~1.5M enriched patents (gepusht via Sync-Cron)
```

**Flows:**
- Wöchentlich: EPO LEGSTAT Frontfile → local Postgres (neue Lapsed-Events)
- Täglich: EPO OPS API → local Postgres (Titel/Inhaber für unenriched Patents)
- Nach Enrichment: local Postgres → Supabase UPSERT (nur neue/geänderte Rows)

---

## Phase 1: Postgres auf Coolify einrichten

### 1.1 Service anlegen
In Coolify → New Resource → Database → PostgreSQL 16

| Feld | Wert |
|---|---|
| Name | `postgres-patent` |
| Version | 16 |
| Volume | `/var/lib/postgresql/data` (persistent) |
| Port (intern) | 5432 |
| DB Name | `patents` |
| User | `postgres` |
| Password | (sicher generieren, notieren) |

**Nicht** auf Public Port mappen — nur interne Coolify-Network-Verbindung.
Für SSH-Tunnel zum lokalen Zugriff: `ssh -L 15433:postgres-patent:5432 user@proxmox-ip`

### 1.2 Dump von lokalem Mac erstellen
```bash
# Lokale DB (Port 5433)
pg_dump -h localhost -p 5433 -U postgres patents \
  --no-owner --no-acl \
  -f /tmp/patents-dump.sql

# Oder komprimiert (empfohlen bei 20GB+)
pg_dump -h localhost -p 5433 -U postgres patents \
  --no-owner --no-acl -Fc \
  -f /tmp/patents-dump.pgdump
```

### 1.3 Dump auf Proxmox übertragen + restoren
```bash
# Zum Proxmox-NUC schieben
scp /tmp/patents-dump.pgdump user@proxmox-ip:/tmp/

# Auf Proxmox: in Coolify-Postgres restoren
# (Container-Name aus Coolify Dashboard kopieren)
ssh user@proxmox-ip
docker exec -i <postgres-patent-container> pg_restore \
  -U postgres -d patents --no-owner -Fc < /tmp/patents-dump.pgdump
```

### 1.4 Verifizieren
```bash
docker exec <postgres-patent-container> psql -U postgres -d patents \
  -c "SELECT count(*) FROM patents;"
# Erwartet: ~56M
```

---

## Phase 2: Pipeline-Image bauen und deployen

### 2.1 Image pushen (von Mac)
```bash
cd "/Users/henrik/Documents/VS Code/patent-pilot"

# Image bauen
docker build -f scripts/Dockerfile -t patent-pipeline:latest .

# Zu GitHub Container Registry pushen (oder direkt zu Coolify-Registry)
docker tag patent-pipeline:latest ghcr.io/brainbytes-dev/patent-pipeline:latest
docker push ghcr.io/brainbytes-dev/patent-pipeline:latest
```

### 2.2 In Coolify: Worker-Service anlegen
Coolify → New Resource → Application → Docker Image

| Feld | Wert |
|---|---|
| Image | `ghcr.io/brainbytes-dev/patent-pipeline:latest` |
| Name | `patent-pipeline` |
| Network | Gleiche wie `postgres-patent` (Coolify intern) |
| Start Command | `sleep infinity` (wird von Crons überschrieben) |
| Restart Policy | Unless Stopped |

### 2.3 Environment Variables (im Coolify UI eintragen)

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@postgres-patent:5432/patents

# EPO OPS (für enrich-ops.py)
EPO_OPS_CLIENT_ID=...
EPO_OPS_CLIENT_SECRET=...

# EPO BDDS (für fetch-legstat-weeks.sh)
LEGSTAT_BASE_URL=https://data.epo.org/bulk-data/...

# Supabase (für Sync-Cron)
SUPABASE_DATABASE_URL=postgresql://postgres.fstunlmzlwodztihkequ:<PW>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
```

---

## Phase 3: Cron-Jobs in Coolify

Coolify → patent-pipeline Service → Cron Jobs Tab

### Cron 1: Wöchentlicher LEGSTAT Delta (Montag 03:00)
```
Name:     legstat-weekly
Schedule: 0 3 * * 1
Command:  bash -c "
  LEGSTAT_BASE_URL=$LEGSTAT_BASE_URL \
    /app/fetch-legstat-weeks.sh $(date -d 'last week' +%G%V) $(date +%G%V) /tmp/legstat &&
  DATABASE_URL=$DATABASE_URL \
    python3 /app/update-legstat.py --dir=/tmp/legstat &&
  rm -rf /tmp/legstat
"
```

### Cron 2: Tägliche Enrichment (täglich 02:00)
```
Name:     enrich-daily
Schedule: 0 2 * * *
Command:  DATABASE_URL=$DATABASE_URL
          EPO_OPS_CLIENT_ID=$EPO_OPS_CLIENT_ID
          EPO_OPS_CLIENT_SECRET=$EPO_OPS_CLIENT_SECRET
          python3 /app/enrich-ops.py --concurrency=4
```

### Cron 3: Sync zu Supabase (täglich 06:00, nach Enrichment)
```
Name:     sync-supabase
Schedule: 0 6 * * *
Command:  python3 /app/sync-to-supabase.py
```

> **Hinweis:** sync-to-supabase.py muss noch gebaut werden (siehe Phase 4).

---

## Phase 4: Sync-Script (local → Supabase)

Das Script pushed nur neu enriched Patents (die seit dem letzten Sync ein title bekommen haben):

```python
# scripts/sync-to-supabase.py
# Läuft auf Coolify, liest aus local Postgres, schreibt nach Supabase
#
# Strategy: UPSERT alle Rows wo updated_at > last_sync_ts
# last_sync_ts wird in einer lokalen Datei /tmp/last-sync.txt gespeichert
```

**Befehl zum manuellen Sync (einmalig für Erstbefüllung):**
```bash
docker exec patent-pipeline python3 /app/sync-to-supabase.py --full
```

---

## Betrieb & Monitoring

### Logs checken
```bash
# In Coolify Dashboard: patent-pipeline → Logs
# Oder direkt:
docker logs patent-pipeline --tail=100 -f
```

### Manuell triggern
```bash
# Enrichment sofort starten
docker exec patent-pipeline \
  env DATABASE_URL=$DATABASE_URL EPO_OPS_CLIENT_ID=... EPO_OPS_CLIENT_SECRET=... \
  python3 /app/enrich-ops.py --concurrency=4

# LEGSTAT manuell für eine Woche
docker exec patent-pipeline \
  bash -c "DATABASE_URL=... python3 /app/update-legstat.py --dir=/tmp/legstat --fetch"
```

### Resume nach Absturz
Alle Scripts haben Resume-Support via `/tmp/*-cursor.json`. Bei Neustart einfach nochmal starten — überspringt bereits verarbeitete Records automatisch.

---

## Offene Tasks

- [ ] sync-to-supabase.py bauen (Phase 4)
- [ ] GitHub Container Registry für `patent-pipeline` image aufsetzen
- [ ] Erstdump vom Mac zu Proxmox übertragen
- [ ] LEGSTAT_BASE_URL für fetch-legstat-weeks.sh notieren (aus EPO BDDS Account)
- [ ] EPO OPS Client Credentials in Coolify eintragen
- [ ] Nach Migration: Mac-Crons / lokale Postgres deaktivieren
