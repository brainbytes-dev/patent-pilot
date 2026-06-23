import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { patents, patentDrawings } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import AdmZip from "adm-zip";
import UTIF from "utif";
import { PNG } from "pngjs";

const EPS_BASE = "https://data.epo.org/publication-server/rest/v1.2/patents";
const KIND_CODES = ["B2", "B1", "A1", "A2", "B3"];

function epsBarNumber(patentNumber: string): string {
  return patentNumber.replace(/^EP0*/, "").replace(/[A-Z]\d*$/, "").padStart(7, "0");
}

/** Fetch the ZIP for the first available kind code, return zip + entries. */
async function fetchZip(patentNumber: string): Promise<{ zip: AdmZip; kind: string } | null> {
  const bare = epsBarNumber(patentNumber);
  for (const kind of KIND_CODES) {
    const url = `${EPS_BASE}/EP${bare}NW${kind}/document.zip`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      return { zip: new AdmZip(buf), kind };
    } catch {
      continue;
    }
  }
  return null;
}

function tiffEntryToPng(zip: AdmZip, name: string): Buffer {
  const tiff = zip.getEntry(name)!.getData();
  const ifds = UTIF.decode(tiff);
  UTIF.decodeImage(tiff, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const { width, height } = ifds[0];
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  // 1. Return cached drawings from DB
  const cached = await db
    .select({ page: patentDrawings.page })
    .from(patentDrawings)
    .where(eq(patentDrawings.patentId, id))
    .orderBy(patentDrawings.page);

  if (cached.length > 0) {
    return NextResponse.json({
      drawings: cached.map((r) => ({ page: r.page, url: `/api/patents/${id}/drawings/${r.page}` })),
    });
  }

  // 2. Not cached yet — check if it's an EP patent
  const [patent] = await db
    .select({ patentNumber: patents.patentNumber })
    .from(patents)
    .where(eq(patents.id, id))
    .limit(1);

  if (!patent?.patentNumber.startsWith("EP")) {
    return NextResponse.json({ drawings: [] });
  }

  // 3. Fetch ZIP from EPS, discover pages, cache all figure drawings
  const result = await fetchZip(patent.patentNumber);
  if (!result) return NextResponse.json({ drawings: [] });

  const { zip } = result;
  const names = zip.getEntries().map((e) => e.entryName);

  // Collect all imgf (figure) or imgb (body) drawing pages
  const figureEntries = names
    .filter((n) => /^imgf\d{4}\.tif$/.test(n))
    .sort();
  const fallbackEntries = figureEntries.length === 0
    ? names.filter((n) => /^imgb\d{4}\.tif$/.test(n)).sort()
    : [];
  const drawingEntries = figureEntries.length > 0 ? figureEntries : fallbackEntries;

  if (drawingEntries.length === 0) return NextResponse.json({ drawings: [] });

  // Cache all pages in DB
  const inserts = await Promise.allSettled(
    drawingEntries.map(async (name, idx) => {
      const page = idx + 1;
      const png = tiffEntryToPng(zip, name);
      await db.insert(patentDrawings).values({
        patentId: id,
        page,
        pngData: png,
      }).onConflictDoNothing();
      return page;
    })
  );

  const pages = inserts
    .filter((r): r is PromiseFulfilledResult<number> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => a - b);

  return NextResponse.json({
    drawings: pages.map((page) => ({ page, url: `/api/patents/${id}/drawings/${page}` })),
  });
}
