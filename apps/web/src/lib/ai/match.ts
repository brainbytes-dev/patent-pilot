import { callAi } from "./providers";

interface PatentInput {
  title: string;
  abstractEn: string | null;
  cpcCodes: string[];
}

interface WatchlistInput {
  industries: string[];
  keywords: string[];
  cpcCodes: string[];
}

export function buildMatchPrompt(patent: PatentInput, watchlist: WatchlistInput): string {
  return `Du bist ein Patent-Intelligence-Analyst fuer den deutschen Mittelstand.

Benutzer-Profil:
- Branchen: ${watchlist.industries.join(", ") || "nicht angegeben"}
- Keywords: ${watchlist.keywords.join(", ") || "nicht angegeben"}
- CPC-Klassen: ${watchlist.cpcCodes.join(", ") || "nicht angegeben"}

Patent:
- Titel: ${patent.title}
- Abstract: ${patent.abstractEn ?? "(nicht verfuegbar)"}
- CPC-Codes: ${patent.cpcCodes.join(", ") || "nicht angegeben"}

Bewerte die Relevanz dieses Patents fuer den Benutzer auf einer Skala von 0-100.
Antworte NUR mit validem JSON: {"score": <0-100>, "reason": "<1 Satz auf Deutsch, warum relevant oder nicht>"}`;
}

export function parseMatchResponse(raw: string): { score: number; reason: string } {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { score: 0, reason: "" };
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return { score: 0, reason: "" };
  }
}

export async function scorePatentRelevance(
  patent: PatentInput,
  watchlist: WatchlistInput
): Promise<{ score: number; reason: string }> {
  const prompt = buildMatchPrompt(patent, watchlist);
  const response = await callAi([{ role: "user", content: prompt }], {
    maxTokens: 200,
    json: true,
  });
  return parseMatchResponse(response);
}
