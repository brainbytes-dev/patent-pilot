import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Masthead nav navy, editorial */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-primary-foreground">
            Patentbrief
          </Link>
          <nav className="flex items-center gap-6">
            <ModeToggle />
            <Link
              href="/login"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            >
              Anmelden
            </Link>
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              asChild
            >
              <Link href="/signup">Jetzt abonnieren</Link>
            </Button>
          </nav>
        </div>
        {/* Amber rule under masthead */}
        <div className="h-px bg-accent/60" />
      </header>

      {/* Hero editorial, typography-led */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-6">
          Jeden Montag um 8 Uhr &middot; Patent-Intelligence für den Mittelstand
        </p>
        <h1 className="font-serif text-5xl font-semibold leading-tight text-foreground mb-8 max-w-2xl">
          4 von 5 Patenten verfallen vor Ablauf. Wir zeigen Ihnen, welche Sie nutzen können.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
          Patentbrief ist ein wöchentlicher E-Mail-Newsletter. Jeden Montag erfahren Sie, welche Patente
          in Ihrem Technologiefeld frei geworden oder verfügbar sind. Auf Deutsch. Ohne Patentabteilung.
        </p>
        <div className="flex items-center gap-6 flex-wrap">
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 px-8"
            asChild
          >
            <Link href="/signup">Jetzt abonnieren</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            2 Briefings kostenlos. Keine Kreditkarte.
          </span>
        </div>
      </section>

      {/* Amber divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-border" />
      </div>

      {/* What's in every briefing editorial 3-column text */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
          Was Sie jeden Montag erhalten
        </h2>
        <p className="text-sm text-muted-foreground mb-12">
          Eine E-Mail. 10 Minuten lesen. Kein Login, kein Dashboard.
        </p>
        <div className="grid md:grid-cols-3 gap-10 md:divide-x divide-border">
          <div className="md:pr-10">
            <p className="text-xs uppercase tracking-widest text-accent font-sans mb-3">Freie Patente</p>
            <p className="text-foreground font-medium mb-2">In die Public Domain übergegangen</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Welche Patente in Ihrem Feld sind diese Woche abgelaufen und ab sofort frei verwendbar,
              ohne Lizenzgebühren und ohne Anmeldung.
            </p>
          </div>
          <div className="md:px-10">
            <p className="text-xs uppercase tracking-widest text-accent font-sans mb-3">Patente zum Erwerb</p>
            <p className="text-foreground font-medium mb-2">Lizenzierbar oder käuflich</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Konzerne und Start-ups, die Schutzrechte in Ihrem Bereich aktiv zum Kauf oder
              zur Lizenzierung anbieten, mit Kontaktweg.
            </p>
          </div>
          <div className="md:pl-10">
            <p className="text-xs uppercase tracking-widest text-accent font-sans mb-3">Strategie-Impuls</p>
            <p className="text-foreground font-medium mb-2">Eine Empfehlung pro Woche</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sofort prüfen, Patentanwalt einschalten oder beobachten. Konkret,
              nicht akademisch.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Positioning editorial pull quote layout */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              PatSnap gibt Ihnen 50.000 Treffer. Wir geben Ihnen die fünf, die zählen.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Enterprise-Patent-Tools setzen eine IP-Abteilung voraus und kosten fünfstellig im Jahr.
              Patentbrief ist gemacht für den Leiter Strategie ohne Patentexpertise und ohne Zeit
              für Datenbankrecherche.
            </p>
            <ul className="space-y-3 text-sm">
              {[
                "Komplett auf Deutsch",
                "Onboarding in 5 Minuten",
                "Ab 249 EUR/Monat, kein Jahresvertrag",
                "Kein Schulungsaufwand",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-foreground">
                  <span className="text-accent mt-0.5 font-mono text-xs">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pull quote replaces the hero-metric block */}
          <blockquote className="border-l-2 border-accent pl-8 py-2">
            <p className="font-serif text-2xl font-semibold text-foreground leading-snug mb-6">
              &ldquo;83 Prozent aller Patente verfallen, bevor sie die 20-Jahres-Frist erreichen.
              Kaum ein Mittelständler beobachtet, was dabei frei wird.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Quelle: Europäisches Patentamt
            </p>
          </blockquote>
        </div>
      </section>

      {/* CTA band navy */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="font-serif text-3xl font-semibold mb-4">
            Freie Patente. Jeden Montag. Auf Deutsch.
          </h2>
          <p className="text-primary-foreground/70 mb-8 text-lg">
            2 Briefings kostenlos. Keine Kreditkarte. Jederzeit kündbar.
          </p>
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary px-10"
            asChild
          >
            <Link href="/signup">Jetzt abonnieren</Link>
          </Button>
        </div>
      </section>

      {/* Footer navy */}
      <footer className="bg-primary border-t border-primary-foreground/10 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/50">
          <p>
            Patentbrief ist ein Dienst von BrainBytes Studio. Alle Angaben ohne Gewähr. Keine Rechtsberatung.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/impressum" className="hover:text-primary-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-primary-foreground transition-colors">
              Datenschutz
            </Link>
            <Link href="/pricing" className="hover:text-primary-foreground transition-colors">
              Preise
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
