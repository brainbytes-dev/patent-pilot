/**
 * EP Bulk Enrichment via EPS (European Publication Server)
 *
 * Kein Auth, kein API-Key. Rate-Limit ist IP-basiert (10 GB/7d per IP).
 * NordVPN SOCKS5-Rotation über nl/se/us.socks.nordhold.net:1080 gibt uns
 * 3 IPs = ~30 GB/Woche Quota. Wir streamen nur die ersten ~20 KB des XML
 * (Biblio-Header), dann disconnect — effektiv ~15 KB/Patent statt 165 KB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     --env-file=apps/web/.env.local \
 *     scripts/enrich-ep-eps.ts [--concurrency=20] [--dry-run]
 */

// @ts-nocheck
import https from "https";
import { readFileSync, writeFileSync } from "fs";
import postgres from "postgres";
import { SocksProxyAgent } from "socks-proxy-agent";

// ── Config ──────────────────────────────────────────────────────────────────

const CONCURRENCY   = parseInt(process.argv.find(a => a.startsWith("--concurrency="))?.slice(14) ?? "8");
const DRY_RUN       = process.argv.includes("--dry-run");
const EPS_BASE      = "https://data.epo.org/publication-server/rest/v1.2/patents";
const STREAM_BYTES  = 25_000;  // ersten 25 KB lesen, dann abbrechen
const CURSOR_FILE   = "/tmp/enrich-ep-eps-cursor.json";
const BATCH_DB      = 100;     // DB-Batch für Updates

const NORDVPN_USER  = process.env.NORDVPN_USER ?? "zjgXNFFfHEDqw4WrgYPa1hMy";
const NORDVPN_PASS  = process.env.NORDVPN_PASS ?? "2Uh7BT6vDehhnZsmfTQJ3er3";

const PROXIES = [
  "nl.socks.nordhold.net",
  "se.socks.nordhold.net",
  "us.socks.nordhold.net",
].map(host => new SocksProxyAgent(
  `socks5://${NORDVPN_USER}:${NORDVPN_PASS}@${host}:1080`
));

// ── DB ──────────────────────────────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL fehlt"); process.exit(1); }
const isLocal = !DB_URL.includes("neon");
const pg = postgres(DB_URL, { ssl: isLocal ? false : "require", max: 10 });

// ── Proxy-Rotation ──────────────────────────────────────────────────────────

let proxyIdx = 0;
function nextProxy() {
  const p = PROXIES[proxyIdx % PROXIES.length];
  proxyIdx++;
  return p;
}

// ── XML-Parsing ─────────────────────────────────────────────────────────────

interface BiblioData {
  title: string | null;
  titleDe: string | null;
  cpcCodes: string[];
  applicant: string | null;
}

function parseEpsXml(xml: string): BiblioData {
  let title: string | null = null;
  let titleDe: string | null = null;
  const cpcCodes: string[] = [];
  let applicant: string | null = null;

  // ── Format 1: SDOBI (alte EP-Dokumente, <B540><B541>lang<B542>text)
  const b540 = xml.match(/<B540>([\s\S]*?)<\/B540>/)?.[1] ?? "";
  if (b540) {
    const pairs = b540.matchAll(/<B541>(\w+)<\/B541><B542>([\s\S]*?)<\/B542>/g);
    for (const [, lang, text] of pairs) {
      const t = text.replace(/<[^>]+>/g, "").trim();
      if (!t) continue;
      if (lang === "en" && !title)   title   = t;
      if (lang === "de" && !titleDe) titleDe = t;
      if (lang === "fr" && !title)   title   = t; // Fallback Französisch
    }

    // IPC aus B511/B512: " 5H 03H   3/08   A" → H03H3/08
    for (const [, raw] of xml.matchAll(/<B51[12]>([^<]+)<\/B51[12]>/g)) {
      // Entferne Edition-Prefix (einstellige Ziffer am Anfang) und Typ-Suffix
      const m = raw.trim().match(/^\d?([A-H])\s+(\d{2}[A-Z])\s+(\d+\/\d+)/);
      if (m) {
        const code = `${m[1]}${m[2]}${m[3]}`.replace(/\s/g, "");
        if (!cpcCodes.includes(code)) cpcCodes.push(code);
      }
    }

    // Applicant aus B731 oder B732
    applicant = xml.match(/<B73[12]>[\s\S]*?<snm>(.*?)<\/snm>/)?.[1]?.trim() ?? null;
  }

  // ── Format 2: Standard EP XML (neuere Dokumente, <invention-title lang="en">)
  if (!title) {
    for (const [, lang, text] of xml.matchAll(/<invention-title[^>]*lang="([^"]+)"[^>]*>([\s\S]*?)<\/invention-title>/g)) {
      const t = text.replace(/<[^>]+>/g, "").trim();
      if (!t) continue;
      if (lang === "en" && !title)   title   = t;
      if (lang === "de" && !titleDe) titleDe = t;
    }
    // CPC aus classification-ipcr
    for (const [, block] of xml.matchAll(/<classification-ipcr[^>]*>([\s\S]*?)<\/classification-ipcr>/g)) {
      const s = block.match(/<section>(.*?)<\/section>/)?.[1]?.trim() ?? "";
      const c = block.match(/<class>(.*?)<\/class>/)?.[1]?.trim() ?? "";
      const u = block.match(/<subclass>(.*?)<\/subclass>/)?.[1]?.trim() ?? "";
      const code = `${s}${c}${u}`.trim();
      if (code && !cpcCodes.includes(code)) cpcCodes.push(code);
    }
    // Applicant
    const appBlock = xml.match(/<applicant[^>]*sequence="01"[^>]*>([\s\S]*?)<\/applicant>/)?.[1] ?? "";
    applicant = appBlock.match(/<name>(.*?)<\/name>/)?.[1]?.trim() ?? null;
  }

  if (!title) title = titleDe;
  return { title, titleDe, cpcCodes: cpcCodes.slice(0, 8), applicant };
}

// ── HTTP Fetch mit Stream-Abort ──────────────────────────────────────────────

function fetchPartial(url: string, agent: SocksProxyAgent, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (val: string) => { if (!settled) { settled = true; resolve(val); } };
    const fail = (e: Error) => { if (!settled) { settled = true; reject(e); } };

    const req = https.get(url, { agent }, (res) => {
      if (res.statusCode === 404) { done(""); return; }
      if (res.statusCode !== 200) { fail(new Error(`HTTP ${res.statusCode}`)); return; }

      const chunks: Buffer[] = [];
      let total = 0;

      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        total += chunk.length;
        if (total >= maxBytes) res.destroy();
      });

      // close + error beide → resolve mit bisher empfangenen Daten
      const finish = () => done(Buffer.concat(chunks).toString("utf8"));
      res.on("close", finish);
      res.on("error", finish);
    });

    req.on("error", fail);
    req.setTimeout(15_000, () => { req.destroy(); fail(new Error("timeout")); });
  });
}

// ── EPS-Nummer aus patent_number ────────────────────────────────────────────

function toEpsNumber(patentNumber: string): string | null {
  // Format: EP{number}{kind}  z.B. EP0729353B1 → EP0729353NWB1
  // EPS erwartet: country + number + "NW" + kind (ggf. ohne NW auch ok)
  // Wir probieren direkt: EP{num}{kind}
  const m = patentNumber.match(/^EP(\d+)([A-Z]\d?)$/);
  if (!m) return null;
  return `EP${m[1]}NW${m[2]}`;
}

// ── Update-Batch ─────────────────────────────────────────────────────────────

interface UpdateRow {
  id: string;
  title: string;
  titleDe: string | null;
  cpcCodes: string[];
  applicant: string | null;
}

async function flushUpdates(rows: UpdateRow[]): Promise<void> {
  if (!rows.length) return;
  for (const r of rows) {
    const isError = r.title === "[error]" || r.title === "[no data]";
    if (isError) {
      // Nur Fehlerstatus setzen — niemals bestehende Daten überschreiben
      await pg`
        UPDATE patents SET
          title      = CASE WHEN title IS NULL THEN ${r.title} ELSE title END,
          updated_at = now()
        WHERE id = ${r.id}
      `;
    } else {
      await pg`
        UPDATE patents SET
          title      = ${r.title},
          title_de   = ${r.titleDe},
          cpc_codes  = ${r.cpcCodes},
          owner      = COALESCE(${r.applicant}, owner),
          updated_at = now()
        WHERE id = ${r.id}
      `;
    }
  }
}

// ── Haupt-Loop ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`EPS Bulk Enrichment — EP Patente (title IS NULL)`);
  console.log(`Concurrency: ${CONCURRENCY} | DRY_RUN: ${DRY_RUN}`);
  console.log(`Proxies: ${PROXIES.length} NordVPN SOCKS5\n`);

  // Gesamtzahl (null + retrybare [error])
  const [{ count: totalCount }] = await pg`
    SELECT count(*)::int as count FROM patents
    WHERE patent_number LIKE 'EP%' AND (title IS NULL OR title = '[error]')
  `;
  console.log(`Zu enrichen: ${Number(totalCount).toLocaleString()} EP-Patente\n`);

  let processed = 0;
  let enriched  = 0;
  let failed    = 0;
  const pending: UpdateRow[] = [];

  // Cursor (ID-basiert für Resumability)
  let lastId = "00000000-0000-0000-0000-000000000000";
  try { lastId = JSON.parse(readFileSync(CURSOR_FILE, "utf8")).lastId; } catch {}

  const saveCursor = (id: string) => {
    writeFileSync(CURSOR_FILE, JSON.stringify({ lastId: id }));
  };

  while (true) {
    // Nächsten Batch aus DB holen (inkl. [error]-Retry)
    const rows = await pg`
      SELECT id, patent_number FROM patents
      WHERE patent_number LIKE 'EP%'
        AND (title IS NULL OR title = '[error]')
        AND id > ${lastId}
      ORDER BY id
      LIMIT ${CONCURRENCY * 5}
    `;
    if (!rows.length) break;

    // Parallel verarbeiten
    await Promise.all(
      rows.map(async (row, i) => {
        const epsNum = toEpsNumber(row.patent_number);
        if (!epsNum) { failed++; return; }

        const url   = `${EPS_BASE}/${epsNum}/document.xml`;
        const agent = PROXIES[(proxyIdx + i) % PROXIES.length];

        if (DRY_RUN) {
          console.log(`DRY: ${url}`);
          return;
        }

        try {
          const xml    = await fetchPartial(url, agent, STREAM_BYTES);
          if (!xml) {
            // 404 oder leere Antwort — einmalig als [no data] markieren
            pending.push({ id: row.id, title: "[no data]", titleDe: null, cpcCodes: [], applicant: null });
            failed++;
            return;
          }
          const biblio = parseEpsXml(xml);
          if (biblio.title) {
            pending.push({
              id:        row.id,
              title:     biblio.title,
              titleDe:   biblio.titleDe,
              cpcCodes:  biblio.cpcCodes,
              applicant: biblio.applicant,
            });
            enriched++;
          } else {
            // XML da, aber kein Titel parsebar
            pending.push({ id: row.id, title: "[no data]", titleDe: null, cpcCodes: [], applicant: null });
            failed++;
          }
        } catch (e) {
          if (process.env.DEBUG) console.error(`\n${row.patent_number}: ${(e as Error).message}`);
          // Netzwerkfehler → [error] damit wir beim nächsten Run neu versuchen
          pending.push({ id: row.id, title: "[error]", titleDe: null, cpcCodes: [], applicant: null });
          failed++;
        }
      })
    );

    proxyIdx += rows.length;
    processed += rows.length;
    lastId = rows[rows.length - 1].id;

    // Batch in DB schreiben
    if (pending.length >= BATCH_DB) {
      await flushUpdates(pending.splice(0));
      saveCursor(lastId);
    }

    process.stdout.write(
      `\r  ${processed.toLocaleString()} verarbeitet | ${enriched.toLocaleString()} enriched | ${failed.toLocaleString()} failed`
    );
  }

  // Rest
  await flushUpdates(pending);
  saveCursor(lastId);

  console.log(`\n\nFertig. ${enriched.toLocaleString()} enriched, ${failed.toLocaleString()} failed.`);
  await pg.end();
}

main().catch(e => { console.error(e); process.exit(1); });
