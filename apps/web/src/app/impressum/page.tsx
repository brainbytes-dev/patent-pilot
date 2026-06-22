import type { Metadata } from "next";
import Link from "next/link";
import { ModeToggle } from "@/components/theme/theme-toggle";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

export default function ImpressumPage() {
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
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-12">
          Impressum
        </h1>

        <section className="space-y-10 text-sm text-foreground leading-relaxed">

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Betreiber
            </h2>
            <p className="text-muted-foreground">
              BrainBytes Studio<br />
              HM Digital Consulting Rühe<br />
              Buchenweg 18<br />
              5036 Oberentfelden<br />
              Schweiz
            </p>
            <p className="text-muted-foreground mt-2">UID: CHE-154.580.444</p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Kontakt
            </h2>
            <p className="text-muted-foreground">
              E-Mail:{" "}
              <a href="mailto:info@brainbyt.es" className="text-accent hover:underline underline-offset-4">
                info@brainbyt.es
              </a>
              <br />
              Telefon: +41 76 468 08 11<br />
              Web:{" "}
              <a href="https://brainbyt.es" className="text-accent hover:underline underline-offset-4">
                brainbyt.es
              </a>
            </p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Vertretungsberechtigte Person
            </h2>
            <p className="text-muted-foreground">Henrik Rühe</p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Mehrwertsteuer
            </h2>
            <p className="text-muted-foreground">
              Mehrwertsteuerbefreit gemäss Art. 10 Abs. 2a Bundesgesetz über die
              Mehrwertsteuer (MWSTG) vom 12. Juni 2009.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Patentdaten
            </h2>
            <p className="text-muted-foreground">
              Die auf Patentbrief angezeigten Patentdaten stammen ausschliesslich aus
              amtlichen Registern des Europäischen Patentamts (EPO) und werden
              periodisch aktualisiert. Trotz sorgfältiger Verarbeitung übernehmen wir
              keine Garantie für die Korrektheit, Vollständigkeit oder Aktualität der
              dargestellten Daten. Die Inhalte stellen keine Rechtsberatung dar und
              ersetzen nicht die Konsultation eines zugelassenen Patentanwalts.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Streitbeilegung
            </h2>
            <p className="text-muted-foreground">
              Online-Plattform der Europäischen Kommission zur Streitbeilegung (OS)
              für Verbraucher:{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-4">
                ec.europa.eu/consumers/odr
              </a>
              . Wir sind nicht bereit und nicht verpflichtet, an einem
              Streitschlichtungsverfahren vor einer Verbraucherschlichtungsstelle
              teilzunehmen.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Haftungsausschluss
            </h2>
            <p className="text-muted-foreground">
              Der Betreiber behält sich das Recht vor, keine Verantwortung für die
              Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und
              Vollständigkeit der Informationen zu übernehmen.
              Haftungsansprüche wegen Schäden materieller oder immaterieller Art,
              welche aus dem Zugriff oder der Nutzung der veröffentlichten
              Informationen entstanden sind, werden ausgeschlossen.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Haftung für Links
            </h2>
            <p className="text-muted-foreground">
              Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres
              Verantwortungsbereichs. Jegliche Verantwortung für solche Websites
              wird abgelehnt. Der Zugang und die Benutzung solcher Websites erfolgt
              auf eigenes Risiko des Nutzers.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
              Urheberrechte
            </h2>
            <p className="text-muted-foreground">
              Das Urheberrecht und alle anderen Rechte an Inhalten auf dieser Website
              gehören ausschliesslich <strong className="text-foreground font-medium">BrainBytes Studio</strong> oder den
              speziell genannten Rechteinhabern. Für die Reproduktion jeglicher
              Elemente muss im Voraus die schriftliche Zustimmung eingeholt werden.
            </p>
          </div>

        </section>

        <p className="text-xs text-muted-foreground mt-12 pt-6 border-t border-border">
          Stand: 16. Juni 2026
        </p>
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
