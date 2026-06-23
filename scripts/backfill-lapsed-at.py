#!/usr/bin/env python3
"""
Backfill lapsed_at aus INPADOC LEGSTAT XMLs.
Liest outer ZIPs → inner ZIPs → XMLs per Streaming (kein RAM-Problem).
Extrahiert PG25-Events und setzt lapsed_at = frühestes PG25-Datum.

Usage:
    python3 scripts/backfill-lapsed-at.py [--dry-run] [--dir=~/Downloads/INPADOC]
"""

import sys, os, re, zipfile, psycopg2, io
from pathlib import Path
from collections import defaultdict

DRY  = "--dry-run" in sys.argv
DIR  = next((a.split("=",1)[1] for a in sys.argv if a.startswith("--dir=")),
            str(Path.home() / "Downloads/INPADOC"))
DIR  = str(Path(DIR).expanduser())
DB   = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/patent_pilot")

# ── Regex (kompiliert, deutlich schneller) ─────────────────────────────────
DOC_RX   = re.compile(r'<legal-status-document[^>]*>([\s\S]*?)</legal-status-document>')
PUB_RX   = re.compile(r'<publication-reference[^>]*>[\s\S]*?<doc-number>(\d+)</doc-number>[\s\S]*?<kind>([^<]+)</kind>[\s\S]*?</publication-reference>')
EVT_RX   = re.compile(r'<legal-event[^>]*>([\s\S]*?)</legal-event>')
DATE_RX  = re.compile(r'<event-date>(\d{8})</event-date>')
PG25_STR = '<event-code>PG25</event-code>'

def extract_lapse_events(xml: str, country: str) -> list[tuple[str, str]]:
    results = []
    for doc_m in DOC_RX.finditer(xml):
        doc = doc_m.group(1)
        pubs = PUB_RX.findall(doc)
        patent_number = None
        for num, kind in pubs:
            if kind.startswith('B'):
                patent_number = f"{country}{num}{kind}"; break
        if not patent_number and pubs:
            patent_number = f"{country}{pubs[0][0]}{pubs[0][1]}"
        if not patent_number:
            continue

        lap_dates = []
        for ev_m in EVT_RX.finditer(doc):
            ev = ev_m.group(1)
            if PG25_STR not in ev:
                continue
            dm = DATE_RX.search(ev)
            if dm:
                d = dm.group(1)
                lap_dates.append(f"{d[:4]}-{d[4:6]}-{d[6:8]}")

        if lap_dates:
            lap_dates.sort()
            results.append((patent_number, lap_dates[0]))
    return results

# ── DB ─────────────────────────────────────────────────────────────────────
conn = psycopg2.connect(DB)
conn.autocommit = False
cur  = conn.cursor()

def flush(entries: list[tuple[str, str]]):
    if not entries or DRY:
        return len(entries)
    from psycopg2.extras import execute_values
    execute_values(cur, """
        UPDATE patents SET
            lapsed_at  = data.lapsed_at::date,
            updated_at = now()
        FROM (VALUES %s) AS data(patent_number, lapsed_at)
        WHERE patents.patent_number = data.patent_number
          AND patents.status = 'lapsed'
    """, entries)
    conn.commit()
    return len(entries)

# ── Main ───────────────────────────────────────────────────────────────────
print(f"Backfill lapsed_at | DIR={DIR} | DRY={DRY}\n")

outer_zips = sorted(
    p for p in Path(DIR).glob("backfile-legstat_xml_*.zip")
)
print(f"{len(outer_zips)} outer ZIPs\n")

total_events = 0
total_updated = 0

for outer_path in outer_zips:
    print(f"\n→ {outer_path.name}")
    with zipfile.ZipFile(outer_path, 'r') as outer:
        inner_names = [n for n in outer.namelist()
                       if '/DOC/LEGSTAT-' in n and n.endswith('.zip')]

        for inner_name in inner_names:
            # Country aus Filename: LEGSTAT-202608-EP-AppDate...
            country_m = re.search(r'LEGSTAT-\d+-([A-Z]+)-', inner_name)
            country = country_m.group(1) if country_m else 'XX'

            # Nur EP/DE/US verarbeiten (Rest überspringen)
            if country not in ('EP', 'DE', 'US'):
                continue

            # Inner ZIP streamen (kein RAM-Load des ganzen outer ZIP)
            inner_data = outer.read(inner_name)
            with zipfile.ZipFile(io.BytesIO(inner_data), 'r') as inner:
                xml_names = [n for n in inner.namelist() if n.endswith('.xml')]
                for xml_name in xml_names:
                    xml = inner.read(xml_name).decode('utf-8', errors='replace')
                    entries = extract_lapse_events(xml, country)
                    if entries:
                        updated = flush(entries)
                        total_updated += updated
                        total_events  += len(entries)
                        print(f"\r  {total_events:,} events → {total_updated:,} updates", end='', flush=True)

print(f"\n\nFertig: {total_events:,} Lapse-Events, {total_updated:,} DB-Updates.")
cur.close()
conn.close()
