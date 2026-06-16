import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail, FileSearch, TrendingUp, FileCheck, Inbox } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSearch className="size-5 text-accent" />
            <span className="font-semibold text-foreground">Patent Pilot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Anmelden
            </Link>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              asChild
            >
              <Link href="/signup">Jetzt abonnieren</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-accent mb-4 uppercase tracking-wide">
          <Inbox className="size-4" />
          <span>Jeden Montag in Ihrem Postfach</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-6 max-w-3xl mx-auto leading-tight">
          4 von 5 Patenten verfallen vor Ablauf. Wir zeigen Ihnen, welche Sie nutzen können.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Patent Pilot ist ein wöchentlicher E-Mail-Newsletter für den deutschen Mittelstand.
          Jeden Montag um 8 Uhr: welche Patente in Ihrem Technologiefeld frei geworden oder
          verfügbar sind, auf Deutsch, ohne Patentabteilung.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            asChild
          >
            <Link href="/signup">Jetzt abonnieren</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">Preise ansehen</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          2 Briefings kostenlos. Keine Kreditkarte. Jederzeit kündbar.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-center mb-2">
            Was Sie jeden Montag erhalten
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-sm">
            Eine E-Mail. 10 Minuten lesen. Kein Login, kein Dashboard.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileCheck,
                title: "Freie Patente",
                body: "Welche Patente in Ihrem Feld sind diese Woche in die Public Domain übergegangen und ab sofort frei verwendbar.",
              },
              {
                icon: TrendingUp,
                title: "Patente zum Erwerb",
                body: "Konzerne und Start-ups, die Patente in Ihrem Bereich zum Kauf oder zur Lizenzierung anbieten.",
              },
              {
                icon: Mail,
                title: "Strategie-Impuls",
                body: "Eine konkrete Handlungsempfehlung: sofort prüfen, Anwalt einschalten, oder beobachten.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6 border-l-4 border-l-accent">
                <Icon className="size-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Mittelstand */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              PatSnap gibt Ihnen 50.000 Treffer. Wir geben Ihnen die fünf, die zählen.
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Enterprise-Patent-Tools setzen eine IP-Abteilung voraus und kosten fünfstellig im
              Jahr. Patent Pilot ist gemacht für den Leiter Strategie ohne Patentexpertise und
              ohne Zeit für Datenbankrecherche.
            </p>
            <ul className="space-y-3">
              {[
                "Komplett auf Deutsch",
                "Onboarding in 5 Minuten",
                "Ab 249 EUR/Monat, kein Jahresvertrag",
                "Kein Schulungsaufwand",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="size-4 text-accent flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 bg-muted/30">
            <div className="space-y-6">
              <div>
                <p className="text-3xl font-mono font-semibold text-foreground">199.264</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Neue Patente in der EU pro Jahr
                </p>
              </div>
              <div>
                <p className="text-3xl font-mono font-semibold text-foreground">83 %</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verfallen vor Ablauf der 20-Jahres-Frist
                </p>
              </div>
              <div>
                <p className="text-3xl font-mono font-semibold text-foreground">0</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mittelständler, die das systematisch beobachten
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2 className="text-2xl font-semibold mb-4">
            Freie Patente. Jeden Montag. Auf Deutsch.
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            2 Briefings kostenlos. Keine Kreditkarte. Jederzeit kündbar.
          </p>
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            asChild
          >
            <Link href="/signup">Jetzt abonnieren</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-3 text-sm text-muted-foreground text-center">
          <p>
            Patent Pilot, BrainBytes Studio. Alle Angaben ohne Gewaehr. Keine Rechtsberatung.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/impressum" className="hover:text-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">
              Datenschutz
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Preise
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
