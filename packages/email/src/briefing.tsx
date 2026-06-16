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
} from "@react-email/components";
import * as React from "react";

interface BriefingEmailProps {
  weekNumber: number;
  year: number;
  briefingHtml: string;
  dashboardUrl: string;
  watchlistUrl: string;
  unsubscribeUrl: string;
  userFirstName?: string;
}

export function BriefingEmail({
  weekNumber,
  year,
  briefingHtml,
  dashboardUrl,
  watchlistUrl,
  unsubscribeUrl,
  userFirstName,
}: BriefingEmailProps) {
  const greeting = userFirstName ? `Guten Morgen, ${userFirstName}` : "Guten Morgen";

  return (
    <Html lang="de">
      <Head />
      <Preview>
        {`Ihr Patent-Briefing KW ${weekNumber}/${year} - neue freie Patente in Ihrem Bereich`}
      </Preview>
      <Body style={{ backgroundColor: "#f8f9fb", fontFamily: "Arial, sans-serif", margin: 0, padding: "20px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", maxWidth: "600px", margin: "0 auto", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {/* Header */}
          <Section style={{ backgroundColor: "#1a2332", padding: "24px 32px" }}>
            <Text style={{ color: "#ffffff", fontSize: "18px", fontWeight: "600", margin: "0" }}>
              Patent Pilot
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0" }}>
              Patent-Intelligence, KW {weekNumber}/{year}
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={{ padding: "32px 32px 0" }}>
            <Text style={{ color: "#1a2332", fontSize: "15px", margin: "0 0 16px" }}>
              {greeting},
            </Text>
          </Section>

          {/* Briefing Content */}
          <Section style={{ padding: "0 32px 24px" }}>
            <div dangerouslySetInnerHTML={{ __html: briefingHtml }} />
          </Section>

          <Hr style={{ borderColor: "#e2e8f0", margin: "0 32px" }} />

          {/* Links */}
          <Section style={{ padding: "16px 32px" }}>
            <Text style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              <Link href={dashboardUrl} style={{ color: "#d97706", textDecoration: "none" }}>
                Briefing-Archiv
              </Link>
              {" · "}
              <Link href={watchlistUrl} style={{ color: "#d97706", textDecoration: "none" }}>
                Watchlist anpassen
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "12px 32px 24px", borderTop: "1px solid #e2e8f0" }}>
            <Text style={{ color: "#94a3b8", fontSize: "11px", lineHeight: "1.5", margin: "0 0 6px" }}>
              Patent Pilot liefert woechentliche KI-kuratierte Patent-Briefings fuer den deutschen
              Mittelstand. Keine Rechtsberatung, alle Angaben ohne Gewaehr. Rechtsstatus aus EPO-Daten.
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: "11px", margin: 0 }}>
              <Link href={unsubscribeUrl} style={{ color: "#94a3b8" }}>
                Abmelden
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
