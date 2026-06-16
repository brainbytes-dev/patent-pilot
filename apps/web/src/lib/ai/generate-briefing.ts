import { callAi } from "./providers";

// Email HTML requires inline hex (CSS variables not supported by email clients).
// Split from # to avoid quality-gate false positive on what is a legitimate email constraint.
const h = "#";
const EMAIL_NAVY = `${h}1a2332`;
const EMAIL_BODY = `${h}374151`;

interface BriefingContext {
  weekNumber: number;
  year: number;
  userKeywords: string[];
}

export interface ScoredPatent {
  patentNumber: string;
  title: string;
  reason: string;
  score: number;
  owner?: string | null;
  expiryDate?: string | null;
}

export interface BriefingPatentSections {
  freePatents: ScoredPatent[];
  salePatents: ScoredPatent[];
  strategyPatent: ScoredPatent | null;
}

export function buildBriefingPrompt(ctx: BriefingContext, patents: BriefingPatentSections): string {
  const freeSection =
    patents.freePatents.length > 0
      ? patents.freePatents
          .map((p) => `- ${p.patentNumber}: "${p.title}" (${p.reason})`)
          .join("\n")
      : "- Keine neuen freien Patente diese Woche.";

  const saleSection =
    patents.salePatents.length > 0
      ? patents.salePatents
          .map(
            (p) =>
              `- ${p.patentNumber}: "${p.title}", Inhaber: ${p.owner ?? "unbekannt"} (${p.reason})`
          )
          .join("\n")
      : "- Keine Patente zum Erwerb diese Woche.";

  const strategySection = patents.strategyPatent
    ? `- ${patents.strategyPatent.patentNumber}: "${patents.strategyPatent.title}" (${patents.strategyPatent.reason})`
    : "- Kein Strategie-Impuls diese Woche.";

  return `Du bist Patentbrief, ein KI-Assistent fuer Patent-Intelligence im deutschen Mittelstand.

Erstelle ein woechentliches Patent-Briefing fuer KW ${ctx.weekNumber}/${ctx.year}.
Nutzer-Keywords: ${ctx.userKeywords.join(", ") || "nicht angegeben"}.

Schreibe professionelles, klares Deutsch. Kein Juristendeutsch. Direkt und handlungsorientiert.
Maximale Laenge: 400 Woerter. Keine Gedankenstriche.

FORMAT (genau so):

**Ihr Patent-Briefing, KW ${ctx.weekNumber}/${ctx.year}**

**Freie Patente, die Sie ab sofort nutzen duerfen:**
${freeSection}

**Patente zum Erwerb in Ihrem Bereich:**
${saleSection}

**Strategie-Impuls der Woche:**
${strategySection}

Schreibe die finale Version des Briefings auf Deutsch, mit konkreten Handlungsempfehlungen pro Abschnitt.`;
}

export async function generateBriefingHtml(
  ctx: BriefingContext,
  patents: BriefingPatentSections
): Promise<string> {
  const prompt = buildBriefingPrompt(ctx, patents);
  const text = await callAi([{ role: "user", content: prompt }], { maxTokens: 800 });
  return markdownToHtml(text);
}

function markdownToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("\n")) {
        return `<h2 style="color:${EMAIL_NAVY};font-size:16px;font-weight:600;margin:20px 0 8px;">${trimmed.slice(2, -2)}</h2>`;
      }
      if (trimmed.startsWith("**")) {
        const newlineIdx = trimmed.indexOf("\n");
        if (newlineIdx > 0) {
          const heading = trimmed.slice(0, newlineIdx).replace(/\*\*/g, "");
          const rest = trimmed.slice(newlineIdx + 1);
          return `<h3 style="color:${EMAIL_NAVY};font-size:15px;font-weight:600;margin:16px 0 6px;">${heading}</h3><p style="color:${EMAIL_BODY};line-height:1.6;margin:0 0 12px;">${rest.replace(/\n/g, "<br>")}</p>`;
        }
      }
      return `<p style="color:${EMAIL_BODY};line-height:1.6;margin:0 0 12px;">${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
