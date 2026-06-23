#!/usr/bin/env bash
# Lädt fehlende LEGSTAT-Frontfile-ZIPs vom EPO BDDS herunter.
#
# Usage:
#   LEGSTAT_BASE_URL="https://..." ./scripts/fetch-legstat-weeks.sh [FROM_WEEK] [TO_WEEK] [DEST_DIR]
#
#   FROM_WEEK  ISO-Woche YYYYWW (default: 202609 — erste verfügbare Frontfile-Woche)
#   TO_WEEK    ISO-Woche YYYYWW (default: aktuelle Woche)
#   DEST_DIR   Download-Ziel (default: ~/Downloads/legstat)
#
# Beispiel:
#   LEGSTAT_BASE_URL="https://data.epo.org/bulk-data/..." \
#     ./scripts/fetch-legstat-weeks.sh 202609 202625 ~/Downloads/legstat

set -euo pipefail

BASE_URL="${LEGSTAT_BASE_URL:?Bitte LEGSTAT_BASE_URL setzen}"
FROM="${1:-202609}"
TO="${2:-$(date +%G%V)}"   # aktuelle ISO-Woche
DEST="${3:-$HOME/Downloads/legstat}"

mkdir -p "$DEST"

# ISO-Woche zu Unix-Timestamp (Montag der Woche)
week_to_date() {
  local yw="$1"
  local y="${yw:0:4}"
  local w="${yw:4:2}"
  # GNU date oder BSD date
  if date --version &>/dev/null 2>&1; then
    date -d "${y}-01-01 +$(( (10#$w - 1) * 7 )) days" +%Y-%m-%d 2>/dev/null \
      || python3 -c "import datetime; d=datetime.date.fromisocalendar(int('$y'),int('$w'),1); print(d)"
  else
    python3 -c "import datetime; d=datetime.date.fromisocalendar(int('$y'),int('$w'),1); print(d)"
  fi
}

# Alle Wochen von FROM bis TO generieren
generate_weeks() {
  python3 - <<PYEOF
import datetime, sys
fy, fw = int("$FROM"[:4]), int("$FROM"[4:])
ty, tw = int("$TO"[:4]),   int("$TO"[4:])
d   = datetime.date.fromisocalendar(fy, fw, 1)
end = datetime.date.fromisocalendar(ty, tw, 1)
while d <= end:
    iso = d.isocalendar()
    print(f"{iso[0]}{iso[1]:02d}")
    d += datetime.timedelta(weeks=1)
PYEOF
}

echo "Lade LEGSTAT-Wochen $FROM → $TO nach $DEST"
echo "Base URL: $BASE_URL"
echo ""

DOWNLOADED=0
SKIPPED=0
FAILED=0

while IFS= read -r week; do
  ZIP="legstat_xml_${week}.zip"
  DEST_FILE="$DEST/$ZIP"

  if [[ -f "$DEST_FILE" ]]; then
    echo "✓ $ZIP (bereits vorhanden)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  URL="${BASE_URL%/}/${ZIP}"
  echo -n "↓ $ZIP ... "

  if curl -fsSL --retry 3 --retry-delay 5 \
       -o "${DEST_FILE}.tmp" "$URL" 2>/dev/null; then
    mv "${DEST_FILE}.tmp" "$DEST_FILE"
    SIZE=$(du -sh "$DEST_FILE" | cut -f1)
    echo "OK ($SIZE)"
    DOWNLOADED=$((DOWNLOADED + 1))
  else
    rm -f "${DEST_FILE}.tmp"
    echo "FEHLER (HTTP-Fehler oder nicht verfügbar)"
    FAILED=$((FAILED + 1))
  fi

done < <(generate_weeks)

echo ""
echo "Fertig: $DOWNLOADED geladen, $SKIPPED übersprungen, $FAILED fehlgeschlagen"
echo ""
if [[ $DOWNLOADED -gt 0 ]]; then
  echo "Jetzt einpielen:"
  echo "  DATABASE_URL=postgresql://postgres:postgres@localhost:5433/patent_pilot \\"
  echo "    python3 scripts/update-legstat.py --dir=$DEST"
fi
