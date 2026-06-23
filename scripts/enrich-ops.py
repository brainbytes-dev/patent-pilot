#!/usr/bin/env python3
"""
EPO OPS REST API Enricher — alle Länder ausser EP (die läuft via EPS).

Holt Titel, Inhaber und IPC-Codes für alle Patents die noch kein title haben.
Priorisiert: DE, AT, CH, GB, FR, CA, AU, NL, dann alle kleineren.

Auth: OAuth2 client_credentials (automatisches Token-Refresh alle 19 min).
Rate-Limit: 2.5 req/s → exponentieller Backoff bei 503.
Resume: /tmp/enrich-ops-cursor.json

Usage:
    DATABASE_URL=... EPO_OPS_CLIENT_ID=... EPO_OPS_CLIENT_SECRET=... \
        python3 scripts/enrich-ops.py [--dry-run] [--concurrency=8]
"""

import sys, os, re, json, time, signal
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
import urllib.request, urllib.parse, urllib.error
import threading

DRY         = "--dry-run" in sys.argv
CONCURRENCY = int(next((a.split("=",1)[1] for a in sys.argv if a.startswith("--concurrency=")), "6"))
DB          = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/patent_pilot")
CLIENT_ID   = os.environ.get("EPO_OPS_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("EPO_OPS_CLIENT_SECRET", "")
CURSOR_FILE = "/tmp/enrich-ops-cursor.json"
BATCH_SIZE  = 50     # DB-Batch für Updates
OPS_BASE    = "https://ops.epo.org/3.2/rest-services"
TOKEN_URL   = "https://ops.epo.org/3.2/auth/accesstoken"

if not CLIENT_ID or not CLIENT_SECRET:
    print("EPO_OPS_CLIENT_ID / EPO_OPS_CLIENT_SECRET fehlen")
    sys.exit(1)

# Länder-Priorität (DACH zuerst, dann Rest)
COUNTRY_ORDER = [
    "de", "at", "ch", "gb", "fr", "nl", "be", "se", "dk", "fi", "no",
    "ca", "au", "nz", "il", "ru", "br", "mx", "ar", "tw", "hk",
    "dd", "es", "it", "pt", "pl", "cz", "hu", "ro", "sk", "si",
]

# ── OAuth2 Token ──────────────────────────────────────────────────────────────

_token: str = ""
_token_expiry: float = 0.0
_token_lock = threading.Lock()


def get_token() -> str:
    global _token, _token_expiry
    with _token_lock:
        if time.time() < _token_expiry:
            return _token
        creds = urllib.parse.urlencode({
            "grant_type":    "client_credentials",
            "client_id":     CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }).encode()
        req = urllib.request.Request(TOKEN_URL, data=creds,
                                     headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        _token = data["access_token"]
        _token_expiry = time.time() + int(data.get("expires_in", 1200)) - 60
        return _token


# ── Rate-Limiter ──────────────────────────────────────────────────────────────

_rate_lock  = threading.Lock()
_last_req   = 0.0
MIN_INTERVAL = 1.0 / 2.5   # 2.5 req/s


def rate_wait():
    global _last_req
    with _rate_lock:
        now  = time.time()
        wait = MIN_INTERVAL - (now - _last_req)
        if wait > 0:
            time.sleep(wait)
        _last_req = time.time()


# ── OPS Biblio Fetch ──────────────────────────────────────────────────────────

def to_docdb(patent_number: str) -> str:
    """Konvertiert patent_number (z.B. DE102017214605A1) → docdb-Format (DE.102017214605.A1)."""
    m = re.match(r'^([A-Z]{2})(\d+)([A-Z]\d?)$', patent_number)
    if m:
        return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
    # Fallback: epodoc-Format (für unbekannte Strukturen)
    return patent_number


def ops_fetch(patent_number: str) -> dict | None:
    """Holt Biblio-Daten für eine Patentnummer via OPS docdb-Format."""
    docdb = to_docdb(patent_number)
    url = f"{OPS_BASE}/published-data/publication/docdb/{urllib.parse.quote(docdb, safe='')}/biblio"

    for attempt in range(4):
        rate_wait()
        try:
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {get_token()}",
                "Accept":        "application/json",
            })
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 503 or e.code == 429:
                wait = 2 ** attempt * 5
                time.sleep(wait)
                continue
            if e.code == 401:
                # Token abgelaufen — neu holen
                global _token_expiry
                _token_expiry = 0
                continue
            return None
        except Exception:
            time.sleep(2 ** attempt)
    return None


# ── Biblio Parsing ────────────────────────────────────────────────────────────

def parse_biblio(data: dict) -> dict:
    result = {"title": None, "title_de": None, "ipc_codes": [], "applicant": None}
    try:
        biblio = (
            data
            .get("ops:world-patent-data", {})
            .get("ops:biblio-search", {})
            .get("ops:search-result", {})
        )
        # Direkte Struktur (einzelnes Dokument)
        pub_ref = (
            data
            .get("ops:world-patent-data", {})
            .get("exchange-documents", {})
            .get("exchange-document", {})
        )
        if isinstance(pub_ref, list):
            pub_ref = pub_ref[0]

        # Titel
        titles = pub_ref.get("bibliographic-data", {}).get("invention-title", [])
        if isinstance(titles, dict):
            titles = [titles]
        for t in titles:
            lang = t.get("@lang", "")
            text = t.get("$", "").strip()
            if not text:
                continue
            if lang == "en" and not result["title"]:
                result["title"] = text
            elif lang == "de" and not result["title_de"]:
                result["title_de"] = text
            elif lang == "fr" and not result["title"]:
                result["title"] = text
        if not result["title"] and result["title_de"]:
            result["title"] = result["title_de"]

        # IPC-Codes
        ipc_block = (pub_ref
                     .get("bibliographic-data", {})
                     .get("classifications-ipcr", {})
                     .get("classification-ipcr", []))
        if isinstance(ipc_block, dict):
            ipc_block = [ipc_block]
        for ipc in ipc_block[:8]:
            s  = ipc.get("section", {}).get("$", "")
            c  = ipc.get("class", {}).get("$", "")
            sc = ipc.get("subclass", {}).get("$", "")
            mg = ipc.get("main-group", {}).get("$", "")
            sg = ipc.get("subgroup", {}).get("$", "")
            code = f"{s}{c}{sc}{mg}/{sg}".strip("/").strip()
            if code and code not in result["ipc_codes"]:
                result["ipc_codes"].append(code)

        # Applicant
        parties = pub_ref.get("bibliographic-data", {}).get("parties", {})
        applicants = parties.get("applicants", {}).get("applicant", [])
        if isinstance(applicants, dict):
            applicants = [applicants]
        for a in applicants:
            name = a.get("applicant-name", {}).get("name", {}).get("$", "").strip()
            if name:
                result["applicant"] = name
                break

    except Exception:
        pass
    return result


# ── DB ────────────────────────────────────────────────────────────────────────

conn = psycopg2.connect(DB)
conn.autocommit = False
cur  = conn.cursor()

_pending: list[dict] = []
_pending_lock = threading.Lock()


def flush_pending(force: bool = False):
    with _pending_lock:
        if not _pending or (not force and len(_pending) < BATCH_SIZE):
            return
        batch = _pending[:]
        _pending.clear()

    if DRY:
        return

    for r in batch:
        if r["title"] in (None, "[error]", "[no data]"):
            # Nur Fehlerstatus — nie bestehende Daten überschreiben
            cur.execute("""
                UPDATE patents SET
                  title      = CASE WHEN title IS NULL THEN %s ELSE title END,
                  updated_at = now()
                WHERE id = %s
            """, (r["title"], r["id"]))
        else:
            cur.execute("""
                UPDATE patents SET
                  title      = %s,
                  title_de   = COALESCE(%s, title_de),
                  cpc_codes  = CASE WHEN cpc_codes = '{}' THEN %s ELSE cpc_codes END,
                  owner      = COALESCE(owner, %s),
                  updated_at = now()
                WHERE id = %s
            """, (r["title"], r["title_de"], r["ipc_codes"], r["applicant"], r["id"]))
    conn.commit()


# ── Cursor ────────────────────────────────────────────────────────────────────

def load_cursor() -> dict:
    try:
        return json.loads(Path(CURSOR_FILE).read_text())
    except Exception:
        return {}


def save_cursor(country: str, last_id: str):
    Path(CURSOR_FILE).write_text(json.dumps({"country": country, "last_id": last_id}))


# ── Signal ────────────────────────────────────────────────────────────────────

_stop = False


def _sig(sig, frame):
    global _stop
    print("\n[STOP] Breche nach aktuellem Batch ab...")
    _stop = True


signal.signal(signal.SIGINT,  _sig)
signal.signal(signal.SIGTERM, _sig)


# ── Main ──────────────────────────────────────────────────────────────────────

def process_country(country: str, resume_id: str = "00000000-0000-0000-0000-000000000000"):
    total = enriched = failed = 0
    last_id = resume_id

    # Gesamtzahl
    cur.execute("""
        SELECT count(*)::int FROM patents
        WHERE source = %s AND (title IS NULL OR title IN ('[error]'))
        AND id > %s
    """, (country, last_id))
    (count,) = cur.fetchone()
    print(f"\n  {country.upper()}: {count:,} zu enrichen")
    if count == 0:
        return

    from concurrent.futures import ThreadPoolExecutor, as_completed

    while not _stop:
        cur.execute("""
            SELECT id, patent_number FROM patents
            WHERE source = %s AND (title IS NULL OR title IN ('[error]'))
            AND id > %s
            ORDER BY id
            LIMIT %s
        """, (country, last_id, CONCURRENCY * 4))
        rows = cur.fetchall()
        if not rows:
            break

        with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
            futures = {ex.submit(ops_fetch, row[1]): row for row in rows}
            for fut in as_completed(futures):
                row_id, patent_number = futures[fut]
                try:
                    data = fut.result()
                    if data is None:
                        with _pending_lock:
                            _pending.append({"id": row_id, "title": "[no data]",
                                             "title_de": None, "ipc_codes": [], "applicant": None})
                        failed += 1
                    else:
                        parsed = parse_biblio(data)
                        with _pending_lock:
                            _pending.append({"id": row_id, **parsed})
                        if parsed["title"]:
                            enriched += 1
                        else:
                            with _pending_lock:
                                _pending[-1]["title"] = "[no data]"
                            failed += 1
                except Exception as e:
                    with _pending_lock:
                        _pending.append({"id": row_id, "title": "[error]",
                                         "title_de": None, "ipc_codes": [], "applicant": None})
                    failed += 1

        total    += len(rows)
        last_id   = rows[-1][0]
        flush_pending()
        save_cursor(country, last_id)
        print(f"\r  {country.upper()} {total:,}/{count:,} | ok={enriched:,} fail={failed:,}", end="", flush=True)

    flush_pending(force=True)
    print(f"\n  {country.upper()} fertig: {enriched:,} enriched, {failed:,} failed")


def main():
    print(f"EPO OPS Enricher | DRY={DRY} | CONCURRENCY={CONCURRENCY}")

    cursor  = load_cursor()
    skip_to = cursor.get("country", "")
    resume_id = cursor.get("last_id", "00000000-0000-0000-0000-000000000000")

    # Alle Länder aus DB ermitteln die noch Daten brauchen
    cur.execute("""
        SELECT source, count(*)::int
        FROM patents
        WHERE title IS NULL OR title IN ('[error]')
        GROUP BY source
        HAVING count(*) > 0
        ORDER BY count(*) DESC
    """)
    all_countries = {row[0]: row[1] for row in cur.fetchall()}

    # EP überspringen (läuft via EPS)
    all_countries.pop("ep", None)

    # Priorisierte Reihenfolge
    ordered = [c for c in COUNTRY_ORDER if c in all_countries]
    # Rest anhängen (nicht in Prio-Liste)
    rest = sorted([c for c in all_countries if c not in ordered],
                  key=lambda c: -all_countries[c])
    ordered.extend(rest)

    print(f"\n{len(ordered)} Länder zu enrichen:")
    for c in ordered:
        print(f"  {c.upper()}: {all_countries[c]:,}")

    passed_resume = not skip_to
    for country in ordered:
        if _stop:
            break
        if not passed_resume:
            if country == skip_to:
                passed_resume = True
                process_country(country, resume_id)
            continue
        process_country(country, "00000000-0000-0000-0000-000000000000")

    cur.close()
    conn.close()
    if not _stop:
        Path(CURSOR_FILE).unlink(missing_ok=True)
    print("\n\nFertig.")


if __name__ == "__main__":
    main()
