"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { CheckCircle, X } from "lucide-react"
import { LandingHeader } from "@/components/landing-header"

type Billing = "monthly" | "yearly"

interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyMonthlyPrice: number
  features: string[]
  locked: string[]
  monthlyPriceId: string
  yearlyPriceId: string
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Für Innovations-Verantwortliche",
    monthlyPrice: 249,
    yearlyMonthlyPrice: 199,
    features: [
      "Wöchentlicher General Brief (5-7 Patente)",
      "Personalisierter Brief nach eigenen Niches",
      "Vollständiger Archiv-Zugriff (unbegrenzt)",
      "Unbegrenzte Watchlists, editierbar",
      "E-Mail + Dashboard-Archiv",
    ],
    locked: ["Lookahead-Alerts (30 / 60 / 90 Tage)"],
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Für strategisch aktive R&D-Teams",
    monthlyPrice: 499,
    yearlyMonthlyPrice: 399,
    features: [
      "Alles aus Starter",
      "Lookahead-Alerts: Patente ablaufend in 30 / 60 / 90 Tagen",
      "Vorsprung gegenüber Konkurrenten — vor dem Ablauf informiert",
      "Konfigurierbare Vorschauzeiträume",
    ],
    locked: [],
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? "",
    highlight: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [billing, setBilling] = useState<Billing>("monthly")
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectPlan = async (plan: Plan) => {
    if (!session) { router.push("/signup"); return }
    const priceId = billing === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId
    setIsLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) throw new Error("checkout failed")
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHeader />

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-3xl font-semibold mb-4">Einfache, transparente Preise</h1>
        <p className="text-muted-foreground text-lg">
          Kostenlos starten. Upgraden wenn der Wert klar ist.
        </p>

        <div className="inline-flex items-center gap-0 mt-8 border border-border bg-muted/30">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${billing === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${billing === "yearly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Jährlich
            <span className={`text-xs font-ibm-plex font-semibold px-1.5 py-0.5 ${billing === "yearly" ? "bg-accent text-accent-foreground" : "bg-accent/20 text-accent"}`}>
              20% sparen
            </span>
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16 w-full">
        {/* Free tier */}
        <div className="border border-border bg-muted/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="font-semibold text-foreground">Free — dauerhaft kostenlos</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wöchentlicher General Brief (5–7 Patente), Suche über die letzten 30 Tage, 1 Watchlist
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/signup")} className="shrink-0">
            Kostenlos starten
          </Button>
        </div>

        {/* Paid plans */}
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const displayPrice = billing === "yearly" ? plan.yearlyMonthlyPrice : plan.monthlyPrice
            const annualTotal = plan.yearlyMonthlyPrice * 12
            const saving = plan.monthlyPrice * 12 - annualTotal

            return (
              <div
                key={plan.id}
                className={`relative border flex flex-col p-8 ${plan.highlight ? "border-accent border-2" : "border-border"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-accent text-accent-foreground text-xs font-ibm-plex font-semibold uppercase tracking-[0.05em] px-2.5 py-1">
                      Empfohlen
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="font-serif text-xl font-semibold text-foreground">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-ibm-plex text-4xl font-semibold text-foreground">
                      €{displayPrice}
                    </span>
                    <span className="text-sm text-muted-foreground">/ Monat</span>
                  </div>
                  {billing === "yearly" ? (
                    <p className="text-xs text-muted-foreground font-ibm-plex mt-1">
                      €{annualTotal.toLocaleString("de-DE")} / Jahr — Sie sparen €{saving}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-ibm-plex mt-1">
                      Jährlich nur €{plan.yearlyMonthlyPrice} / Monat
                    </p>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className="size-4 text-accent shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.locked.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <X className="size-4 text-muted-foreground/50 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isLoading}
                  className={plan.highlight ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {billing === "yearly" ? "Jetzt jährlich abonnieren" : "Jetzt abonnieren"}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-muted/30 border-t border-border py-16">
        <div className="max-w-2xl mx-auto px-6 space-y-8">
          <h2 className="font-serif text-2xl font-semibold text-center mb-8">Häufige Fragen</h2>
          {[
            { q: "Was ist im Free-Plan enthalten?", a: "Den wöchentlichen General Brief mit 5–7 kuratierten, frisch abgelaufenen Patenten. Dazu Datenbanksuche über die letzten 30 Tage und 1 Watchlist." },
            { q: "Was ist der Unterschied zwischen Starter und Pro?", a: "Starter gibt Ihnen vollständigen Archiv-Zugriff und unbegrenzte personalisierte Watchlists. Pro fügt Lookahead-Alerts hinzu: Sie werden informiert, bevor ein Patent abläuft — 30, 60 oder 90 Tage im Voraus." },
            { q: "Kann ich zwischen monatlich und jährlich wechseln?", a: "Ja. Jederzeit im Kundenportal. Die Umstellung gilt zum nächsten Abrechnungsdatum." },
            { q: "Kann ich jederzeit kündigen?", a: "Ja. Monatlich: zum Monatsende. Jährlich: zum Ende des Vertragsjahres." },
            { q: "Woher kommen die Patentdaten?", a: "Aus dem offiziellen EPO-Register via OPS-API. Alle Informationen sind öffentlich und ohne Gewähr auf rechtliche Vollständigkeit." },
            { q: "Ist das eine Rechtsberatung?", a: "Nein. Patentbrief liefert strukturierte Informationen aus öffentlichen Registern. Für rechtliche Entscheidungen wenden Sie sich an einen zugelassenen Patentanwalt." },
          ].map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold mb-2">{q}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
