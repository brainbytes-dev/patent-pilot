/**
 * Backfill lapsed_at from INPADOC LEGSTAT XMLs.
 *
 * Liest alle outer ZIPs → inner ZIPs → XMLs.
 * Extrahiert PG25 (= "Lapsed in a contracting state") events.
 * Setzt lapsed_at = frühestes PG25 Datum pro Patent.
 *
 * Usage:
 *   node --experimental-strip-types scripts/backfill-lapsed-at.ts \
 *     [--dir=~/Downloads/INPADOC] [--dry-run]
 */

// @ts-nocheck
import { readdirSync } from "fs";
import { join } from "path";
import AdmZip from "adm-zip";
import postgres from "postgres";

const DIR    = process.argv.find(a => a.startsWith("--dir="))?.slice(6)
  ?? (process.env.HOME + "/Downloads/INPADOC");
const DRY    = process.argv.includes("--dry-run");
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL fehlt"); process.exit(1); }
const pg = postgres(DB_URL, { ssl: false, max: 5 });

// ── XML Parser ───────────────────────────────────────────────────────────────

interface LapsedEntry {
  patentNumber: string;  // e.g. EP0153093
  lapsedAt: string;      // YYYY-MM-DD (earliest PG25)
}

function extractLapseEvents(xml: string, country: string): LapsedEntry[] {
  const results: LapsedEntry[] = [];

  const docRx  = /<legal-status-document[^>]*>([\s\S]*?)<\/legal-status-document>/g;
  const pubRx  = /<publication-reference[^>]*>[\s\S]*?<doc-number>(\d+)<\/doc-number>[\s\S]*?<kind>([^<]+)<\/kind>[\s\S]*?<\/publication-reference>/g;
  const evtRx  = /<legal-event[^>]*>([\s\S]*?)<\/legal-event>/g;
  const dateRx = /<event-date>(\d{8})<\/event-date>/;

  let docMatch: RegExpExecArray | null;
  while ((docMatch = docRx.exec(xml)) !== null) {
    const doc = docMatch[1]!;

    // Publication-Referenz extrahieren (B-Kind bevorzugen)
    const pubRefs: string[] = [];
    pubRx.lastIndex = 0;
    let pr: RegExpExecArray | null;
    while ((pr = pubRx.exec(doc)) !== null) {
      pubRefs.push(`${country}${pr[1]}${pr[2]}`);
    }
    const patentNumber = pubRefs.find(p => /[B][12]?$/.test(p)) ?? pubRefs[0];
    if (!patentNumber) continue;

    // PG25-Events suchen — INNERHALB jedes einzelnen <legal-event>-Blocks
    const lapDates: string[] = [];
    evtRx.lastIndex = 0;
    let ev: RegExpExecArray | null;
    while ((ev = evtRx.exec(doc)) !== null) {
      const evText = ev[1]!;
      if (!evText.includes("<event-code>PG25</event-code>")) continue;
      const dm = dateRx.exec(evText);
      if (dm) {
        const raw = dm[1]!;
        lapDates.push(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`);
      }
    }
    if (!lapDates.length) continue;

    lapDates.sort();
    results.push({ patentNumber, lapsedAt: lapDates[0]! });
  }

  return results;
}

// ── DB flush ─────────────────────────────────────────────────────────────────

async function flush(entries: LapsedEntry[]): Promise<number> {
  if (!entries.length || DRY) return entries.length;
  const nums  = entries.map(e => e.patentNumber);
  const dates = entries.map(e => e.lapsedAt);
  await pg`
    UPDATE patents SET
      lapsed_at  = t.lapsed_at::date,
      updated_at = now()
    FROM unnest(${nums}::text[], ${dates}::text[]) AS t(patent_number, lapsed_at)
    WHERE patents.patent_number = t.patent_number
      AND patents.status = 'lapsed'
  `;
  return entries.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Backfill lapsed_at — INPADOC PG25 Events`);
  console.log(`Dir: ${DIR} | DRY: ${DRY}\n`);

  const outerZips = readdirSync(DIR)
    .filter(f => f.startsWith("backfile-legstat") && f.endsWith(".zip"))
    .sort()
    .map(f => join(DIR, f));

  console.log(`${outerZips.length} outer ZIPs gefunden\n`);

  let totalEntries = 0;
  let totalUpdated = 0;

  for (const outerPath of outerZips) {
    console.log(`\n→ ${outerPath.split("/").pop()}`);
    const outer = new AdmZip(outerPath);
    const innerEntries = outer.getEntries().filter(e =>
      e.entryName.includes("/DOC/LEGSTAT-") && e.entryName.endsWith(".zip")
    );

    for (const innerEntry of innerEntries) {
      const innerBuf = innerEntry.getData();
      const inner = new AdmZip(innerBuf);
      const xmlEntries = inner.getEntries().filter(e => e.entryName.endsWith(".xml"));

      for (const xmlEntry of xmlEntries) {
        const xml = xmlEntry.getData().toString("utf-8");
        // Extract country from filename e.g. LEGSTAT-202608-EP-...
        const country = xmlEntry.entryName.match(/LEGSTAT-\d+-([A-Z]+)-/)?.[1] ?? "EP";
        const entries = extractLapseEvents(xml, country);

        if (entries.length > 0) {
          const updated = await flush(entries);
          totalUpdated += updated;
          totalEntries += entries.length;
          process.stdout.write(`\r  ${totalEntries.toLocaleString()} lapse events → ${totalUpdated.toLocaleString()} DB updates`);
        }
      }
    }
  }

  console.log(`\n\nFertig: ${totalEntries.toLocaleString()} Lapse-Events, ${totalUpdated.toLocaleString()} Updates.`);
  await pg.end();
}

main().catch(e => { console.error(e); process.exit(1); });
