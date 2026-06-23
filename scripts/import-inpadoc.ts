/**
 * INPADOC LEGSTAT Backfile Importer
 *
 * Verarbeitet EPO's INPADOC Legal Status Backfile (13x ~1.4 GB ZIPs) in die
 * lokale patent_pilot Datenbank als Stubs. Enrichment (Titel, Abstract, CPC)
 * übernimmt der Inngest-Job enrich-patent-stubs (nur für lapsed/near-expiry EP).
 *
 * Struktur der Backfiles:
 *   backfile-legstat_xml_202608-NNN.zip
 *     Root/index.xml        — Index aller enthaltenen inner ZIPs
 *     Root/DOC/LEGSTAT-YYYYWW-CC-AppDateFrom*-NNN.zip  — ein XML pro inner ZIP
 *       LEGSTAT-YYYYWW-CC-AppDateFrom*-NNN.xml          — legal-status-documents
 *
 * Usage:
 *   node --experimental-strip-types \
 *     --env-file=apps/web/.env.local \
 *     scripts/import-inpadoc.ts ~/Downloads/INPADOC [--country=EP,DE,US]
 *
 * Cursor-Datei /tmp/inpadoc-cursor.json speichert Fortschritt.
 * Neustart setzt genau dort fort.
 */

// @ts-nocheck — strip-types Modus, kein tsc-Transform nötig
import { readdirSync, existsSync, writeFileSync, readFileSync, mkdirSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { spawnSync } from "child_process";
import postgres from "postgres";

// ── DB ─────────────────────────────────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL fehlt"); process.exit(1); }

const isLocal = !DB_URL.includes("neon") && !DB_URL.includes("sslmode=require");
const pg = postgres(DB_URL, { ssl: isLocal ? false : "require", max: 5 });

// ── Konstanten ─────────────────────────────────────────────────────────────────

const CURSOR_FILE = "/tmp/inpadoc-cursor.json";
const TMP_DIR     = "/tmp/inpadoc-work";
const BATCH_SIZE  = 1000;

// EP-LEGSTAT Event-Codes die auf Ablauf/Rücknahme hinweisen
const LAPSE_CODES = new Set([
  "PG25",  // Lapsed in a contracting state (EPO LEGSTAT Hauptcode)
  "18D",   // Application deemed withdrawn
  "18W",   // Application withdrawn
  "20D",   // PCT-Anmeldung als zurückgezogen gilt
  "20W",   // PCT withdrawal
  "LAPS",  // Patent lapsed in contracting state (non-payment)
  "LAPN",  // Patent lapsed (no longer in force)
  "LAP",   // Patent lapsed
  "LAPC",  // Patent lapsed
  "SP",    // Waived / surrendered
]);

// ── Cursor ────────────────────────────────────────────────────────────────────

interface Cursor {
  outerFile: string;
  innerEntry: string;
  totalRecords: number;
}

function loadCursor(): Cursor | null {
  try {
    if (existsSync(CURSOR_FILE)) return JSON.parse(readFileSync(CURSOR_FILE, "utf-8"));
  } catch {}
  return null;
}

function saveCursor(c: Cursor) {
  writeFileSync(CURSOR_FILE, JSON.stringify(c, null, 2));
}

function deleteCursor() {
  try { unlinkSync(CURSOR_FILE); } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDate(raw: string): string | null {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length !== 8) return null;
  const y = d.slice(0, 4); const m = d.slice(4, 6); const day = d.slice(6, 8);
  if (m < "01" || m > "12" || day < "01" || day > "31") return null;
  return `${y}-${m}-${day}`;
}

function xmlVal(chunk: string, tag: string): string {
  return chunk.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`))?.[1]?.trim() ?? "";
}

function addYears(date: string, n: number): string {
  return `${parseInt(date.slice(0, 4), 10) + n}${date.slice(4)}`;
}

// ── Parser ────────────────────────────────────────────────────────────────────

interface StubRow {
  patent_number: string;
  filing_date: string | null;
  grant_date: string | null;
  expiry_date: string | null;
  lapsed_at: string | null;
  status: string;
  source: string;
}

// Kind-Code Priorität für kanonische Publikationsnummer
const KIND_PRIORITY = ["B1", "B2", "B3", "B", "A1", "A2", "A3", "A4", "A", "T3", "T"];

function parseLegalStatusDoc(chunk: string): StubRow | null {
  const country = chunk.match(/<legal-status-document[^>]*\scountry="([A-Z]+)"/)?.[1] ?? "XX";

  // Anmeldedatum aus application-reference
  const appBlock = chunk.match(/<application-reference[\s\S]*?<\/application-reference>/)?.[0] ?? "";
  const appDocId = appBlock.match(/<document-id>[\s\S]*?<\/document-id>/)?.[0] ?? "";
  const appNum   = xmlVal(appDocId, "doc-number");
  const filingDate = extractDate(xmlVal(appDocId, "date"));

  // Beste Publikationsnummer aus allen publication-reference Blöcken
  let bestKindIdx = KIND_PRIORITY.length;
  let pubNumber   = "";
  let pubKind     = "";
  let grantDate: string | null = null;

  for (const refMatch of chunk.matchAll(/<publication-reference[\s\S]*?<\/publication-reference>/g)) {
    const didBlock = refMatch[0].match(/<document-id>[\s\S]*?<\/document-id>/)?.[0] ?? "";
    const kind = xmlVal(didBlock, "kind");
    const num  = xmlVal(didBlock, "doc-number");
    const date = xmlVal(didBlock, "date");
    const kidx = KIND_PRIORITY.indexOf(kind);

    if (num && kidx !== -1 && kidx < bestKindIdx) {
      bestKindIdx = kidx;
      pubNumber   = num.replace(/\s/g, "");
      pubKind     = kind;
    }
    if ((kind === "B1" || kind === "B2") && date) {
      grantDate = extractDate(date);
    }
  }

  // Kanonische Nummer: bevorzuge Publikation, fallback auf Anmeldung
  const patentNumber = pubNumber
    ? `${country}${pubNumber}${pubKind}`
    : appNum
      ? `${country}${appNum.replace(/\s/g, "")}A`
      : null;

  if (!patentNumber || patentNumber.length < 4) return null;

  // Nur B-Kind (erteilte Patente) — A-Kind und reine Anmeldungen überspringen
  if (!pubKind.startsWith("B")) return null;

  // Status aus Events ableiten
  let isLapsed  = false;
  let lapseDate: string | null = null;

  for (const evtMatch of chunk.matchAll(/<legal-event[\s\S]*?<\/legal-event>/g)) {
    const evt  = evtMatch[0];
    const code = xmlVal(evt, "event-code");
    if (LAPSE_CODES.has(code)) {
      isLapsed  = true;
      const ed  = xmlVal(evt, "event-date");
      if (ed && !lapseDate) lapseDate = extractDate(ed);
    }
  }

  // Textbasierter Fallback-Check
  if (!isLapsed && (
    chunk.includes("DEEMED TO BE WITHDRAWN") ||
    chunk.includes("PATENT LAPSED") ||
    chunk.includes("APPLICATION WITHDRAWN")
  )) {
    isLapsed = true;
  }

  // lapsed_at = echtes Ereignisdatum; expiry_date = theoretisches Maximum (20 Jahre)
  const theoreticalExpiry = filingDate ? addYears(filingDate, 20) : null;

  // EP-Spezialfall: Lapse-Event < 6 Monate nach Grant = nationale Designierung lapsed,
  // nicht das EP-Patent selbst. Erteilt = Patent lebte weiter → als aktiv behandeln.
  const isEpNationalLapse = country === "EP"
    && isLapsed
    && grantDate !== null
    && lapseDate !== null
    && lapseDate < (() => { const d = new Date(grantDate + "T00:00:00Z"); d.setMonth(d.getMonth() + 6); return d.toISOString().slice(0, 10); })()  // < 6 Monate nach Grant
    && theoreticalExpiry !== null
    && theoreticalExpiry > new Date().toISOString().slice(0, 10);

  const effectiveLapsed = isLapsed && !isEpNationalLapse;
  const status          = effectiveLapsed ? "lapsed" : "active";

  return {
    patent_number: patentNumber,
    filing_date:  filingDate,
    grant_date:   grantDate,
    expiry_date:  theoreticalExpiry,
    lapsed_at:    effectiveLapsed ? lapseDate : null,
    status,
    source: country.toLowerCase(),
  };
}

// ── DB Upsert ─────────────────────────────────────────────────────────────────

async function upsertBatch(rows: StubRow[]): Promise<void> {
  if (!rows.length) return;

  // Dedup innerhalb des Batches — gleiche patent_number zusammenführen
  const merged = new Map<string, StubRow>();
  for (const r of rows) {
    const ex = merged.get(r.patent_number);
    if (!ex) { merged.set(r.patent_number, { ...r }); continue; }
    if (!ex.filing_date) ex.filing_date = r.filing_date;
    if (!ex.grant_date)  ex.grant_date  = r.grant_date;
    if (r.status === "lapsed") ex.status = "lapsed";
    if (r.lapsed_at && (!ex.lapsed_at || r.lapsed_at < ex.lapsed_at)) ex.lapsed_at = r.lapsed_at;
  }
  const deduped = [...merged.values()];

  const nums      = deduped.map(r => r.patent_number);
  const filings   = deduped.map(r => r.filing_date);
  const grants    = deduped.map(r => r.grant_date);
  const expiries  = deduped.map(r => r.expiry_date);
  const lapsedAts = deduped.map(r => r.lapsed_at);
  const statuses  = deduped.map(r => r.status);
  const sources   = deduped.map(r => r.source);

  await pg`
    INSERT INTO patents
      (id, patent_number, title, filing_date, grant_date, expiry_date,
       lapsed_at, cpc_codes, status, source, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      t.patent_number,
      NULL::text,
      t.filing_date::date,
      t.grant_date::date,
      t.expiry_date::date,
      t.lapsed_at::date,
      '{}'::text[],
      t.status,
      t.source,
      now(), now()
    FROM unnest(
      ${nums}::text[],
      ${filings}::text[],
      ${grants}::text[],
      ${expiries}::text[],
      ${lapsedAts}::text[],
      ${statuses}::text[],
      ${sources}::text[]
    ) AS t(patent_number, filing_date, grant_date, expiry_date, lapsed_at, status, source)
    ON CONFLICT (patent_number) DO UPDATE SET
      filing_date = COALESCE(patents.filing_date, EXCLUDED.filing_date),
      grant_date  = COALESCE(patents.grant_date,  EXCLUDED.grant_date),
      expiry_date = COALESCE(patents.expiry_date, EXCLUDED.expiry_date),
      lapsed_at   = COALESCE(
        CASE WHEN patents.lapsed_at < EXCLUDED.lapsed_at THEN patents.lapsed_at ELSE EXCLUDED.lapsed_at END,
        patents.lapsed_at,
        EXCLUDED.lapsed_at
      ),
      status      = CASE
                      WHEN patents.status = 'lapsed' THEN 'lapsed'
                      WHEN EXCLUDED.status = 'lapsed' THEN 'lapsed'
                      ELSE patents.status
                    END,
      updated_at  = now()
  `;
}

// ── XML verarbeiten ───────────────────────────────────────────────────────────

async function processXmlBuffer(xml: string, country: string): Promise<number> {
  const parts = xml.split(/<legal-status-document\b/);
  let batch: StubRow[] = [];
  let count = 0;

  for (let i = 1; i < parts.length; i++) {
    const end  = parts[i].indexOf("</legal-status-document>");
    if (end === -1) continue;
    const chunk = `<legal-status-document${parts[i].slice(0, end + "</legal-status-document>".length)}`;
    const row = parseLegalStatusDoc(chunk);
    if (!row) continue;
    batch.push(row);
    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch.splice(0));
      count += BATCH_SIZE;
      process.stdout.write(`\r  [${country}] ${count.toLocaleString()} ...`);
    }
  }
  if (batch.length) {
    await upsertBatch(batch);
    count += batch.length;
  }
  return count;
}

// ── ZIP-Extraktion via unzip ──────────────────────────────────────────────────

function extractFromZip(zipPath: string, entry: string): Buffer {
  const result = spawnSync("unzip", ["-p", zipPath, entry], { maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`unzip failed for ${entry}: ${result.stderr?.toString().slice(0, 200)}`);
  }
  return result.stdout as Buffer;
}

async function processInnerZip(outerPath: string, innerEntry: string): Promise<number> {
  mkdirSync(TMP_DIR, { recursive: true });
  const tmpInner = join(TMP_DIR, "inner.zip");
  const country  = innerEntry.match(/LEGSTAT-\d+-([A-Z]+)-/)?.[1] ?? "XX";

  // Schritt 1: inner ZIP aus outer ZIP extrahieren
  const innerZipBuf = extractFromZip(outerPath, innerEntry);
  writeFileSync(tmpInner, innerZipBuf);

  // Schritt 2: XML aus inner ZIP extrahieren (enthält genau eine XML-Datei)
  const xmlEntry = basename(innerEntry).replace(/\.zip$/, ".xml");
  const xmlBuf   = extractFromZip(tmpInner, xmlEntry);

  try { unlinkSync(tmpInner); } catch {}

  const xml   = xmlBuf.toString("utf-8");
  const count = await processXmlBuffer(xml, country);
  return count;
}

// ── Inner-Entries aus outer ZIP listen ───────────────────────────────────────

function listInnerEntries(outerPath: string, countryFilter: string[]): string[] {
  const result = spawnSync("unzip", ["-l", outerPath], { maxBuffer: 50 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`unzip -l failed for ${outerPath}`);

  const lines = (result.stdout as Buffer).toString("utf-8").split("\n");
  const entries: string[] = [];

  for (const line of lines) {
    const m = line.match(/\s+(Root\/DOC\/LEGSTAT-\d+-([A-Z]+)-[^.]+\.zip)\s*$/);
    if (!m) continue;
    const country = m[2];
    if (countryFilter.length > 0 && !countryFilter.includes(country)) continue;
    entries.push(m[1]);
  }
  return entries;
}

// ── Hauptprogramm ─────────────────────────────────────────────────────────────

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) {
    console.error("Usage: import-inpadoc.ts <verzeichnis> [--country=EP,DE,US]");
    process.exit(1);
  }

  const countryArg    = process.argv.find(a => a.startsWith("--country="));
  const countryFilter = countryArg ? countryArg.slice("--country=".length).toUpperCase().split(",") : [];

  const outerFiles = readdirSync(inputDir)
    .filter(f => f.startsWith("backfile-legstat") && f.endsWith(".zip"))
    .sort()
    .map(f => join(inputDir, f));

  if (!outerFiles.length) {
    console.error("Keine backfile-legstat*.zip Dateien in", inputDir);
    process.exit(1);
  }

  const cursor       = loadCursor();
  let totalRecords   = cursor?.totalRecords ?? 0;
  let skipOuter      = cursor?.outerFile ?? null;
  let skipInner      = cursor?.innerEntry ?? null;

  console.log(`\nINPADOC Import — ${outerFiles.length} Outer-ZIPs`);
  if (cursor) {
    console.log(`Fortsetze ab: ${cursor.outerFile} / ${basename(cursor.innerEntry)}`);
    console.log(`Bereits importiert: ${totalRecords.toLocaleString()} Records\n`);
  }
  if (countryFilter.length) console.log(`Länderfilter: ${countryFilter.join(", ")}\n`);

  for (const outerPath of outerFiles) {
    const outerName = basename(outerPath);

    // Bis zur Cursor-Position springen
    if (skipOuter && outerName < skipOuter) {
      console.log(`Überspringe (erledigt): ${outerName}`);
      continue;
    }

    console.log(`\nOuter: ${outerName}`);
    let innerEntries: string[];
    try {
      innerEntries = listInnerEntries(outerPath, countryFilter);
    } catch (e) {
      console.error(`  Fehler beim Lesen von ${outerName}: ${(e as Error).message}`);
      continue;
    }
    console.log(`  ${innerEntries.length} inner ZIPs`);

    let passedInner = (skipOuter === null || outerName > skipOuter);

    for (const entry of innerEntries) {
      // Innerhalb des Cursor-Outer-Files: bis zur gespeicherten Position springen
      if (!passedInner) {
        if (entry === skipInner) {
          passedInner = true; // dieser Eintrag war der letzte verarbeitete, nächster starten
          process.stdout.write(".");
          continue;
        }
        process.stdout.write(".");
        continue;
      }

      const entryName = basename(entry);
      try {
        const n = await processInnerZip(outerPath, entry);
        totalRecords += n;
        console.log(`\n  ${entryName} → ${n.toLocaleString()} (gesamt: ${totalRecords.toLocaleString()})`);
        saveCursor({ outerFile: outerName, innerEntry: entry, totalRecords });
      } catch (e) {
        console.error(`\n  FEHLER ${entryName}: ${(e as Error).message.slice(0, 200)}`);
        // Fehler loggen und weitermachen
      }
    }

    // Outer-File abgeschlossen: Cursor-Sperre aufheben
    if (skipOuter === outerName) {
      skipOuter = null;
      skipInner = null;
    }
  }

  // Abschluss-Stats
  const [{ count }] = await pg`SELECT count(*)::bigint AS count FROM patents`;
  console.log(`\n\nImport abgeschlossen.`);
  console.log(`Diese Session importiert: ${totalRecords.toLocaleString()} Records`);
  console.log(`Total Patente in DB:      ${Number(count).toLocaleString()}`);
  deleteCursor();
  await pg.end();
}

main().catch(e => { console.error(e); process.exit(1); });
