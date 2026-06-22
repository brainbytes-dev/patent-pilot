import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Hr,
  Preview,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

// DESIGN.md Tokens (email clients don't support CSS vars — values hardcoded here)
const C = {
  sbbRed:       "#EB0000",
  ink:          "#1A1A1A",
  secondary:    "#5e5e5e",
  surface:      "#f9f9f9",
  surfacePaper: "#FFFFFF",
  border:       "#DCDCDC",
  hbOrange:     "#EF7C00",
  statusFree:   "#2a7d4f",
  statusFreeBg: "#e8f5ee",
} as const;

const F = {
  serif:  '"Source Serif 4", Georgia, serif',
  sans:   '"Inter", "Helvetica Neue", Arial, sans-serif',
  mono:   '"IBM Plex Sans", "Courier New", monospace',
} as const;

export interface BriefingPatent {
  id: string;
  patentNumber: string;
  title: string;
  titleDe?: string | null;
  cpcCodes: string[];
  owner?: string | null;
  lapsedAt?: string | null;   // YYYY-MM-DD aus INPADOC PG25
  filingDate?: string | null;
  recommendation?: string | null;
}

export interface BriefingEmailProps {
  weekNumber: number;
  year: number;
  patents: BriefingPatent[];
  dashboardUrl: string;
  watchlistUrl: string;
  unsubscribeUrl: string;
  userFirstName?: string;
  totalLapsedCount: number;  // wie viele total diese Woche abgelaufen
}

function formatDate(raw: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-CH", opts);
}

function PatentCard({ patent, dashboardUrl }: { patent: BriefingPatent; dashboardUrl: string }) {
  const displayTitle = patent.titleDe?.trim() || patent.title;
  const cpcDisplay = patent.cpcCodes.slice(0, 3).join(" · ");

  return (
    <Section style={{ marginBottom: "0" }}>
      {/* Red accent line */}
      <div style={{ height: "3px", backgroundColor: C.sbbRed, margin: "0" }} />

      <Section style={{ padding: "20px 32px 24px", backgroundColor: C.surfacePaper }}>
        {/* Status badge + Patent-Nr */}
        <Row>
          <Column>
            <Text style={{ margin: "0 0 8px", fontSize: "0" }}>
              <span style={{
                fontFamily: F.mono,
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.05em",
                color: C.statusFree,
                backgroundColor: C.statusFreeBg,
                padding: "3px 8px",
                textTransform: "uppercase" as const,
              }}>
                Jetzt frei
              </span>
              <span style={{
                fontFamily: F.mono,
                fontSize: "11px",
                color: C.secondary,
                marginLeft: "12px",
              }}>
                {patent.patentNumber}
              </span>
              {cpcDisplay && (
                <span style={{
                  fontFamily: F.mono,
                  fontSize: "11px",
                  color: C.secondary,
                  marginLeft: "12px",
                }}>
                  {cpcDisplay}
                </span>
              )}
            </Text>
          </Column>
        </Row>

        {/* Titel */}
        <Heading as="h3" style={{
          fontFamily: F.serif,
          fontSize: "18px",
          fontWeight: "600",
          color: C.ink,
          margin: "0 0 8px",
          lineHeight: "1.4",
        }}>
          {displayTitle}
        </Heading>

        {/* Meta: Inhaber + Ablaufdatum */}
        <Text style={{
          fontFamily: F.mono,
          fontSize: "12px",
          color: C.secondary,
          margin: "0 0 12px",
          lineHeight: "1.5",
        }}>
          {patent.owner ? `${patent.owner} · ` : ""}
          {patent.lapsedAt
            ? `Erloschen: ${formatDate(patent.lapsedAt, { year: "numeric", month: "long", day: "numeric" })}`
            : patent.filingDate
              ? `Angemeldet: ${formatDate(patent.filingDate, { year: "numeric", month: "long" })}`
              : ""}
        </Text>

        {/* Empfehlung */}
        {patent.recommendation && (
          <Text style={{
            fontFamily: F.sans,
            fontSize: "14px",
            color: C.ink,
            margin: "0 0 16px",
            lineHeight: "1.6",
            paddingLeft: "12px",
            borderLeft: `3px solid ${C.hbOrange}`,
          }}>
            {patent.recommendation}
          </Text>
        )}

        {/* Link */}
        <Link
          href={`${dashboardUrl}/patente/${patent.id}`}
          style={{
            fontFamily: F.sans,
            fontSize: "13px",
            fontWeight: "600",
            color: C.sbbRed,
            textDecoration: "none",
          }}
        >
          Patent ansehen →
        </Link>
      </Section>

      <Hr style={{ borderColor: C.border, margin: "0" }} />
    </Section>
  );
}

export function BriefingEmail({
  weekNumber,
  year,
  patents,
  dashboardUrl,
  watchlistUrl,
  unsubscribeUrl,
  userFirstName,
  totalLapsedCount,
}: BriefingEmailProps) {
  const greeting = userFirstName ? `Guten Morgen, ${userFirstName}` : "Guten Morgen";
  const hasMore = totalLapsedCount > patents.length;

  return (
    <Html lang="de">
      <Head />
      <Preview>
        {`KW ${weekNumber}/${year}: ${patents.length} Patente in Ihrem Feld sind diese Woche frei geworden`}
      </Preview>
      <Body style={{
        backgroundColor: C.surface,
        fontFamily: F.sans,
        margin: "0",
        padding: "32px 0",
      }}>
        <Container style={{
          backgroundColor: C.surfacePaper,
          maxWidth: "600px",
          margin: "0 auto",
          border: `1px solid ${C.border}`,
        }}>

          {/* Header */}
          <Section style={{ padding: "24px 32px 20px" }}>
            <Row>
              <Column>
                <Text style={{
                  fontFamily: F.serif,
                  fontSize: "22px",
                  fontWeight: "700",
                  color: C.ink,
                  margin: "0",
                  letterSpacing: "-0.01em",
                }}>
                  Patentbrief
                </Text>
              </Column>
              <Column style={{ textAlign: "right" as const }}>
                <Text style={{
                  fontFamily: F.mono,
                  fontSize: "12px",
                  color: C.secondary,
                  margin: "0",
                  letterSpacing: "0.05em",
                }}>
                  KW {weekNumber} / {year}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* SBB-Red header line */}
          <div style={{ height: "2px", backgroundColor: C.sbbRed }} />

          {/* Intro */}
          <Section style={{ padding: "24px 32px" }}>
            <Text style={{
              fontFamily: F.sans,
              fontSize: "15px",
              color: C.ink,
              margin: "0 0 12px",
            }}>
              {greeting},
            </Text>
            <Text style={{
              fontFamily: F.sans,
              fontSize: "15px",
              color: C.secondary,
              margin: "0",
              lineHeight: "1.6",
            }}>
              diese Woche sind{" "}
              <span style={{ color: C.ink, fontWeight: "600" }}>
                {totalLapsedCount} Patente
              </span>{" "}
              in Ihrem Watchlist-Bereich abgelaufen. Hier sind{" "}
              {patents.length === totalLapsedCount
                ? "alle"
                : `die ${patents.length} relevantesten`}
              :
            </Text>
          </Section>

          <Hr style={{ borderColor: C.border, margin: "0" }} />

          {/* Patent-Karten */}
          {patents.map((patent) => (
            <PatentCard
              key={patent.patentNumber}
              patent={patent}
              dashboardUrl={dashboardUrl}
            />
          ))}

          {/* "Mehr anzeigen" wenn mehr als gezeigt */}
          {hasMore && (
            <Section style={{ padding: "24px 32px", textAlign: "center" as const }}>
              <Link
                href={dashboardUrl}
                style={{
                  fontFamily: F.sans,
                  fontSize: "14px",
                  fontWeight: "600",
                  color: C.surfacePaper,
                  backgroundColor: C.sbbRed,
                  padding: "12px 32px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Alle {totalLapsedCount} Patente im Dashboard ansehen
              </Link>
            </Section>
          )}

          {/* Trennlinie */}
          <Hr style={{ borderColor: C.border, margin: "0" }} />

          {/* Footer-Links */}
          <Section style={{ padding: "16px 32px 8px" }}>
            <Text style={{
              fontFamily: F.sans,
              fontSize: "12px",
              color: C.secondary,
              margin: "0",
            }}>
              <Link href={dashboardUrl} style={{ color: C.ink, textDecoration: "none", fontWeight: "600" }}>
                Briefing-Archiv
              </Link>
              {" · "}
              <Link href={watchlistUrl} style={{ color: C.ink, textDecoration: "none", fontWeight: "600" }}>
                Watchlist anpassen
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "8px 32px 24px" }}>
            <Text style={{
              fontFamily: F.sans,
              fontSize: "11px",
              color: C.secondary,
              margin: "0 0 4px",
              lineHeight: "1.6",
            }}>
              Patentbrief liefert wöchentliche Patent-Intelligence für den DACH-Mittelstand.
              Kein Rechtsrat. Rechtsstatus aus amtlichen EPO-Registern.
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: "11px", color: C.secondary, margin: "0" }}>
              <Link href={unsubscribeUrl} style={{ color: C.secondary }}>
                Abmelden
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
