import type { Metadata } from "next";
import Link from "next/link";
import { ModeToggle } from "@/components/theme/theme-toggle";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
        {title}
      </h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-primary-foreground">
            Patentbrief
          </Link>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link href="/login" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              Anmelden
            </Link>
          </div>
        </div>
        <div className="h-px bg-accent/60" />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <p className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-4">
          Rechtliches
        </p>
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
          Datenschutzerklärung
        </h1>
        <p className="text-xs text-muted-foreground mb-12">Stand: 16. Juni 2026</p>

        <div className="space-y-10">

          <Section title="1. Verantwortlicher">
            <p>
              BrainBytes Studio (HM Digital Consulting Rühe)<br />
              Buchenweg 18, 5036 Oberentfelden, Schweiz<br />
              E-Mail:{" "}
              <a href="mailto:info@brainbyt.es" className="text-accent hover:underline underline-offset-4">
                info@brainbyt.es
              </a>
              <br />
              UID: CHE-154.580.444
            </p>
          </Section>

          <Section title="2. Überblick der Verarbeitungen">
            <p>Wir verarbeiten folgende Datenkategorien:</p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li>Kontaktdaten (Name, E-Mail-Adresse)</li>
              <li>Zahlungsdaten (via Stripe; wir speichern keine Kartendaten)</li>
              <li>Nutzungsdaten (Anmeldung, Briefing-Abruf, Watchlist-Einstellungen)</li>
              <li>Technische Daten (IP-Adresse, Browser-Typ, Zugriffszeiten)</li>
            </ul>
          </Section>

          <Section title="3. Rechtsgrundlagen">
            <p>
              Wir verarbeiten personenbezogene Daten auf Basis des Schweizer
              Datenschutzgesetzes (DSG) sowie, soweit EU-Nutzer betroffen sind, der
              DSGVO (Art. 6 Abs. 1 lit. a: Einwilligung; lit. b: Vertragserfüllung;
              lit. f: berechtigte Interessen).
            </p>
          </Section>

          <Section title="4. Newsletter und Briefing-Versand">
            <p>
              Patentbrief ist ein wöchentlicher E-Mail-Dienst. Durch Registrierung
              erteilen Sie Ihre Einwilligung zum Empfang des wöchentlichen
              Patent-Briefings. E-Mails werden über{" "}
              <strong className="text-foreground font-medium">Resend Inc.</strong> (USA) versandt; Resend ist über das
              EU-US Data Privacy Framework abgesichert. Sie können den Dienst
              jederzeit kündigen und die Datenverarbeitung widerrufen.
            </p>
          </Section>

          <Section title="5. Zahlungsabwicklung">
            <p>
              Kostenpflichtige Abonnements werden über{" "}
              <strong className="text-foreground font-medium">Stripe Inc.</strong> (USA) abgewickelt.
              Stripe ist PCI-DSS-konform; wir speichern keine Zahlungskarteninformationen.
              Datenschutzerklärung Stripe:{" "}
              <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-4">
                stripe.com/de/privacy
              </a>
              .
            </p>
          </Section>

          <Section title="6. Webhosting und Datenbank">
            <p>
              Die Anwendung wird über{" "}
              <strong className="text-foreground font-medium">Vercel Inc.</strong> (USA) gehostet.
              Vercel verarbeitet technische Zugriffsdaten (IP-Adresse, HTTP-Header,
              Zeitstempel) zum Zweck der Bereitstellung und Sicherheit. Vertraglich
              abgesichert via EU-US Data Privacy Framework und Standardvertragsklauseln (SCC).
            </p>
            <p>
              Nutzerdaten werden in einer{" "}
              <strong className="text-foreground font-medium">Neon Inc.</strong>-Postgres-Datenbank
              gespeichert (EU-Region bevorzugt). Neon ist ebenfalls über SCC abgesichert.
            </p>
          </Section>

          <Section title="7. Analytik">
            <p>
              Wir nutzen <strong className="text-foreground font-medium">PostHog</strong> zur
              Produktanalyse (Nutzungsverhalten, Fehleranalyse). PostHog wird in einer
              EU-Instanz betrieben. Es werden keine personenbezogenen Daten an Dritte
              verkauft. PostHog Datenschutz:{" "}
              <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-4">
                posthog.com/privacy
              </a>
              .
            </p>
          </Section>

          <Section title="8. Patentdaten">
            <p>
              Patentinformationen werden aus dem amtlichen Register des
              Europäischen Patentamts (EPO) bezogen. Es handelt sich um öffentlich
              zugängliche, nicht-personenbezogene Registerdaten. Die EPO-API wird
              über OAuth2 angesprochen; es werden keine Nutzerdaten an das EPO
              übermittelt.
            </p>
          </Section>

          <Section title="9. Cookies und lokale Speicherung">
            <p>
              Wir verwenden ausschliesslich technisch notwendige Cookies (Session-Token
              für die Authentifizierung). Es werden keine Marketing- oder
              Tracking-Cookies ohne Einwilligung gesetzt.
            </p>
          </Section>

          <Section title="10. Weitergabe an Dritte">
            <p>
              Wir geben personenbezogene Daten nur an Dritte weiter, soweit dies zur
              Vertragserfüllung erforderlich ist (Stripe, Resend), gesetzlich
              vorgeschrieben wird oder Sie eingewilligt haben. Wir verkaufen keine Daten.
            </p>
          </Section>

          <Section title="11. Speicherdauer">
            <p>
              Wir speichern personenbezogene Daten, solange das Konto aktiv ist.
              Nach Kündigung werden Daten innerhalb von 30 Tagen gelöscht, sofern
              keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
              Briefing-Archive werden auf Wunsch sofort gelöscht.
            </p>
          </Section>

          <Section title="12. Ihre Rechte">
            <p>Sie haben nach DSG und DSGVO das Recht auf:</p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li>Auskunft über gespeicherte Daten</li>
              <li>Berichtigung unrichtiger Daten</li>
              <li>Löschung Ihrer Daten («Recht auf Vergessenwerden»)</li>
              <li>Einschränkung der Verarbeitung</li>
              <li>Datenübertragbarkeit</li>
              <li>Widerruf einer erteilten Einwilligung</li>
              <li>
                Beschwerde bei der Eidgenössischen Datenschutz- und
                Öffentlichkeitsbeauftragten (EDÖB) oder einer EU-Datenschutzbehörde
              </li>
            </ul>
            <p>
              Für Anfragen:{" "}
              <a href="mailto:info@brainbyt.es" className="text-accent hover:underline underline-offset-4">
                info@brainbyt.es
              </a>
            </p>
          </Section>

          <Section title="13. Änderungen dieser Erklärung">
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung jederzeit anzupassen.
              Die aktuelle Version ist stets auf dieser Seite abrufbar. Bei
              wesentlichen Änderungen informieren wir registrierte Nutzer per E-Mail.
            </p>
          </Section>

        </div>
      </main>

      <footer className="bg-primary border-t border-primary-foreground/10 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/50">
          <p>© Patentbrief 2026</p>
          <div className="flex items-center gap-6">
            <Link href="/impressum" className="hover:text-primary-foreground transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-primary-foreground transition-colors">Datenschutz</Link>
            <Link href="/" className="hover:text-primary-foreground transition-colors">Startseite</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
