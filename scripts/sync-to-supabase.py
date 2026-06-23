#!/usr/bin/env python3
"""
Sync enriched patents from local Postgres (Coolify) → Supabase.

Liest nur Rows wo updated_at > last_sync_ts UND title IS NOT NULL (enriched).
UPSERT nach Supabase via ON CONFLICT (patent_number) DO UPDATE.
Ueberspringt raw_data (zu gross) und search_vector (generated column).

Resume: /tmp/sync-supabase-cursor.json  (speichert last_sync_ts)

Usage:
    DATABASE_URL=...          # lokale Coolify-Postgres
    SUPABASE_DATABASE_URL=... # Supabase Pooler
    python3 scripts/sync-to-supabase.py [--full] [--dry-run] [--batch=500]

    --full     Ignoriert last_sync_ts, synct alle enriched Patents
    --dry-run  Zeigt was gemacht wuerde, schreibt nichts
    --batch=N  Rows pro Commit (default: 500)
"""

import sys, os, json, signal
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

FULL       = "--full"     in sys.argv
DRY        = "--dry-run"  in sys.argv
BATCH      = int(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--batch=")), "500"))
SRC_URL    = os.environ.get("DATABASE_URL",          "postgresql://postgres:postgres@localhost:5433/patent_pilot")
DST_URL    = os.environ.get("SUPABASE_DATABASE_URL", "")
CURSOR     = Path("/tmp/sync-supabase-cursor.json")

# Spalten die wir syncen — kein raw_data (zu gross), kein search_vector (generated)
COLS = [
    "id", "patent_number", "title", "title_de", "abstract_en", "abstract_de",
    "filing_date", "grant_date", "expiry_date", "lapsed_at",
    "owner", "cpc_codes", "status", "source", "created_at", "updated_at",
]

# Spalten die bei Konflikt aktualisiert werden (id und patent_number sind Schluessel)
UPDATE_COLS = [c for c in COLS if c not in ("id", "patent_number", "created_at")]

if not DST_URL:
    print("SUPABASE_DATABASE_URL fehlt")
    sys.exit(1)

# ── Cursor ────────────────────────────────────────────────────────────────────

def load_cursor() -> str | None:
    if FULL:
        return None
    if CURSOR.exists():
        try:
            return json.loads(CURSOR.read_text()).get("last_sync_ts")
        except Exception:
            pass
    return None

def save_cursor(ts: str) -> None:
    if not DRY:
        CURSOR.write_text(json.dumps({"last_sync_ts": ts, "updated": datetime.now(timezone.utc).isoformat()}))

# ── Signal ────────────────────────────────────────────────────────────────────

_stop = False
def _on_signal(sig, _):
    global _stop
    print(f"\nSignal {sig} — stoppe nach aktuellem Batch")
    _stop = True
signal.signal(signal.SIGINT,  _on_signal)
signal.signal(signal.SIGTERM, _on_signal)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    last_sync = load_cursor()

    if last_sync:
        print(f"Inkrementell: updated_at > {last_sync}")
    else:
        print("Voll-Sync: alle enriched Patents")

    src = psycopg2.connect(SRC_URL)
    dst = psycopg2.connect(DST_URL) if not DRY else None

    src.set_session(readonly=True)

    cols_sql  = ", ".join(COLS)
    where     = "title IS NOT NULL AND title NOT IN ('[no data]', '[error]')"
    if last_sync:
        where += f" AND updated_at > '{last_sync}'"

    # Timestamp VOR dem Lesen merken — naechstes Mal ab hier syncen
    run_start = datetime.now(timezone.utc).isoformat()

    count_sql = f"SELECT count(*) FROM patents WHERE {where}"
    with src.cursor() as cur:
        cur.execute(count_sql)
        total = cur.fetchone()[0]

    print(f"{total:,} Rows zu syncen (batch={BATCH}, dry={DRY})")

    if total == 0:
        print("Nichts zu tun.")
        src.close()
        if dst: dst.close()
        save_cursor(run_start)
        return

    # UPSERT template
    placeholders  = ", ".join(["%s"] * len(COLS))
    update_set    = ", ".join(f"{c} = EXCLUDED.{c}" for c in UPDATE_COLS)
    upsert_sql    = (
        f"INSERT INTO patents ({cols_sql}) VALUES %s "
        f"ON CONFLICT (patent_number) DO UPDATE SET {update_set}"
    )

    select_sql = (
        f"SELECT {cols_sql} FROM patents WHERE {where} "
        f"ORDER BY updated_at ASC, id ASC"
    )

    synced = 0
    batch  = []

    with src.cursor(name="sync_cursor", cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.itersize = BATCH
        cur.execute(select_sql)

        for row in cur:
            if _stop:
                break

            # psycopg2 liefert Listen fuer Arrays — Supabase erwartet das gleiche
            batch.append(tuple(row[c] for c in COLS))

            if len(batch) >= BATCH:
                if not DRY and dst:
                    with dst.cursor() as wcur:
                        psycopg2.extras.execute_values(wcur, upsert_sql, batch, page_size=BATCH)
                    dst.commit()
                synced += len(batch)
                print(f"  {synced:,} / {total:,} ({100*synced//total}%)")
                batch = []

        # Restliche Rows
        if batch and not DRY and dst:
            with dst.cursor() as wcur:
                psycopg2.extras.execute_values(wcur, upsert_sql, batch, page_size=BATCH)
            dst.commit()
        synced += len(batch)

    src.close()
    if dst: dst.close()

    print(f"Fertig: {synced:,} Rows {'simuliert' if DRY else 'nach Supabase gesynct'}.")

    if not _stop and not DRY:
        save_cursor(run_start)
        print(f"Cursor gesetzt: {run_start}")
    elif _stop:
        print("Abgebrochen — Cursor NICHT aktualisiert (naechster Lauf wiederholt)")

if __name__ == "__main__":
    main()
