"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

interface Plan {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  priceId: string
  highlight?: boolean
}

const getPlans = (): Plan[] => [
  {
    id: "trial",
    name: "Trial",
    description: "2 Briefings kostenlos testen",
    price: 0,
    features: [
      "2 Briefings gratis",
      "1 Branche",
      "3 Keywords",
      "E-Mail-Zustellung",
      "Dashboard-Archiv",
    ],
    priceId: "free",
  },
  {
    id: "starter",
    name: "Starter",
    description: "Für Innovations-Verantwortliche",
    price: 249,
    features: [
      "Wöchentliche Briefings",
      "1 Branche",
      "3 Keywords",
      "E-Mail + Dashboard-Archiv",
      "Alle 3 Briefing-Sektionen",
      "Kein Jahresvertrag",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Für strategisch aktive Teams",
    price: 499,
    features: [
      "Wöchentliche Briefings",
      "3 Branchen",
      "Unlimitierte Keywords",
      "E-Mail + Dashboard-Archiv",
      "CPC-Verfeinerung",
      "Prioritäts-Support",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    highlight: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const plans = getPlans()

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.id === "trial") {
      router.push("/signup")
      return
    }

    if (!session) {
      router.push("/signup")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      })
      if (!response.ok) throw new Error("Failed to create checkout")
      const { url } = await response.json() as { url: string }
      window.location.href = url
    } catch (error) {
      console.error("Checkout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Patent Pilot
          </Link>
          {session ? (
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
                Anmelden
              </Button>
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => router.push("/signup")}
              >
                Kostenlos testen
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold mb-4">Einfache, transparente Preise</h1>
        <p className="text-muted-foreground text-lg">
          2 Briefings kostenlos. Dann 249 € oder 499 € pro Monat. Kein Jahresvertrag.
        </p>
      </section>

      {/* Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`flex flex-col relative ${
                plan.highlight ? "border-accent border-2 shadow-lg" : ""
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground">Empfohlen</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div>
                  <p className="text-4xl font-semibold font-mono">
                    {plan.price === 0 ? "Gratis" : `${plan.price} €`}
                  </p>
                  {plan.price > 0 && (
                    <p className="text-sm text-muted-foreground">pro Monat</p>
                  )}
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="size-4 text-accent flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isLoading}
                  className={`w-full ${
                    plan.highlight
                      ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.id === "trial" ? "Kostenlos starten" : "Jetzt abonnieren"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-2xl mx-auto px-6 space-y-8">
          <h2 className="text-2xl font-semibold text-center mb-8">Häufige Fragen</h2>
          {[
            {
              q: "Brauche ich eine Kreditkarte für den Trial?",
              a: "Nein. Die ersten 2 Briefings sind komplett kostenlos, ohne Zahlungsinformationen.",
            },
            {
              q: "Kann ich jederzeit kündigen?",
              a: "Ja. Kein Jahresvertrag, keine Kündigungsfrist. Kündigung gilt zum Ende des laufenden Monats.",
            },
            {
              q: "Woher kommen die Patentdaten?",
              a: "Aus dem offiziellen EPO-Register (European Patent Office) via deren OPS-API. Alle Daten sind öffentlich und ohne Gewähr.",
            },
            {
              q: "Ist das eine Rechtsberatung?",
              a: "Nein. Patent Pilot liefert strukturierte Informationen aus öffentlichen Patentregistern. Für rechtliche Entscheidungen wenden Sie sich an einen Patentanwalt.",
            },
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
