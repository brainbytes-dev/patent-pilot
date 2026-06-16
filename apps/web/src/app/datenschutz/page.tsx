import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Datenschutzerklärung</h1>
      <p className="text-sm text-muted-foreground">Stand: 16. Juni 2026</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        BrainBytes Studio (HM Digital Consulting Rühe)<br />
        Buchenweg 18, 5036 Oberentfelden, Schweiz<br />
        E-Mail: <a href="mailto:info@brainbyt.es">info@brainbyt.es</a><br />
        UID: CHE-154.580.444
      </p>

      <h2>2. Überblick der Verarbeitungen</h2>
      <p>Wir verarbeiten folgende Datenkategorien:</p>
      <ul>
        <li>Kontaktdaten (Name, E-Mail-Adresse)</li>
        <li>Zahlungsdaten (via Stripe — wir speichern keine Kartendaten)</li>
        <li>Nutzungsdaten (Anmeldung, Briefing-Abruf, Watchlist-Einstellungen)</li>
        <li>Technische Daten (IP-Adresse, Browser-Typ, Zugriffszeiten)</li>
      </ul>

      <h2>3. Rechtsgrundlagen</h2>
      <p>
        Wir verarbeiten personenbezogene Daten auf Basis des Schweizer
        Datenschutzgesetzes (DSG) sowie, soweit EU-Nutzer betroffen sind, der
        DSGVO (Art. 6 Abs. 1 lit. a: Einwilligung; lit. b: Vertragserfüllung;
        lit. f: berechtigte Interessen).
      </p>

      <h2>4. Newsletter und Briefing-Versand</h2>
      <p>
        Patent Pilot ist ein wöchentlicher E-Mail-Dienst. Durch Registrierung
        erteilen Sie Ihre Einwilligung zum Empfang des wöchentlichen
        Patent-Briefings. E-Mails werden über{" "}
        <strong>Resend Inc.</strong> (USA) versandt; Resend ist über das
        EU-US Data Privacy Framework abgesichert. Sie können den Dienst
        jederzeit kündigen und die Datenverarbeitung widerrufen.
      </p>

      <h2>5. Zahlungsabwicklung</h2>
      <p>
        Kostenpflichtige Abonnements werden über <strong>Stripe Inc.</strong>{" "}
        (USA) abgewickelt. Stripe ist PCI-DSS-konform; wir speichern keine
        Zahlungskarteninformationen. Stripe verarbeitet Zahlungsdaten auf Basis
        seines eigenen Datenschutzrahmens und des EU-US Data Privacy Framework.
        Datenschutzerklärung Stripe:{" "}
        <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/de/privacy
        </a>
        .
      </p>

      <h2>6. Webhosting und Datenbank</h2>
      <p>
        Die Anwendung wird über <strong>Vercel Inc.</strong> (USA) gehostet.
        Vercel verarbeitet technische Zugriffsdaten (IP-Adresse,
        HTTP-Header, Zeitstempel) zum Zweck der Bereitstellung und Sicherheit.
        Vertraglich abgesichert via EU-US Data Privacy Framework +
        Standardvertragsklauseln (SCC).
      </p>
      <p>
        Nutzerdaten werden in einer{" "}
        <strong>Neon Inc.</strong>-Postgres-Datenbank gespeichert (USA/EU,
        EU-Region bevorzugt). Neon ist ebenfalls über SCC abgesichert.
      </p>

      <h2>7. Analytik</h2>
      <p>
        Wir nutzen <strong>PostHog</strong> zur Produktanalyse (Nutzungsverhalten,
        Fehleranalyse). PostHog wird in einer EU-Instanz betrieben. Es werden
        keine personenbezogenen Daten an Dritte verkauft. PostHog
        Datenschutz:{" "}
        <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
          posthog.com/privacy
        </a>
        .
      </p>

      <h2>8. Patentdaten</h2>
      <p>
        Patentinformationen werden aus dem amtlichen Register des
        Europäischen Patentamts (EPO) bezogen. Es handelt sich um öffentlich
        zugängliche, nicht-personenbezogene Registerdaten. Die EPO-API wird
        über OAuth2 angesprochen; es werden keine Nutzerdaten an das EPO
        übermittelt.
      </p>

      <h2>9. Cookies und lokale Speicherung</h2>
      <p>
        Wir verwenden ausschliesslich technisch notwendige Cookies (Session-Token
        für die Authentifizierung). Es werden keine Marketing- oder
        Tracking-Cookies ohne Einwilligung gesetzt.
      </p>

      <h2>10. Weitergabe an Dritte</h2>
      <p>
        Wir geben personenbezogene Daten nur an Dritte weiter, soweit dies zur
        Vertragserfüllung erforderlich ist (Stripe, Resend), gesetzlich
        vorgeschrieben wird oder Sie eingewilligt haben. Wir verkaufen keine
        Daten.
      </p>

      <h2>11. Speicherdauer</h2>
      <p>
        Wir speichern personenbezogene Daten, solange das Konto aktiv ist.
        Nach Kündigung werden Daten innerhalb von 30 Tagen gelöscht, sofern
        keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        Briefing-Archive werden auf Wunsch sofort gelöscht.
      </p>

      <h2>12. Ihre Rechte</h2>
      <p>
        Sie haben nach DSG und DSGVO das Recht auf:
      </p>
      <ul>
        <li>Auskunft über gespeicherte Daten</li>
        <li>Berichtigung unrichtiger Daten</li>
        <li>Löschung Ihrer Daten («Recht auf Vergessenwerden»)</li>
        <li>Einschränkung der Verarbeitung</li>
        <li>Datenübertragbarkeit</li>
        <li>Widerruf einer erteilten Einwilligung</li>
        <li>Beschwerde bei der Eidgenössischen Datenschutz- und
          Öffentlichkeitsbeauftragten (EDÖB) oder einer EU-Datenschutzbehörde</li>
      </ul>
      <p>
        Für Anfragen: <a href="mailto:info@brainbyt.es">info@brainbyt.es</a>
      </p>

      <h2>13. Änderungen dieser Erklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung jederzeit anzupassen.
        Die aktuelle Version ist stets auf dieser Seite abrufbar. Bei
        wesentlichen Änderungen informieren wir registrierte Nutzer per E-Mail.
      </p>
    </div>
  );
}
