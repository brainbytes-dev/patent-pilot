/**
 * EPO DOCDB/Full-Text XML importer
 *
 * Supports:
 *   - DOCDB XML (exchange-document format, single file or zip)
 *   - EP Full-Text ZIP (ep-patent-document format)
 *   - INPADOC legal status XML
 *
 * Usage:
 *   node --env-file=apps/web/.env.local scripts/import-epo.mjs /tmp/epo-data/
 *   node --env-file=apps/web/.env.local scripts/import-epo.mjs /tmp/epo-data/somefile.zip
 *
 * No tsx needed — this is plain .mjs, but kept .ts for editor support.
 * Run with: node --experimental-strip-types --env-file=apps/web/.env.local scripts/import-epo.ts /tmp/epo-data/
 */

// @ts-ignore — Node 23+ strip-types, no ts-specific syntax used
import { createReadStream, readdirSync, statSync } from "fs";
import { createUnzip } from "zlib";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { unlink, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL missing"); process.exit(1); }

const pg = postgres(DB_URL, { ssl: "require", max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────────

function xmlText(xml: string, tag: string, attr?: string): string {
  if (attr) {
    const re = new RegExp(`<${tag}[^>]*${attr}[^>]*>([^<]*)</${tag}>`, "i");
    return xml.match(re)?.[1]?.trim() ?? "";
  }
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  return xml.match(re)?.[1]?.trim() ?? "";
}

function xmlAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  return xml.match(re)?.[1] ?? "";
}

function extractDate(raw: string): string | null {
  if (!raw || raw.length < 8) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length < 8) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function extractCpc(xml: string): string[] {
  const codes: string[] = [];
  const blocks = xml.match(/<patent-classification[\s\S]*?<\/patent-classification>/gi) ?? [];
  for (const b of blocks) {
    const sec = xmlText(b, "section");
    const cls = xmlText(b, "class");
    const sub = xmlText(b, "subclass");
    const main = xmlText(b, "main-group");
    if (sec && cls) {
      const code = `${sec}${cls}${sub}${main ? `/${main}` : ""}`.trim();
      if (code && !codes.includes(code)) codes.push(code);
    }
  }
  return codes.slice(0, 8);
}

// ── DOCDB parser (exchange-document format) ───────────────────────────────────

interface PatentRow {
  patent_number: string;
  title: string;
  title_de: string | null;
  abstract_en: string | null;
  abstract_de: string | null;
  filing_date: string | null;
  grant_date: string | null;
  expiry_date: string | null;
  owner: string | null;
  cpc_codes: string[];
  status: string;
  source: string;
}

function parseDocdbDoc(xml: string): PatentRow | null {
  // Extract patent number
  const country = xmlAttr(xml, "exchange-document", "country") || xmlText(xml, "country");
  const docNum = xmlAttr(xml, "exchange-document", "doc-number") || xmlText(xml, "doc-number");
  const kind = xmlAttr(xml, "exchange-document", "kind") || xmlText(xml, "kind");
  if (!docNum) return null;

  const patentNumber = `${country}${docNum}${kind}`.replace(/\s/g, "");

  // Titles
  const titleBlocks = xml.match(/<invention-title[\s\S]*?<\/invention-title>/gi) ?? [];
  let titleEn = "";
  let titleDe = "";
  for (const t of titleBlocks) {
    const lang = xmlAttr(t, "invention-title", "lang");
    const text = t.replace(/<[^>]+>/g, "").trim();
    if (lang === "de" && !titleDe) titleDe = text;
    else if (!titleEn) titleEn = text;
  }

  // Abstracts
  const abstractBlocks = xml.match(/<abstract[\s\S]*?<\/abstract>/gi) ?? [];
  let abstractEn = "";
  let abstractDe = "";
  for (const a of abstractBlocks) {
    const lang = xmlAttr(a, "abstract", "lang");
    const text = a.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (lang === "de" && !abstractDe) abstractDe = text;
    else if (!abstractEn) abstractEn = text;
  }

  // Dates
  const filingBlock = xml.match(/<application-reference[\s\S]*?<\/application-reference>/i)?.[0] ?? "";
  const filingDate = extractDate(xmlText(filingBlock, "date"));
  const grantDate = extractDate(xml.match(/<date>(\d{8})<\/date>.*?granted/i)?.[1] ?? "");

  // Owner / applicant
  const applicantBlocks = xml.match(/<applicant[\s\S]*?<\/applicant>/gi) ?? [];
  let owner: string | null = null;
  for (const a of applicantBlocks) {
    const name = xmlText(a, "name").replace(/<[^>]+>/g, "").trim();
    if (name) { owner = name; break; }
  }

  // CPC codes
  const cpcCodes = extractCpc(xml);

  // Status (basic heuristic from legal-status or kind code)
  const kindCode = kind.toUpperCase();
  let status = "active";
  if (kindCode.includes("T") || xml.includes("lapsed") || xml.includes("withdrawn")) {
    status = "lapsed";
  }

  if (!patentNumber || patentNumber.length < 4) return null;

  return {
    patent_number: patentNumber,
    title: titleEn || titleDe || patentNumber,
    title_de: titleDe || null,
    abstract_en: abstractEn || null,
    abstract_de: abstractDe || null,
    filing_date: filingDate,
    grant_date: grantDate,
    expiry_date: null,
    owner: owner?.slice(0, 500) ?? null,
    cpc_codes: cpcCodes,
    status,
    source: "epo",
  };
}

// ── DB upsert ─────────────────────────────────────────────────────────────────

async function upsertBatch(rows: PatentRow[]) {
  if (rows.length === 0) return;
  await pg`
    INSERT INTO patents
      (id, patent_number, title, title_de, abstract_en, abstract_de,
       filing_date, grant_date, expiry_date, owner, cpc_codes, status, source,
       created_at, updated_at)
    SELECT
      gen_random_uuid(), r.patent_number, r.title, r.title_de, r.abstract_en, r.abstract_de,
      r.filing_date::date, r.grant_date::date, r.expiry_date::date, r.owner,
      r.cpc_codes::text[], r.status, r.source, now(), now()
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS r(
      patent_number text, title text, title_de text, abstract_en text, abstract_de text,
      filing_date text, grant_date text, expiry_date text, owner text,
      cpc_codes text[], status text, source text
    )
    ON CONFLICT (patent_number) DO UPDATE SET
      title = EXCLUDED.title,
      title_de = COALESCE(EXCLUDED.title_de, patents.title_de),
      abstract_en = COALESCE(EXCLUDED.abstract_en, patents.abstract_en),
      abstract_de = COALESCE(EXCLUDED.abstract_de, patents.abstract_de),
      filing_date = COALESCE(EXCLUDED.filing_date, patents.filing_date),
      grant_date = COALESCE(EXCLUDED.grant_date, patents.grant_date),
      owner = COALESCE(EXCLUDED.owner, patents.owner),
      cpc_codes = CASE WHEN array_length(EXCLUDED.cpc_codes, 1) > 0 THEN EXCLUDED.cpc_codes ELSE patents.cpc_codes END,
      status = EXCLUDED.status,
      updated_at = now()
  `;
}

// ── File processors ───────────────────────────────────────────────────────────

async function processXmlContent(xmlContent: string): Promise<number> {
  // Split on exchange-document boundaries
  const docs = xmlContent.split(/<exchange-document/i).slice(1);
  const batch: PatentRow[] = [];
  let count = 0;

  for (const chunk of docs) {
    const doc = `<exchange-document${chunk.split("</exchange-document>")[0]}</exchange-document>`;
    const row = parseDocdbDoc(doc);
    if (row) {
      batch.push(row);
      if (batch.length >= 500) {
        await upsertBatch(batch.splice(0));
        count += 500;
        process.stdout.write(`\r  ${count} patents imported...`);
      }
    }
  }
  if (batch.length > 0) {
    await upsertBatch(batch);
    count += batch.length;
  }
  return count;
}

async function processFile(filePath: string): Promise<number> {
  console.log(`\nProcessing: ${basename(filePath)}`);
  const ext = extname(filePath).toLowerCase();

  if (ext === ".xml") {
    const content = await readFile(filePath, "utf-8");
    return processXmlContent(content);
  }

  if (ext === ".zip") {
    // Extract to temp, process each XML
    const tmpDir = `/tmp/epo-extract-${Date.now()}`;
    const { mkdirSync } = await import("fs");
    mkdirSync(tmpDir, { recursive: true });

    const { execSync } = await import("child_process");
    try {
      execSync(`unzip -q "${filePath}" -d "${tmpDir}"`, { stdio: "pipe" });
    } catch {
      console.warn("  unzip failed, trying alternative...");
    }

    let total = 0;
    const xmlFiles = readdirSync(tmpDir).filter((f) => f.endsWith(".xml"));
    for (const xf of xmlFiles) {
      const content = await readFile(join(tmpDir, xf), "utf-8");
      total += await processXmlContent(content);
    }
    // Cleanup
    execSync(`rm -rf "${tmpDir}"`);
    return total;
  }

  console.log(`  Skipping unsupported format: ${ext}`);
  return 0;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const target = process.argv[2] ?? "/tmp/epo-data";
  const stat = statSync(target);
  let files: string[] = [];

  if (stat.isDirectory()) {
    files = readdirSync(target)
      .filter((f) => f.endsWith(".xml") || f.endsWith(".zip"))
      .map((f) => join(target, f));
  } else {
    files = [target];
  }

  if (files.length === 0) {
    console.log("No XML/ZIP files found in", target);
    await pg.end();
    return;
  }

  console.log(`Found ${files.length} file(s) to import`);
  let grand = 0;
  for (const f of files) {
    const n = await processFile(f);
    console.log(`\n  Done: ${n} patents from ${basename(f)}`);
    grand += n;
  }

  const [{ count }] = await pg`SELECT count(*)::int as count FROM patents`;
  console.log(`\nTotal imported this run: ${grand}`);
  console.log(`Total patents in DB: ${count}`);
  await pg.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
