import Link from "next/link";
import { LogoIcon } from "@/components/logo";
import { Check } from "lucide-react";

const SAMPLE_PATENTS = [
  {
    number: "EP1234567",
    status: "Frei seit 2023",
    cpc: "B60L · H02J · G06F",
    title: "Verfahren zur Steuerung des Ladevorgangs von Elektrofahrzeugen mit bidirektionaler Netzeinspeisung",
    titleEn: "Method for controlling the charging process of electric vehicles with bidirectional grid feed-in",
    owner: "Robert Bosch GmbH",
    filed: "2008",
    lapsed: "12.03.2023",
    summary: "Das Patent schützte ein Verfahren zur intelligenten Steuerung von Ladezyklen in Elektrofahrzeugen, inklusive Rückspeisung ins Stromnetz (Vehicle-to-Grid). Mit Ablauf des Patents können Hersteller und Zulieferer diese Technologie ohne Lizenzkosten implementieren.",
    opportunity: "Relevant für EV-Zulieferer, Energiemanagementsysteme und Ladestationshersteller. Die V2G-Technologie ist ab sofort lizenzfrei nutzbar.",
  },
  {
    number: "DE102015204871",
    status: "Frei seit 2022",
    cpc: "A61B · G16H · G06N",
    title: "KI-gestütztes System zur automatischen Erkennung von Anomalien in medizinischen Bilddaten",
    titleEn: "AI-based system for automatic detection of anomalies in medical image data",
    owner: "Siemens Healthineers AG",
    filed: "2015",
    lapsed: "04.11.2022",
    summary: "Das Patent umfasste ein neuronales Netzwerk-basiertes System zur Erkennung pathologischer Strukturen in CT- und MRT-Aufnahmen. Der Algorithmus war speziell auf den Einsatz in klinischen Arbeitsabläufen optimiert.",
    opportunity: "MedTech-Startups und Radiologie-Software-Anbieter können diese Architektur direkt übernehmen. Besonders relevant für KI-gestützte Diagnostikprodukte im EU-Markt.",
  },
  {
    number: "EP2891234",
    status: "Frei seit 2024",
    cpc: "C08L · C08K · B29C",
    title: "Hochfestes Polymerverbundmaterial mit optimierter Fasermatrix für den Leichtbau",
    titleEn: "High-strength polymer composite material with optimized fiber matrix for lightweight construction",
    owner: "BASF SE",
    filed: "2009",
    lapsed: "17.01.2024",
    summary: "Das Patent betraf ein Verfahren zur Herstellung von faserverstärkten Kunststoffen mit definierter Faserorientierung, das eine deutlich höhere Zugfestigkeit bei geringerem Gewicht ermöglichte.",
    opportunity: "Direkt anwendbar für Automobilzulieferer, Luft- und Raumfahrtkomponenten sowie Sportartikel. Das Verfahren ist jetzt frei für jede Serienproduktion.",
  },
];

export default function BeispielPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background">
        <div className="max-w-[900px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon size={28} className="text-brand-navy dark:text-white" />
            <span className="font-serif text-xl font-bold text-brand-navy dark:text-white">Patentbrief</span>
          </Link>
          <Link
            href="/signup"
            className="bg-accent text-accent-foreground font-semibold text-sm px-4 py-2 hover:opacity-90 transition-all duration-200"
          >
            Kostenlos abonnieren
          </Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-12">
        {/* Label */}
        <div className="mb-10">
          <span className="font-ibm-plex text-xs tracking-[0.08em] font-semibold uppercase text-muted-foreground border border-border px-3 py-1">
            Beispiel-Briefing · KW 24 / 2024
          </span>
          <h1 className="font-serif text-3xl font-bold mt-4 mb-2">
            3 Patente in Ihrer Branche sind diese Woche frei geworden
          </h1>
          <p className="text-muted-foreground">
            So sieht Ihr wöchentlicher Patentbrief aus. Diese Technologien darf Ihr Unternehmen ab sofort kostenlos und legal nutzen.
          </p>
        </div>

        {/* Patent Cards */}
        <div className="space-y-px border border-border">
          {SAMPLE_PATENTS.map((patent, i) => (
            <article key={patent.number} className="bg-card border-b border-border last:border-b-0">
              {/* Accent line */}
              <div className="h-[3px] bg-accent" />

              <div className="p-8">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="font-ibm-plex text-xs font-semibold uppercase tracking-widest text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2.5 py-1">
                    {patent.status}
                  </span>
                  <span className="font-ibm-plex text-xs text-muted-foreground">{patent.number}</span>
                  <span className="font-ibm-plex text-xs text-muted-foreground">{patent.cpc}</span>
                </div>

                {/* Title */}
                <h2 className="font-serif text-xl font-semibold mb-1 leading-snug">
                  {patent.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {patent.titleEn}
                </p>

                {/* Details grid */}
                <div className="grid grid-cols-3 gap-4 mb-5 py-4 border-t border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-ibm-plex uppercase tracking-wider mb-1">Ehemaliger Inhaber</p>
                    <p className="text-sm font-medium">{patent.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-ibm-plex uppercase tracking-wider mb-1">Angemeldet</p>
                    <p className="text-sm font-medium">{patent.filed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-ibm-plex uppercase tracking-wider mb-1">Abgelaufen am</p>
                    <p className="text-sm font-medium">{patent.lapsed}</p>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {patent.summary}
                </p>

                {/* Opportunity */}
                <div className="flex gap-3 bg-accent/10 border border-accent/20 p-4">
                  <Check size={16} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-sm">{patent.opportunity}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 border border-border p-10 text-center">
          <p className="font-ibm-plex text-xs tracking-widest uppercase text-muted-foreground mb-3">
            Jede Woche neu
          </p>
          <h2 className="font-serif text-2xl font-bold mb-3">
            Welche Patente werden nächste Woche frei?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Abonnieren Sie den Patentbrief und erhalten Sie jede Woche die relevanten Ablaufmeldungen für Ihre Branche.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-accent text-accent-foreground font-semibold text-sm px-8 py-4 uppercase tracking-widest hover:opacity-90 transition-all duration-200"
          >
            Kostenlos starten
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Dieses Beispiel enthält fiktive Patentdaten zur Illustration. Echte Briefings basieren auf verifizierten INPADOC-Daten.
        </p>
      </main>
    </div>
  );
}
