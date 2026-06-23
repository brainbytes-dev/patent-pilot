#!/usr/bin/env python3
"""
USPTO PatentsView Bulk Enricher — Titel, Owner, CPC für alle US-Patente.

Lädt drei TSV-ZIPs von PatentsView (je ~0.2-1GB), streamt zeilenweise,
matched gegen unsere DB, updated Titel/Owner/CPC. Kein Rate-Limit.

Peak-Disk: ~1.5GB (eine Datei nach der anderen, danach gelöscht).

Usage:
    DATABASE_URL=... python3 scripts/enrich-uspto.py [--dry-run]
"""

import sys, os, re, json, io, zipfile, urllib.request, signal
from pathlib import Path
from collections import defaultdict

import psycopg2
from psycopg2.extras import execute_values

DRY         = "--dry-run" in sys.argv
DB          = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/patent_pilot")
WORK_DIR    = Path("/tmp/uspto-work")
CURSOR_FILE = Path("/tmp/enrich-uspto-cursor.json")
BATCH_SIZE  = 1000

# PatentsView download URLs (aktuellste Version)
FILES = {
    "patent":   "https://data.patentsview.org/download/g_patent.tsv.zip",
    "assignee": "https://data.patentsview.org/download/g_assignee.tsv.zip",
    "cpc":      "https://data.patentsview.org/download/g_cpc_current.tsv.zip",
}

# ── DB ────────────────────────────────────────────────────────────────────────
conn = psycopg2.connect(DB)
conn.autocommit = False
cur  = conn.cursor()


def flush(rows: list[tuple], sql: str):
    if not rows or DRY:
        return
    execute_values(cur, sql, rows)
    conn.commit()


# ── Cursor ────────────────────────────────────────────────────────────────────
def load_cursor() -> dict:
    try:
        return json.loads(CURSOR_FILE.read_text())
    except Exception:
        return {}


def save_cursor(stage: str):
    CURSOR_FILE.write_text(json.dumps({"stage": stage}))


# ── Download mit Fortschritt ──────────────────────────────────────────────────
def download(url: str, dest: Path):
    if dest.exists():
        print(f"  Bereits vorhanden: {dest.name}")
        return
    print(f"  Download: {url}")
    WORK_DIR.mkdir(exist_ok=True)
    tmp = dest.with_suffix(".tmp")
    with urllib.request.urlopen(url, timeout=60) as r:
        total = int(r.headers.get("Content-Length", 0))
        downloaded = 0
        with open(tmp, "wb") as f:
            while True:
                chunk = r.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    print(f"\r  {downloaded/1024/1024:.0f}MB / {total/1024/1024:.0f}MB ({pct:.0f}%)", end="", flush=True)
    tmp.rename(dest)
    print(f"\n  Fertig: {dest.name}")


# ── Patent-Number Matching ────────────────────────────────────────────────────
# PatentsView patent_id: "10000000", "RE12345", "D0123456", "PP012345"
# Unsere DB:             "US10000000B2", "USRE12345E", "USD0123456S"

def normalize_pv_id(patent_id: str) -> str:
    """PatentsView ID → vergleichbare Form (nur Zahl/Prefix)."""
    return patent_id.strip().lstrip("0") or "0"


def build_us_lookup() -> dict[str, str]:
    """Lädt alle US patent_number → id aus DB. ~200MB RAM für 11M Records."""
    print("  Lade US-Patente aus DB...")
    cur.execute("SELECT id, patent_number FROM patents WHERE source = 'us'")
    lookup = {}
    for db_id, pn in cur:
        # US10000000B2 → extrahiere Kernzahl: strip US-Prefix, strip Kind-Suffix
        core = re.sub(r'^US', '', pn)         # → 10000000B2
        core = re.sub(r'[A-Z]\d?$', '', core) # → 10000000
        core = core.lstrip("0") or "0"
        lookup[core] = str(db_id)
    print(f"  {len(lookup):,} US-Patente geladen")
    return lookup


# ── Signal ────────────────────────────────────────────────────────────────────
_stop = False
def _sig(sig, frame):
    global _stop
    print("\n[STOP]")
    _stop = True
signal.signal(signal.SIGINT, _sig)
signal.signal(signal.SIGTERM, _sig)


# ── Stage 1: Titel ────────────────────────────────────────────────────────────
def stage_patent(lookup: dict[str, str]):
    path = WORK_DIR / "g_patent.tsv.zip"
    download(FILES["patent"], path)

    print("\n  Verarbeite Titel...")
    matched = skipped = 0
    batch: list[tuple] = []

    with zipfile.ZipFile(path) as zf:
        name = [n for n in zf.namelist() if n.endswith(".tsv")][0]
        with zf.open(name) as raw:
            header = raw.readline().decode("utf-8").strip().split("\t")
            try:
                id_col    = header.index("patent_id")
                title_col = header.index("patent_title")
            except ValueError:
                # Fallback für ältere Schemas
                id_col, title_col = 0, 2

            for line in raw:
                if _stop: break
                parts = line.decode("utf-8", errors="replace").strip().split("\t")
                if len(parts) <= max(id_col, title_col):
                    continue
                pv_id = normalize_pv_id(parts[id_col])
                title = parts[title_col].strip()
                if not title or not pv_id:
                    continue
                db_id = lookup.get(pv_id)
                if not db_id:
                    skipped += 1
                    continue
                batch.append((title, db_id))
                matched += 1
                if len(batch) >= BATCH_SIZE:
                    flush(batch, """
                        UPDATE patents SET
                          title      = data.title,
                          updated_at = now()
                        FROM (VALUES %s) AS data(title, id)
                        WHERE patents.id = data.id::uuid
                          AND (patents.title IS NULL OR patents.title IN ('[no data]', '[error]'))
                    """)
                    batch.clear()
                    print(f"\r  {matched:,} matched | {skipped:,} kein Match", end="", flush=True)

    flush(batch, """
        UPDATE patents SET title = data.title, updated_at = now()
        FROM (VALUES %s) AS data(title, id)
        WHERE patents.id = data.id::uuid
          AND (patents.title IS NULL OR patents.title IN ('[no data]', '[error]'))
    """)
    print(f"\n  Titel: {matched:,} gematcht")
    path.unlink(missing_ok=True)


# ── Stage 2: Owner ────────────────────────────────────────────────────────────
def stage_assignee(lookup: dict[str, str]):
    path = WORK_DIR / "g_assignee.tsv.zip"
    download(FILES["assignee"], path)

    print("\n  Verarbeite Owner...")
    # Erste Assignee pro Patent nehmen
    best: dict[str, str] = {}  # patent_core → assignee_name

    with zipfile.ZipFile(path) as zf:
        name = [n for n in zf.namelist() if n.endswith(".tsv")][0]
        with zf.open(name) as raw:
            header = raw.readline().decode("utf-8").strip().split("\t")
            try:
                id_col   = header.index("patent_id")
                org_col  = header.index("assignee_organization")
            except ValueError:
                id_col, org_col = 1, 3

            for line in raw:
                if _stop: break
                parts = line.decode("utf-8", errors="replace").strip().split("\t")
                if len(parts) <= max(id_col, org_col):
                    continue
                pv_id = normalize_pv_id(parts[id_col])
                org   = parts[org_col].strip()
                if not org or pv_id in best:
                    continue
                if lookup.get(pv_id):
                    best[pv_id] = org

    batch = [(name, lookup[pid]) for pid, name in best.items() if lookup.get(pid)]
    for i in range(0, len(batch), BATCH_SIZE):
        if _stop: break
        flush(batch[i:i+BATCH_SIZE], """
            UPDATE patents SET
              owner      = COALESCE(patents.owner, data.owner),
              updated_at = now()
            FROM (VALUES %s) AS data(owner, id)
            WHERE patents.id = data.id::uuid
        """)
    print(f"  Owner: {len(batch):,} gematcht")
    path.unlink(missing_ok=True)


# ── Stage 3: CPC ─────────────────────────────────────────────────────────────
def stage_cpc(lookup: dict[str, str]):
    path = WORK_DIR / "g_cpc_current.tsv.zip"
    download(FILES["cpc"], path)

    print("\n  Verarbeite CPC-Codes...")
    patent_cpcs: dict[str, list[str]] = defaultdict(list)

    with zipfile.ZipFile(path) as zf:
        name = [n for n in zf.namelist() if n.endswith(".tsv")][0]
        with zf.open(name) as raw:
            header = raw.readline().decode("utf-8").strip().split("\t")
            try:
                id_col   = header.index("patent_id")
                cpc_col  = header.index("cpc_subgroup_id")
            except ValueError:
                id_col, cpc_col = 1, 3

            for line in raw:
                if _stop: break
                parts = line.decode("utf-8", errors="replace").strip().split("\t")
                if len(parts) <= max(id_col, cpc_col):
                    continue
                pv_id = normalize_pv_id(parts[id_col])
                cpc   = parts[cpc_col].strip().replace("/", "")  # H04L63/00 → H04L6300
                if not cpc or not lookup.get(pv_id):
                    continue
                cpcs = patent_cpcs[pv_id]
                if cpc not in cpcs and len(cpcs) < 8:
                    cpcs.append(cpc)

    batch = [(patent_cpcs[pid], lookup[pid]) for pid in patent_cpcs if lookup.get(pid)]
    for i in range(0, len(batch), BATCH_SIZE):
        if _stop: break
        flush(batch[i:i+BATCH_SIZE], """
            UPDATE patents SET
              cpc_codes  = CASE WHEN cpc_codes = '{}' THEN data.cpc_codes ELSE cpc_codes END,
              updated_at = now()
            FROM (VALUES %s) AS data(cpc_codes, id)
            WHERE patents.id = data.id::uuid
        """)
    print(f"  CPC: {len(batch):,} Patente aktualisiert")
    path.unlink(missing_ok=True)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"USPTO PatentsView Enricher | DRY={DRY}")
    WORK_DIR.mkdir(exist_ok=True)

    cursor = load_cursor()
    done   = cursor.get("stage", "")

    lookup = build_us_lookup()

    stages = [
        ("patent",   stage_patent),
        ("assignee", stage_assignee),
        ("cpc",      stage_cpc),
    ]

    for stage_name, stage_fn in stages:
        if _stop: break
        if done == "cpc":
            print(f"  Überspringe (done): {stage_name}")
            continue
        if done and stage_name <= done:
            print(f"  Überspringe (done): {stage_name}")
            continue
        print(f"\n── Stage: {stage_name} ──")
        stage_fn(lookup)
        save_cursor(stage_name)

    cur.close()
    conn.close()
    if not _stop:
        CURSOR_FILE.unlink(missing_ok=True)
        WORK_DIR.rmdir() if not list(WORK_DIR.iterdir()) else None
    print("\nFertig.")


if __name__ == "__main__":
    main()
