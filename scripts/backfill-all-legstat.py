#!/usr/bin/env python3
"""
Comprehensive LEGSTAT backfill — alle Länder, alle Felder.

Verarbeitet ALLE outer ZIPs, ALLE Länder (kein Filter).
Extrahiert pro Dokument:
  - patent_number, filing_date, grant_date, status, lapsed_at

Lapse-Erkennung (universell):
  - Bekannte EP-Codes: PG25, LAPS, LAPN, LAP, LAPC, SP, 18D, 18W, 20D, 20W
  - event-class="H" = Termination in allen anderen Ländern (CN CF01, JP, KR, ...)
  - Text-Marker als Fallback

UPSERT mit COALESCE: überschreibt NIE bessere bestehende Daten.
Resume-fähig via /tmp/backfill-all-legstat-cursor.json.

Usage:
    DATABASE_URL=... python3 scripts/backfill-all-legstat.py [--dry-run] [--dir=~/Downloads/INPADOC]
"""

import sys, os, re, zipfile, io, json, signal
from pathlib import Path
from collections import defaultdict

import psycopg2
from psycopg2.extras import execute_values

DRY         = "--dry-run" in sys.argv
DIR         = next((a.split("=",1)[1] for a in sys.argv if a.startswith("--dir=")),
                   str(Path.home() / "Downloads/INPADOC"))
DIR         = str(Path(DIR).expanduser())
DB          = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/patent_pilot")
CURSOR_FILE = "/tmp/backfill-all-legstat-dryrun-cursor.json" if DRY else "/tmp/backfill-all-legstat-cursor.json"
BATCH_SIZE  = 500

# ── Lapse-Codes ───────────────────────────────────────────────────────────────
# EP/DE/US explizit
LAPSE_CODES = {
    "PG25", "LAPS", "LAPN", "LAP", "LAPC", "SP",
    "18D", "18W", "20D", "20W",
    # CN
    "CF01", "CF02", "SC01",
    # JP (Kokai/Kokoku expiry)
    "X01", "X02", "X03",
    # KR
    "ZC01",
}

# Text-Marker Fallback
LAPSE_TEXT = (
    "TERMINAT", "PATENT LAPSED", "DEEMED TO BE WITHDRAWN",
    "APPLICATION WITHDRAWN", "NON-PAYMENT", "ABANDONED", "EXPIRATION",
    "EXPIRY OF PATENT", "CEASED",
)

# Regex (vorab kompiliert für Speed)
DOC_RX   = re.compile(r'<legal-status-document\b([\s\S]*?)</legal-status-document>')
PUB_RX   = re.compile(
    r'<publication-reference[^>]*>'
    r'[\s\S]*?<doc-number>(\d+)</doc-number>'
    r'[\s\S]*?<kind>([^<]+)</kind>'
    r'(?:[\s\S]*?<date>(\d{8})</date>)?'
    r'[\s\S]*?</publication-reference>'
)
APP_RX   = re.compile(
    r'<application-reference[^>]*>'
    r'[\s\S]*?<doc-number>([^<]+)</doc-number>'
    r'[\s\S]*?<date>(\d{8})</date>'
    r'[\s\S]*?</application-reference>'
)
EVT_RX   = re.compile(r'<legal-event[^>]*>([\s\S]*?)</legal-event>')
CODE_RX  = re.compile(r'<event-code>([^<]+)</event-code>')
CLASS_RX = re.compile(r'<event-class>([^<]+)</event-class>')
EDATE_RX = re.compile(r'<event-date>(\d{8})</event-date>')
CTRY_RX  = re.compile(r'<legal-status-document[^>]*\scountry="([A-Z]+)"')

KIND_PRIORITY = ["B1", "B2", "B3", "B", "A1", "A2", "A3", "A4", "A", "T3", "T"]


def fmt_date(raw: str) -> str | None:
    d = re.sub(r'\D', '', raw)[:8]
    if len(d) != 8: return None
    y, m, day = d[:4], d[4:6], d[6:8]
    try:
        if not (1 <= int(m) <= 12 and 1 <= int(day) <= 31): return None
    except ValueError:
        return None
    return f"{y}-{m}-{day}"


def parse_doc(chunk: str) -> dict | None:
    country_m = CTRY_RX.search(chunk)
    country   = country_m.group(1) if country_m else "XX"

    # ── Anmeldedatum ──────────────────────────────────────────────────────────
    filing_date  = None
    app_m = APP_RX.search(chunk)
    if app_m:
        filing_date = fmt_date(app_m.group(2))

    # ── Publikationsnummer + Erteilungsdatum ──────────────────────────────────
    best_idx   = len(KIND_PRIORITY)
    pub_number = ""
    pub_kind   = ""
    grant_date = None

    for m in PUB_RX.finditer(chunk):
        num, kind, date = m.group(1), m.group(2).strip(), m.group(3)
        kidx = KIND_PRIORITY.index(kind) if kind in KIND_PRIORITY else len(KIND_PRIORITY)
        if num and kidx < best_idx:
            best_idx   = kidx
            pub_number = num.replace(" ", "")
            pub_kind   = kind
        if kind in ("B1", "B2", "B3", "B") and date:
            grant_date = fmt_date(date)

    # Nur B-Kind (erteilte Patente) — A-Kind und reine Anmeldungen überspringen
    if not pub_number or not pub_kind.startswith('B'):
        return None

    patent_number = f"{country}{pub_number}{pub_kind}"
    if len(patent_number) < 4:
        return None

    # ── Lapse-Erkennung ───────────────────────────────────────────────────────
    is_lapsed  = False
    lapse_date = None        # frühestes Lapse-Datum

    for ev_m in EVT_RX.finditer(chunk):
        ev    = ev_m.group(1)
        code_m = CODE_RX.search(ev)
        cls_m  = CLASS_RX.search(ev)
        dm     = EDATE_RX.search(ev)
        code   = code_m.group(1).strip() if code_m else ""
        cls    = cls_m.group(1).strip()  if cls_m  else ""
        date   = fmt_date(dm.group(1))   if dm      else None

        lapse_signal = (
            code.strip() in LAPSE_CODES
            or cls.strip() == "H"
            or any(t in ev.upper() for t in LAPSE_TEXT)
        )

        if lapse_signal:
            is_lapsed = True
            if date:
                if lapse_date is None or date < lapse_date:
                    lapse_date = date

    # Text-Fallback
    if not is_lapsed and any(t in chunk.upper() for t in LAPSE_TEXT):
        is_lapsed = True

    # EP-Spezialfall: Lapse < 6 Monate nach Grant = nationale Designierung,
    # nicht das EP-Patent selbst. Erteilt → Patent lebte weiter → aktiv.
    if country == "EP" and is_lapsed and grant_date and lapse_date:
        gy, gm, gd = int(grant_date[:4]), int(grant_date[5:7]), int(grant_date[8:10])
        cm = gm + 6
        cutoff = f"{gy + cm // 12}-{cm % 12 or 12:02d}-{gd:02d}"
        if lapse_date < cutoff:
            is_lapsed  = False
            lapse_date = None

    status = "lapsed" if is_lapsed else "active"

    return {
        "patent_number": patent_number,
        "filing_date":   filing_date,
        "grant_date":    grant_date,
        "status":        status,
        "lapsed_at":     lapse_date if is_lapsed else None,
        "source":        country.lower(),
    }


def parse_xml(xml: str) -> list[dict]:
    rows = []
    for m in DOC_RX.finditer(xml):
        row = parse_doc(m.group(0))
        if row:
            rows.append(row)
    return rows


# ── DB ────────────────────────────────────────────────────────────────────────
conn = psycopg2.connect(DB)
conn.autocommit = False
cur  = conn.cursor()


def flush(rows: list[dict]) -> int:
    if not rows or DRY:
        return len(rows)

    # Dedup: gleiche patent_number im Batch zusammenführen
    merged: dict[str, dict] = {}
    for r in rows:
        pn = r["patent_number"]
        if pn not in merged:
            merged[pn] = r.copy()
        else:
            ex = merged[pn]
            # Frühestes lapsed_at nehmen
            if r["lapsed_at"] and (not ex["lapsed_at"] or r["lapsed_at"] < ex["lapsed_at"]):
                ex["lapsed_at"] = r["lapsed_at"]
            # Lapsed gewinnt immer
            if r["status"] == "lapsed":
                ex["status"] = "lapsed"
            # COALESCE-Semantik für Datum-Felder
            if not ex["filing_date"]:
                ex["filing_date"] = r["filing_date"]
            if not ex["grant_date"]:
                ex["grant_date"] = r["grant_date"]

    data = [
        (
            r["patent_number"],
            r["filing_date"],
            r["grant_date"],
            r["status"],
            r["lapsed_at"],
            r["source"],
        )
        for r in merged.values()
    ]

    execute_values(cur, """
        INSERT INTO patents (
            id, patent_number, filing_date, grant_date,
            status, lapsed_at, cpc_codes, source,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            d.patent_number,
            d.filing_date::date,
            d.grant_date::date,
            d.status,
            d.lapsed_at::date,
            '{}'::text[],
            d.source,
            now(), now()
        FROM (VALUES %s) AS d(
            patent_number, filing_date, grant_date,
            status, lapsed_at, source
        )
        ON CONFLICT (patent_number) DO UPDATE SET
            filing_date = COALESCE(patents.filing_date, EXCLUDED.filing_date),
            grant_date  = COALESCE(patents.grant_date,  EXCLUDED.grant_date),
            status      = CASE
                            WHEN patents.status = 'lapsed' THEN 'lapsed'
                            WHEN EXCLUDED.status = 'lapsed' THEN 'lapsed'
                            ELSE patents.status
                          END,
            lapsed_at   = COALESCE(
                            CASE WHEN patents.lapsed_at < EXCLUDED.lapsed_at
                                 THEN patents.lapsed_at
                                 ELSE EXCLUDED.lapsed_at
                            END,
                            patents.lapsed_at,
                            EXCLUDED.lapsed_at
                          ),
            updated_at  = now()
    """, data, template="(%s, %s, %s, %s, %s, %s)")
    conn.commit()
    return len(rows)


# ── Cursor ────────────────────────────────────────────────────────────────────
def load_cursor():
    try:
        return json.loads(Path(CURSOR_FILE).read_text())
    except Exception:
        return {}


def save_cursor(outer: str, inner: str, total: int):
    Path(CURSOR_FILE).write_text(json.dumps({
        "outer": outer, "inner": inner, "total": total
    }))


# ── Signal-Handler für sauberes Beenden ──────────────────────────────────────
_stop = False
def _sig(sig, frame):
    global _stop
    print(f"\n[SIGINT/SIGTERM] Breche nach aktuellem Batch ab...")
    _stop = True

signal.signal(signal.SIGINT,  _sig)
signal.signal(signal.SIGTERM, _sig)


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print(f"Comprehensive LEGSTAT Backfill")
    print(f"DIR={DIR}  DRY={DRY}")

    outer_zips = sorted(Path(DIR).glob("backfile-legstat_xml_*.zip"))
    if not outer_zips:
        print("Keine backfile-legstat_xml_*.zip gefunden.")
        sys.exit(1)
    print(f"{len(outer_zips)} outer ZIPs\n")

    cursor      = load_cursor()
    skip_outer  = cursor.get("outer", "")
    skip_inner  = cursor.get("inner", "")
    total_docs  = cursor.get("total", 0)
    total_rows  = 0

    if cursor:
        print(f"Resume ab: {skip_outer} / {Path(skip_inner).name}")
        print(f"Bisher: {total_docs:,} Docs\n")

    for oz_path in outer_zips:
        if _stop: break
        oz_name = oz_path.name

        if skip_outer and oz_name < skip_outer:
            print(f"Überspringe (done): {oz_name}")
            continue

        print(f"\n→ {oz_name}")

        with zipfile.ZipFile(oz_path, 'r') as oz:
            inner_names = sorted(
                n for n in oz.namelist()
                if '/DOC/LEGSTAT-' in n and n.endswith('.zip')
            )
            print(f"  {len(inner_names)} inner ZIPs")

            passed_inner = (not skip_outer or oz_name > skip_outer)

            for inner_name in inner_names:
                if _stop: break

                if not passed_inner:
                    if inner_name == skip_inner:
                        passed_inner = True
                    continue

                country_m = re.search(r'LEGSTAT-\d+-([A-Z]+)-', inner_name)
                country   = country_m.group(1) if country_m else "XX"

                try:
                    inner_data = oz.read(inner_name)
                    pending: list[dict] = []
                    with zipfile.ZipFile(io.BytesIO(inner_data), 'r') as iz:
                        xml_names = [n for n in iz.namelist() if n.endswith('.xml')]
                        for xml_name in xml_names:
                            xml  = iz.read(xml_name).decode('utf-8', errors='replace')
                            pending.extend(parse_xml(xml))
                            # Batch flushen sobald BATCH_SIZE erreicht
                            while len(pending) >= BATCH_SIZE:
                                batch = pending[:BATCH_SIZE]
                                pending = pending[BATCH_SIZE:]
                                n = flush(batch)
                                total_rows += n
                                total_docs += n
                    # Rest flushen
                    if pending:
                        n = flush(pending)
                        total_rows += n
                        total_docs += n

                    save_cursor(oz_name, inner_name, total_docs)
                    print(f"\r  [{country}] {Path(inner_name).name} | gesamt: {total_docs:,}", end='', flush=True)

                except Exception as e:
                    conn.rollback()
                    print(f"\n  FEHLER {Path(inner_name).name}: {str(e)[:120]}")

        # Outer abgeschlossen
        if skip_outer == oz_name:
            skip_outer = ""
            skip_inner = ""
        print()

    print(f"\n\nFertig: {total_docs:,} Dokumente verarbeitet, {total_rows:,} DB-Rows in dieser Session.")
    cur.close()
    conn.close()
    if not _stop:
        Path(CURSOR_FILE).unlink(missing_ok=True)


if __name__ == "__main__":
    main()
