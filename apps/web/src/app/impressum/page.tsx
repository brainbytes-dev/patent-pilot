import type { Metadata } from "next";
import Link from "next/link";
import { FileSearch } from "lucide-react";
import { ModeToggle } from "@/components/theme/theme-toggle";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
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

      <div className="max-w-2xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
        <h1>Impressum</h1>

        <h2>Betreiber</h2>
        <p>
          BrainBytes Studio<br />
          HM Digital Consulting Rühe<br />
          Buchenweg 18<br />
          5036 Oberentfelden<br />
          Schweiz
        </p>
        <p>UID: CHE-154.580.444</p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:info@brainbyt.es">info@brainbyt.es</a><br />
          Telefon: +41 76 468 08 11<br />
          Web: <a href="https://brainbyt.es">brainbyt.es</a>
        </p>

        <h2>Vertretungsberechtigte Person</h2>
        <p>Henrik Rühe</p>

        <h2>Mehrwertsteuer</h2>
        <p>
          Mehrwertsteuerbefreit gemäss Art. 10 Abs. 2a Bundesgesetz über die
          Mehrwertsteuer (MWSTG) vom 12. Juni 2009.
        </p>

        <h2>Patentdaten</h2>
        <p>
          Die auf Patentbrief angezeigten Patentdaten stammen ausschliesslich aus
          amtlichen Registern des Europäischen Patentamts (EPO) und werden
          periodisch aktualisiert. Trotz sorgfältiger Verarbeitung übernehmen wir
          keine Garantie für die Korrektheit, Vollständigkeit oder Aktualität der
          dargestellten Daten. Die Inhalte stellen keine Rechtsberatung dar und
          ersetzen nicht die Konsultation eines zugelassenen Patentanwalts.
        </p>

        <h2>Streitbeilegung</h2>
        <p>
          Online-Plattform der Europäischen Kommission zur Streitbeilegung (OS)
          für Verbraucher:{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          . Wir sind nicht bereit und nicht verpflichtet, an einem
          Streitschlichtungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>

        <h2>Haftungsausschluss</h2>
        <p>
          Der Betreiber behält sich das Recht vor, keine Verantwortung für die
          Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und
          Vollständigkeit der Informationen zu übernehmen.
          Haftungsansprüche wegen Schäden materieller oder immaterieller Art,
          welche aus dem Zugriff oder der Nutzung der veröffentlichten
          Informationen entstanden sind, werden ausgeschlossen.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres
          Verantwortungsbereichs. Jegliche Verantwortung für solche Websites
          wird abgelehnt. Der Zugang und die Benutzung solcher Websites erfolgt
          auf eigenes Risiko des Nutzers.
        </p>

        <h2>Urheberrechte</h2>
        <p>
          Das Urheberrecht und alle anderen Rechte an Inhalten auf dieser Website
          gehören ausschliesslich <strong>BrainBytes Studio</strong> oder den
          speziell genannten Rechteinhabern. Für die Reproduktion jeglicher
          Elemente muss im Voraus die schriftliche Zustimmung eingeholt werden.
        </p>

        <p className="text-sm text-muted-foreground">Stand: 16. Juni 2026</p>
      </div>

      <footer className="border-t py-8">
        <div className="max-w-5xl mx-auto px-6 flex justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Startseite</Link>
        </div>
      </footer>
    </div>
  );
}
