import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { patents, patentDrawings } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import AdmZip from "adm-zip";
import UTIF from "utif";
import { PNG } from "pngjs";

const EPS_BASE = "https://data.epo.org/publication-server/rest/v1.2/patents";
const KIND_CODES = ["B2", "B1", "A1", "A2", "B3"];

async function fetchFromEPS(patentNumber: string, page: number): Promise<Buffer | null> {
  // Strip "EP", kind code suffix (B1, A1, …), then zero-pad to 7 digits
  const bare = patentNumber.replace(/^EP0*/, "").replace(/[A-Z]\d*$/, "").padStart(7, "0");
  const pagePadded = String(page).padStart(4, "0");

  for (const kind of KIND_CODES) {
    const epsId = `EP${bare}NW${kind}`;
    const url = `${EPS_BASE}/${epsId}/document.zip`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      const zip = new AdmZip(buffer);

      const entry =
        zip.getEntry(`imgf${pagePadded}.tif`) ??
        zip.getEntry(`imgb${pagePadded}.tif`);

      if (entry) return entry.getData();
    } catch {
      continue;
    }
  }

  return null;
}

function pngResponse(data: Buffer) {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; page: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id, page } = await params;
  const pageNum = parseInt(page);
  if (isNaN(pageNum) || pageNum < 1 || pageNum > 50) {
    return new NextResponse("Invalid page", { status: 400 });
  }

  const db = getDb();

  // 1. Check cache first
  const [cached] = await db
    .select({ pngData: patentDrawings.pngData })
    .from(patentDrawings)
    .where(and(eq(patentDrawings.patentId, id), eq(patentDrawings.page, pageNum)))
    .limit(1);

  if (cached) return pngResponse(cached.pngData);

  // 2. Look up patent number
  const [patent] = await db
    .select({ patentNumber: patents.patentNumber })
    .from(patents)
    .where(eq(patents.id, id))
    .limit(1);

  if (!patent) return new NextResponse("Not found", { status: 404 });
  if (!patent.patentNumber.startsWith("EP")) {
    return new NextResponse("No drawings for non-EP patents", { status: 404 });
  }

  // 3. Fetch from EPS
  const tiffBuffer = await fetchFromEPS(patent.patentNumber, pageNum);
  if (!tiffBuffer) return new NextResponse("No drawing found", { status: 404 });

  // 4. Convert TIFF → PNG and store
  const ifds = UTIF.decode(tiffBuffer);
  UTIF.decodeImage(tiffBuffer, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const { width, height } = ifds[0];
  const pngImg = new PNG({ width, height });
  pngImg.data = Buffer.from(rgba);
  const png = PNG.sync.write(pngImg);

  await db.insert(patentDrawings).values({
    patentId: id,
    page: pageNum,
    pngData: Buffer.from(png),
  }).onConflictDoNothing();

  return pngResponse(Buffer.from(png));
}
