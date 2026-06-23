#!/usr/bin/env python3
"""
LEGSTAT Frontfile Updater — wöchentliche INPADOC-Updates einpielen.

EPO veröffentlicht jede Woche ein Frontfile-ZIP: legstat_xml_YYYYWW.zip
Diese enthalten nur die Deltas der letzten Woche (neu erloschene, neue Events).

Struktur Frontfile (anders als Backfile!):
  legstat_xml_202625.zip
    Root/DOC/LEGSTAT-202625-EP-AppDateFrom...-NNN.zip   ← inner ZIPs
    Root/DOC/LEGSTAT-202625-DE-AppDateFrom...-NNN.zip
    ...

Backfile hatte: outer_ZIP → inner_ZIP → XML
Frontfile hat:  outer_ZIP → Root/DOC/inner_ZIP → XML  (eine Ebene flacher)

Usage:
    DATABASE_URL=... python3 scripts/update-legstat.py [--dir=~/Downloads] [--dry-run] [--fetch]

    --dir=PATH    Ordner mit frontfile ZIPs (default: ~/Downloads)
    --dry-run     Parsen ohne DB-Writes
    --fetch       Auto-Download fehlender Wochen via EPO BDDS
                  (Setzt LEGSTAT_BASE_URL env-Variable voraus)
    --from=WW     Nur Wochen >= YYYYWW verarbeiten (z.B. --from=202609)
"""

import sys, os, re, zipfile, io, json, signal, datetime, subprocess, urllib.request
from pathlib import Path
from collections import defaultdict

DRY         = "--dry-run" in sys.argv
FETCH       = "--fetch"   in sys.argv
CHECK_ONLY  = "--check"   in sys.argv
DIR         = next((a.split("=",1)[1] for a in sys.argv if a.startswith("--dir=")),
                   str(Path.home() / "Downloads/legstat"))
DIR         = str(Path(DIR).expanduser())
FROM_WEEK   = next((a.split("=",1)[1] for a in sys.argv if a.startswith("--from=")), "")
DB          = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/patent_pilot")
STATE_FILE  = Path.home() / ".patent-pilot" / "legstat-frontfile-state.json"
BASE_URL    = os.environ.get("LEGSTAT_BASE_URL", "")
BATCH_SIZE  = 500
BDDS_API    = "https://publication-bdds.apps.epo.org/bdds/bdds-bff-service/prod/api/public/products/5"

if not CHECK_ONLY:
    import psycopg2
    from psycopg2.extras import execute_values

# ── Lapse-Codes (identisch mit backfill-all-legstat.py) ──────────────────────
LAPSE_CODES = {
    "PG25", "LAPS", "LAPN", "LAP", "LAPC", "SP",
    "18D", "18W", "20D", "20W",
    "CF01", "CF02", "SC01",
    "X01", "X02", "X03",
    "ZC01",
}
LAPSE_TEXT = (
    "TERMINAT", "PATENT LAPSED", "DEEMED TO BE WITHDRAWN",
    "APPLICATION WITHDRAWN", "NON-PAYMENT", "ABANDONED", "EXPIRATION",
    "EXPIRY OF PATENT", "CEASED",
)

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

    filing_date = None
    app_m = APP_RX.search(chunk)
    if app_m:
        filing_date = fmt_date(app_m.group(2))

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

    # Nur B-Kind (erteilte Patente)
    if not pub_number or not pub_kind.startswith('B'):
        return None

    patent_number = f"{country}{pub_number}{pub_kind}"
    if len(patent_number) < 4:
        return None

    # Lapse-Erkennung
    is_lapsed  = False
    lapse_date = None

    for ev_m in EVT_RX.finditer(chunk):
        ev     = ev_m.group(1)
        code_m = CODE_RX.search(ev)
        cls_m  = CLASS_RX.search(ev)
        dm     = EDATE_RX.search(ev)
        code   = code_m.group(1).strip() if code_m else ""
        cls    = cls_m.group(1).strip()  if cls_m  else ""
        date   = fmt_date(dm.group(1))   if dm      else None

        if code in LAPSE_CODES or cls == "H" or any(t in ev.upper() for t in LAPSE_TEXT):
            is_lapsed = True
            if date and (lapse_date is None or date < lapse_date):
                lapse_date = date

    if not is_lapsed and any(t in chunk.upper() for t in LAPSE_TEXT):
        is_lapsed = True

    # EP-Spezialfall: Lapse < 6 Monate nach Grant = nationale Designierung, nicht EP selbst
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

    merged: dict[str, dict] = {}
    for r in rows:
        pn = r["patent_number"]
        if pn not in merged:
            merged[pn] = r.copy()
        else:
            ex = merged[pn]
            if r["lapsed_at"] and (not ex["lapsed_at"] or r["lapsed_at"] < ex["lapsed_at"]):
                ex["lapsed_at"] = r["lapsed_at"]
            if r["status"] == "lapsed":
                ex["status"] = "lapsed"
            if not ex["filing_date"]: ex["filing_date"] = r["filing_date"]
            if not ex["grant_date"]:  ex["grant_date"]  = r["grant_date"]

    data = [
        (r["patent_number"], r["filing_date"], r["grant_date"],
         r["status"], r["lapsed_at"], r["source"])
        for r in merged.values()
    ]

    execute_values(cur, """
        INSERT INTO patents (
            id, patent_number, filing_date, grant_date,
            status, lapsed_at, cpc_codes, source, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), d.patent_number,
            d.filing_date::date, d.grant_date::date,
            d.status, d.lapsed_at::date,
            '{}'::text[], d.source, now(), now()
        FROM (VALUES %s) AS d(
            patent_number, filing_date, grant_date, status, lapsed_at, source
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
                                 THEN patents.lapsed_at ELSE EXCLUDED.lapsed_at END,
                            patents.lapsed_at, EXCLUDED.lapsed_at
                          ),
            updated_at  = now()
    """, data, template="(%s, %s, %s, %s, %s, %s)")
    conn.commit()
    return len(rows)


# ── State ─────────────────────────────────────────────────────────────────────
def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {"processed_weeks": []}


def save_state(state: dict):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ── Wochenliste ───────────────────────────────────────────────────────────────
def week_id(zip_path: Path) -> str:
    """Extrahiert YYYYWW aus legstat_xml_YYYYWW.zip"""
    m = re.search(r'legstat_xml_(\d{6})\.zip', zip_path.name)
    return m.group(1) if m else ""


def all_weeks_needed(from_week: str = "") -> list[str]:
    """Alle ISO-Wochen von from_week bis heute"""
    today = datetime.date.today()
    if not from_week or len(from_week) != 6:
        return []
    start_y, start_w = int(from_week[:4]), int(from_week[4:])
    weeks = []
    d = datetime.date.fromisocalendar(start_y, start_w, 1)
    while d <= today:
        iso = d.isocalendar()
        weeks.append(f"{iso[0]}{iso[1]:02d}")
        d += datetime.timedelta(weeks=1)
    return weeks


# ── Auto-Download ─────────────────────────────────────────────────────────────
def download_week(week: str, dest: Path):
    if not BASE_URL:
        print(f"  [SKIP] LEGSTAT_BASE_URL nicht gesetzt — {week} manuell herunterladen")
        return False
    import urllib.request
    url = f"{BASE_URL.rstrip('/')}/legstat_xml_{week}.zip"
    print(f"  Download: {url}")
    tmp = dest.with_suffix(".tmp")
    try:
        with urllib.request.urlopen(url, timeout=120) as r:
            total = int(r.headers.get("Content-Length", 0))
            downloaded = 0
            with open(tmp, "wb") as f:
                while True:
                    chunk = r.read(1024 * 1024)
                    if not chunk: break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded / total * 100
                        print(f"\r  {downloaded/1024/1024:.0f}MB / {total/1024/1024:.0f}MB ({pct:.0f}%)", end="", flush=True)
        tmp.rename(dest)
        print(f"\n  Fertig: {dest.name}")
        return True
    except Exception as e:
        tmp.unlink(missing_ok=True)
        print(f"\n  Fehler: {e}")
        return False


# ── Frontfile verarbeiten ─────────────────────────────────────────────────────
def process_frontfile(zip_path: Path, week: str) -> int:
    total_docs = 0
    print(f"\n→ {zip_path.name}")

    try:
        with zipfile.ZipFile(zip_path, 'r') as oz:
            # Frontfile: Root/DOC/LEGSTAT-*.zip
            inner_names = sorted(
                n for n in oz.namelist()
                if n.startswith("Root/DOC/LEGSTAT-") and n.endswith(".zip")
            )
            print(f"  {len(inner_names)} inner ZIPs")

            for inner_name in inner_names:
                if _stop: break
                country_m = re.search(r'LEGSTAT-\d+-([A-Z]+)-', inner_name)
                country   = country_m.group(1) if country_m else "??"

                try:
                    inner_data = oz.read(inner_name)
                    pending: list[dict] = []
                    with zipfile.ZipFile(io.BytesIO(inner_data), 'r') as iz:
                        xml_names = [n for n in iz.namelist() if n.endswith('.xml')]
                        for xml_name in xml_names:
                            xml = iz.read(xml_name).decode('utf-8', errors='replace')
                            pending.extend(parse_xml(xml))
                            while len(pending) >= BATCH_SIZE:
                                n = flush(pending[:BATCH_SIZE])
                                pending = pending[BATCH_SIZE:]
                                total_docs += n
                    if pending:
                        total_docs += flush(pending)
                    print(f"\r  [{country}] {Path(inner_name).name} | {total_docs:,}", end="", flush=True)

                except Exception as e:
                    conn.rollback()
                    print(f"\n  FEHLER {Path(inner_name).name}: {str(e)[:100]}")

    except Exception as e:
        print(f"\n  Fehler beim Öffnen: {e}")
        return 0

    print(f"\n  Woche {week}: {total_docs:,} Docs")
    return total_docs


# ── EPO BDDS API Check ────────────────────────────────────────────────────────
def check_new_weeks(state: dict) -> list[str]:
    """Fragt die BDDS-API ab und gibt neue (noch nicht verarbeitete) Wochen zurück."""
    processed = set(state.get("processed_weeks", []))
    try:
        with urllib.request.urlopen(BDDS_API, timeout=15) as r:
            data = json.loads(r.read())
    except Exception as e:
        print(f"BDDS-API nicht erreichbar: {e}")
        return []

    deliveries = data if isinstance(data, list) else data.get("deliveries", [])
    new_weeks = []
    for d in deliveries:
        name = d.get("deliveryName", "")
        # Format: "14.11 INPADOC - EPO worldwide legal event data 2026/025"
        m = re.search(r'(\d{4})/(\d{2,3})$', name)
        if not m:
            continue
        year, week = m.group(1), m.group(2).zfill(2)
        week_key = f"{year}{week}"
        if week_key not in processed:
            new_weeks.append(week_key)

    return sorted(new_weeks)


def notify_macos(title: str, message: str):
    """macOS-Notification via osascript."""
    try:
        subprocess.run([
            "osascript", "-e",
            f'display notification "{message}" with title "{title}" sound name "Ping"'
        ], check=False, capture_output=True)
    except Exception:
        pass


# ── Signal ────────────────────────────────────────────────────────────────────
_stop = False
def _sig(sig, frame):
    global _stop
    print("\n[STOP]")
    _stop = True

signal.signal(signal.SIGINT,  _sig)
signal.signal(signal.SIGTERM, _sig)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    state = load_state()

    # ── Check-Only Mode (täglich Mo–Fr via launchd) ───────────────────────────
    if CHECK_ONLY:
        new = check_new_weeks(state)
        if new:
            msg = f"Neue Wochen: {', '.join(new)}"
            print(msg)
            notify_macos("LEGSTAT Update verfügbar", msg)
            notify_macos("Patentbrief", f"{len(new)} neue LEGSTAT-Woche(n) — bitte herunterladen und einpielen")
        else:
            print("Keine neuen Wochen.")
        return

    print(f"LEGSTAT Frontfile Updater | DIR={DIR} | DRY={DRY}")

    processed = set(state.get("processed_weeks", []))

    # Vorhandene Frontfile-ZIPs scannen
    scan_dir = Path(DIR)
    available = {
        week_id(p): p
        for p in scan_dir.glob("legstat_xml_*.zip")
        if week_id(p)
    }

    # Auto-Download fehlender Wochen
    if FETCH and FROM_WEEK:
        needed = all_weeks_needed(FROM_WEEK)
        missing = [w for w in needed if w not in available and w not in processed]
        if missing:
            print(f"\n{len(missing)} Wochen fehlen: {missing[0]} … {missing[-1]}")
            for week in missing:
                if _stop: break
                dest = scan_dir / f"legstat_xml_{week}.zip"
                if download_week(week, dest):
                    available[week] = dest
        else:
            print(f"Alle Wochen seit {FROM_WEEK} bereits vorhanden oder verarbeitet.")

    # Neue Wochen verarbeiten (sortiert aufsteigend)
    to_process = sorted(
        [(w, p) for w, p in available.items() if w not in processed],
        key=lambda x: x[0]
    )

    if not to_process:
        print("\nKeine neuen Frontfile-ZIPs zu verarbeiten.")
    else:
        print(f"\n{len(to_process)} neue Woche(n): {[w for w,_ in to_process]}")

    total = 0
    for week, path in to_process:
        if _stop: break
        if FROM_WEEK and week < FROM_WEEK:
            print(f"  Überspringe {week} (vor --from={FROM_WEEK})")
            continue
        n = process_frontfile(path, week)
        total += n
        processed.add(week)
        state["processed_weeks"] = sorted(processed)
        state["last_run"] = datetime.datetime.now().isoformat()[:16]
        save_state(state)

    cur.close()
    conn.close()
    print(f"\n\nFertig. {total:,} Docs in dieser Session. Verarbeitete Wochen: {len(processed)}")


if __name__ == "__main__":
    main()
