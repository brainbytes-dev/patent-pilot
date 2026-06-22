"use client";


import { useState } from "react";
import Link from "next/link";
import { Clock, Lightbulb, Bell, CheckCircle2, Check, X as XIcon } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly")

  return (
    <div className="min-h-screen bg-lp-paper text-lp-ink antialiased">

      <LandingHeader />

      <main>

        {/* Hero */}
        <section className="relative bg-lp-paper overflow-hidden py-24 md:py-32">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7">
              <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-amber uppercase mb-4 block">
                Montags-Briefing für Entscheider
              </span>
              <h1 className="font-serif text-[48px] leading-[56px] tracking-[-0.02em] font-bold text-lp-ink mb-6">
                Wissen, was frei wird.
              </h1>
              <p className="text-lg leading-7 text-lp-gray max-w-xl mb-10">
                Der wöchentliche Patentbrief für den deutschen Mittelstand. Jeden Montag, 8:00 Uhr
                direkt in Ihrem Postfach. Strategische Freiheit durch präzise Analyse.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="bg-lp-amber text-white font-semibold text-sm px-8 py-4 hover:bg-lp-amber-dark transition-colors duration-200 active:scale-95 inline-block text-center"
                >
                  Jetzt kostenlos abonnieren
                </Link>
                <button type="button" aria-label="Beispiel-Briefing ansehen" className="border-2 border-lp-ink text-lp-ink font-semibold text-sm px-8 py-4 uppercase tracking-widest hover:bg-lp-ink hover:text-white transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-amber focus-visible:ring-offset-2">
                  Beispiel ansehen
                </button>
              </div>
            </div>

            {/* Rotated patent-document stack */}
            <div className="md:col-span-5 mt-12 md:mt-0 relative h-[450px]">
              <div className="absolute inset-0 border border-lp-border p-4 bg-lp-paper rotate-2 z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD62VeHtPoLrdrC0uqdelV0D7ap5vN1oHLlT3JjP_AUoDJ7uEK35sr8wenQ4uiHrc3bVMqXeBInXX1RHoi0DXTrhtp1zG5yund2pS5B1y1re6eW_tzLrRk3hMKnCqVkqx6_-TLMxYsUQ4qhJ5vAPEXbYY1grtzhkzEf-U6M5mN6lNh8WxcNOk97OfCflIqbuAYoBr0koxgvarAYAf3FJtMK6OafAFXX17Z_1SzjVtngPs-3f_hgxoGng-9OycUeNtKZsnvbUpy36RE"
                  alt="Patent Dokument Vorschau"
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <div className="absolute inset-0 border border-lp-border p-4 bg-brand-tilt -rotate-3 translate-x-4 translate-y-4" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-lp-surface py-24 border-y border-lp-border">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
            <div className="flex justify-between items-end mb-16">
              <div>
                <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-amber uppercase mb-2 block">
                  Ihre Marktvorteile
                </span>
                <h2 className="font-serif text-3xl font-semibold leading-10 text-lp-ink">
                  Freiraum für Innovation.
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Clock className="text-lp-amber" size={36} />,
                  title: "Verfallene Rechte",
                  text: "Wir identifizieren Patente, die in den nächsten 12 Monaten auslaufen. Nutzen Sie Technologien, die nun gemeinfrei werden, ohne Lizenzgebühren.",
                },
                {
                  icon: <Lightbulb className="text-lp-amber" size={36} />,
                  title: "Ihre Chance",
                  text: "Konkrete Handlungsempfehlungen statt Datenwüste. Wir zeigen auf, welche Marktlücken sich durch auslaufende Schutzrechte für den Mittelstand öffnen.",
                },
                {
                  icon: <Bell className="text-lp-amber" size={36} />,
                  title: "Wöchentliches Update",
                  text: "Keine manuelle Recherche mehr nötig. Erhalten Sie jeden Montagmorgen die kuratierte Liste der relevantesten Patentänderungen direkt per Mail.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="bg-lp-paper p-8 border border-lp-border hover:border-lp-ink transition-all duration-300 flex flex-col h-full"
                >
                  <div className="mb-6">{feature.icon}</div>
                  <h3 className="font-serif text-2xl font-semibold text-lp-ink mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-lp-gray text-base flex-grow">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Editorial */}
        <section className="py-24 bg-lp-paper overflow-hidden">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnyGWUKeCZpI53TmiDf2vNT-NWM7ZffqLxTeN3I6INyBWzRlyCv3sDWAm637fuXsfCaUnrLxeAMICRaU6xTCvh3D1lTX1pCUI5-cFWQ3AH0ebt-_B4dzfFT5hebqeYow97tEOerxCeF01472Xg0VHgnKf2M4EzzG4lOgO2rDdmQkrU2n6WU11hWAAAf7G7IAQ24PLS_prDb2mJJedkBtlJDgfe4X9MC6rKnetUBCZILjkP3PWyFtnEn_j9xXRTN6_CZpGSGWuIk9w"
                alt="Von Komplexität zu Klarheit"
                className="w-full h-[500px] object-cover grayscale"
              />
              <div className="absolute -bottom-6 -right-6 bg-lp-amber p-8 text-white max-w-xs">
                <p className="italic font-serif text-2xl">
                  &ldquo;Wir machen aus Aktenzeichen echte Strategien.&rdquo;
                </p>
              </div>
            </div>
            <div>
              <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-amber uppercase mb-4 block">
                Editorial Intelligence
              </span>
              <h2 className="font-serif text-3xl font-semibold leading-10 text-lp-ink mb-6">
                Kein Patent-Chinesisch.
              </h2>
              <div className="space-y-6">
                <p className="text-lg leading-7 text-lp-gray">
                  Patentanmeldungen sind oft bewusst kryptisch verfasst. Unsere KI analysiert
                  täglich den vollständigen EPO-Datensatz und extrahiert die strategisch relevanten
                  Freiheitsgrade für Ihr Geschäftsfeld.
                </p>
                <p className="text-lg leading-7 text-lp-gray">
                  Sie erfahren sofort, welche Technologien frei werden und was das konkret für
                  Ihr Produkt oder Ihre Fertigung bedeutet.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "KI-gestützte Analyse täglich aktualisierter EPO-Daten",
                    "Fokus auf relevante IPC-Klassen für den Mittelstand",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-4">
                      <CheckCircle2 className="text-lp-amber mt-1 shrink-0" size={20} />
                      <span className="text-base text-lp-ink">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-lp-surface py-24 border-t border-lp-border">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-semibold leading-10 text-lp-ink mb-4">
                Einfache, transparente Preise.
              </h2>
              <p className="text-lp-gray text-base max-w-xl mx-auto mb-8">
                Kostenlos starten. Upgraden wenn der Wert klar ist.
              </p>
              <div className="inline-flex items-center border border-lp-border bg-lp-paper">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-amber focus-visible:ring-offset-1 ${billing === "monthly" ? "bg-brand-navy text-white" : "text-lp-gray hover:text-brand-navy"}`}
                >
                  Monatlich
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("yearly")}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-amber focus-visible:ring-offset-1 ${billing === "yearly" ? "bg-brand-navy text-white" : "text-lp-gray hover:text-brand-navy"}`}
                >
                  Jährlich
                  <span className={`text-xs font-ibm-plex font-semibold px-1.5 py-0.5 ${billing === "yearly" ? "bg-lp-amber text-white" : "bg-lp-amber/20 text-lp-amber"}`}>
                    20% sparen
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3">

              {/* Free */}
              <div className="bg-lp-paper border border-lp-border p-8 flex flex-col">
                <div className="mb-8">
                  <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-gray uppercase block mb-4">
                    Einsteiger
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-lp-ink">Free</h3>
                  <div className="mt-4">
                    <span className="font-ibm-plex text-4xl font-semibold text-lp-ink">Gratis</span>
                  </div>
                  <p className="text-lp-gray text-sm mt-1">Dauerhaft kostenlos</p>
                </div>
                <ul className="space-y-3 mb-10 flex-grow">
                  {[
                    "Wöchentlicher General Brief (5–7 Patente)",
                    "Suche über die letzten 30 Tage",
                    "1 Watchlist",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-lp-gray text-sm">
                      <Check size={15} className="shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="w-full border border-lp-ink text-lp-ink font-semibold text-sm py-3 uppercase tracking-widest hover:bg-lp-ink hover:text-white transition-all text-center block"
                >
                  Kostenlos starten
                </Link>
              </div>

              {/* Starter */}
              <div className="bg-lp-paper border border-lp-border p-8 flex flex-col">
                <div className="mb-8">
                  <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-gray uppercase block mb-4">
                    Innovations-Verantwortliche
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-lp-ink">Starter</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-ibm-plex text-4xl font-semibold text-lp-ink">
                      €{billing === "yearly" ? "199" : "249"}
                    </span>
                    <span className="text-lp-gray text-sm">/ Monat</span>
                  </div>
                  <p className="text-lp-gray text-sm mt-1">
                    {billing === "yearly" ? "€2.388 / Jahr — Sie sparen €600" : "Jährlich nur €199 / Monat"}
                  </p>
                </div>
                <ul className="space-y-3 mb-10 flex-grow">
                  {[
                    "Wöchentlicher General Brief (5–7 Patente)",
                    "Personalisierter Brief nach eigenen Niches",
                    "Vollständiger Archiv-Zugriff (unbegrenzt)",
                    "Unbegrenzte Watchlists, editierbar",
                    "E-Mail + Dashboard-Archiv",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-lp-ink text-sm">
                      <Check size={15} className="shrink-0 text-lp-gray" />
                      {item}
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-lp-gray/50 text-sm line-through">
                    <Check size={15} className="shrink-0 opacity-30" />
                    Lookahead-Alerts (30 / 60 / 90 Tage)
                  </li>
                </ul>
                <Link
                  href="/signup"
                  className="w-full border border-lp-ink text-lp-ink font-semibold text-sm py-3 uppercase tracking-widest hover:bg-lp-ink hover:text-white transition-all text-center block"
                >
                  {billing === "yearly" ? "Jährlich abonnieren" : "Abonnieren"}
                </Link>
              </div>

              {/* Pro — highlighted */}
              <div className="bg-lp-paper border border-lp-border border-t-4 border-t-lp-amber p-8 flex flex-col relative">
                <div className="absolute -top-3 left-6">
                  <span className="bg-lp-amber text-white text-xs font-ibm-plex font-semibold uppercase tracking-[0.05em] px-2.5 py-1">
                    Empfohlen
                  </span>
                </div>
                <div className="mb-8">
                  <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-amber uppercase block mb-4">
                    R&D-Teams
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-lp-ink">Pro</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-ibm-plex text-4xl font-semibold text-lp-ink">
                      €{billing === "yearly" ? "399" : "499"}
                    </span>
                    <span className="text-lp-gray text-sm">/ Monat</span>
                  </div>
                  <p className="text-lp-gray text-sm mt-1">
                    {billing === "yearly" ? "€4.788 / Jahr — Sie sparen €1.200" : "Jährlich nur €399 / Monat"}
                  </p>
                </div>
                <ul className="space-y-3 mb-10 flex-grow">
                  {[
                    "Alles aus Starter",
                    "Lookahead-Alerts: Ablauf in 30 / 60 / 90 Tagen",
                    "Vorsprung vor Konkurrenten, rechtzeitig informiert",
                    "Konfigurierbare Vorschauzeiträume",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-lp-ink text-sm">
                      <Check size={15} className="text-lp-amber shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="w-full bg-lp-amber text-white font-semibold text-sm py-4 uppercase tracking-widest hover:bg-lp-amber-dark transition-all text-center block"
                >
                  {billing === "yearly" ? "Jährlich abonnieren" : "Abonnieren"}
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-24 bg-lp-paper border-t border-lp-border">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
            <div className="mb-16">
              <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-amber uppercase mb-2 block">
                Expansion
              </span>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <h2 className="font-serif text-3xl font-semibold leading-10 text-lp-ink">
                  Heute Europa. Morgen die Welt.
                </h2>
                <p className="text-lp-gray text-sm max-w-sm">
                  Ein abgelaufenes US-Patent kann jedes deutsche Unternehmen weltweit nutzen.
                  Wir erschliessen dieses Potenzial Schritt für Schritt.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-lp-border border border-lp-border">

              {/* Phase 1 — Live */}
              <div className="p-8 bg-lp-surface">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.08em] bg-lp-amber text-white px-2.5 py-1">
                    Live
                  </span>
                  <span className="font-ibm-plex text-xs text-lp-gray">Phase 1</span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-lp-ink mb-2">Europa</h3>
                <p className="text-lp-gray text-sm mb-6">
                  EP-Patente decken 38 Mitgliedsstaaten ab. Ein abgelaufenes EP-Patent ist frei nutzbar
                  in Deutschland, Österreich, Schweiz, Frankreich, Benelux und weiteren.
                </p>
                <ul className="space-y-2">
                  {[
                    "1,18 Mio. abgelaufene EP-Patente",
                    "165.000 deutsche Nationalpatente",
                    "Wöchentlich aktualisiert",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-lp-ink">
                      <Check size={13} className="text-lp-amber shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Phase 2 — Q3 2026 */}
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.08em] border border-lp-border text-lp-gray px-2.5 py-1">
                    Q3 2026
                  </span>
                  <span className="font-ibm-plex text-xs text-lp-gray">Phase 2</span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-lp-ink mb-2">Westeuropa komplett</h3>
                <p className="text-lp-gray text-sm mb-6">
                  Nationale Patentregister Österreichs, Grossbritanniens und Frankreichs
                  ergänzen die EP-Abdeckung um hunderttausende weitere Technologien.
                </p>
                <ul className="space-y-2">
                  {[
                    "AT: 143.000 Patente",
                    "GB: 372.000 Patente",
                    "FR: 731.000 Patente",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-lp-gray">
                      <div className="size-3 shrink-0 border border-lp-border" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Phase 3 — 2027 */}
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.08em] border border-lp-border text-lp-gray px-2.5 py-1">
                    2027
                  </span>
                  <span className="font-ibm-plex text-xs text-lp-gray">Phase 3</span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-lp-ink mb-2">Globale Märkte</h3>
                <p className="text-lp-gray text-sm mb-6">
                  Abgelaufene US-, japanische und chinesische Patente können weltweit genutzt werden.
                  28 Millionen Patente, jede Technologie, jede Industrie.
                </p>
                <ul className="space-y-2">
                  {[
                    "US: 6,4 Mio. Patente",
                    "JP: 5,2 Mio. Patente",
                    "CN: 8,3 Mio. Patente",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-lp-gray">
                      <div className="size-3 shrink-0 border border-lp-border" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-brand-navy text-white">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16 text-center">
            <h2 className="font-serif text-3xl font-semibold leading-10 mb-6">
              Wettbewerbsvorteil sichern.
            </h2>
            <p className="text-lg leading-7 text-white/70 max-w-xl mx-auto mb-10">
              Treten Sie deutschen Mittelständlern bei, die ihre Strategie auf fundierten
              Patentdaten aufbauen.
            </p>
            <div className="max-w-lg mx-auto">
              <form
                className="flex flex-col sm:flex-row gap-0 border-b border-white/30"
                action="/signup"
                method="get"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="E-Mail Adresse"
                  className="flex-grow bg-transparent border-none text-white px-4 py-4 placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-amber focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
                />
                <button
                  type="submit"
                  className="bg-lp-amber text-white font-semibold text-sm px-8 py-4 hover:bg-lp-amber-dark transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                >
                  KOSTENLOS ANMELDEN
                </button>
              </form>
              <p className="text-xs text-white/70 mt-4">
                Jederzeit kündbar. Kein Spam. Wir schützen Ihre Daten.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full bg-lp-paper border-t border-lp-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 px-4 lg:px-16 max-w-[1280px] mx-auto">
          <div className="flex flex-col gap-4">
            <span className="font-serif text-2xl font-bold text-lp-ink">Patentbrief</span>
            <p className="text-lp-gray text-base">
              Die wöchentliche Analyse der gewerblichen Schutzrechte für die deutsche Wirtschaft.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-ink uppercase">
              Navigation
            </span>
            <div className="flex flex-col gap-2">
              <Link href="#" className="text-lp-gray hover:text-brand-navy transition-colors duration-200 text-base">
                Newsletter
              </Link>
              <Link href="#" className="text-lp-gray hover:text-brand-navy transition-colors duration-200 text-base">
                LinkedIn
              </Link>
              <Link href="#" className="text-lp-gray hover:text-brand-navy transition-colors duration-200 text-base">
                Über Uns
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <span className="font-ibm-plex text-xs tracking-[0.05em] font-semibold text-lp-ink uppercase">
              Rechtliches
            </span>
            <div className="flex flex-col gap-2">
              <Link href="/impressum" className="text-lp-gray hover:text-brand-navy transition-colors duration-200 text-base">
                Impressum
              </Link>
              <Link href="/datenschutz" className="text-lp-gray hover:text-brand-navy transition-colors duration-200 text-base">
                Datenschutz
              </Link>
              <Link href="#" className="text-lp-gray hover:text-brand-navy transition-colors duration-200 text-base">
                AGB
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-lp-border py-6">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16 flex justify-between items-center text-xs text-lp-gray">
            <span>© Patentbrief 2026</span>
            <div className="flex gap-4">
              <button type="button" className="hover:text-brand-navy focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lp-amber">DE</button>
              <button type="button" className="hover:text-brand-navy focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lp-amber">EN</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
