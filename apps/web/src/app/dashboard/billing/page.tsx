"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { createPortalSession } from "@/lib/stripe"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, ArrowUpCircle, ExternalLink } from "lucide-react"
import { UpgradeModal } from "@/components/upgrade-modal"

type Tier = "free" | "starter" | "pro"

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
}

const TIER_DESCRIPTIONS: Record<Tier, string> = {
  free: "Wöchentlicher General Brief, Suche letzte 30 Tage, 1 Watchlist",
  starter: "Vollständiger Archiv-Zugriff, unbegrenzte Watchlists, personalisierter Brief",
  pro: "Alles aus Starter + Lookahead-Alerts 30 / 60 / 90 Tage im Voraus",
}

export default function BillingPage() {
  const { data: session } = useSession()
  const [tier, setTier] = useState<Tier>("free")
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  useEffect(() => {
    fetch("/api/user/tier")
      .then((r) => r.json())
      .then((d: { tier: Tier }) => setTier(d.tier))
      .catch(() => {})
  }, [])

  async function openPortal() {
    setLoadingPortal(true)
    try {
      const { url } = await createPortalSession()
      window.location.href = url
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPortal(false)
    }
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-6 lg:p-10 max-w-2xl w-full mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <CreditCard className="size-5 text-accent" />
            <h1 className="text-2xl font-semibold">Abonnement & Abrechnung</h1>
          </div>

          {/* Current plan */}
          <div className="border rounded-none p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">Aktueller Plan</p>
                  <Badge variant={tier === "free" ? "secondary" : "default"} className={tier !== "free" ? "bg-accent text-accent-foreground" : ""}>
                    {TIER_LABELS[tier]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{TIER_DESCRIPTIONS[tier]}</p>
              </div>

              {tier !== "free" && (
                <div className="text-right shrink-0">
                  <p className="font-ibm-plex text-lg font-semibold">
                    €{tier === "pro" ? "499" : "249"}
                  </p>
                  <p className="text-xs text-muted-foreground">/ Monat</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              {tier === "free" && (
                <Button
                  size="sm"
                  onClick={() => setUpgradeOpen(true)}
                  className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <ArrowUpCircle className="size-4" />
                  Upgraden
                </Button>
              )}
              {tier === "starter" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setUpgradeOpen(true)}
                    className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <ArrowUpCircle className="size-4" />
                    Auf Pro upgraden
                  </Button>
                  <Button size="sm" variant="outline" onClick={openPortal} disabled={loadingPortal} className="gap-1.5">
                    <ExternalLink className="size-3.5" />
                    {loadingPortal ? "Wird geladen…" : "Abo verwalten"}
                  </Button>
                </>
              )}
              {tier === "pro" && (
                <Button size="sm" variant="outline" onClick={openPortal} disabled={loadingPortal} className="gap-1.5">
                  <ExternalLink className="size-3.5" />
                  {loadingPortal ? "Wird geladen…" : "Abo verwalten"}
                </Button>
              )}
            </div>
          </div>

          {/* Account */}
          <div className="border rounded-none p-5 space-y-3">
            <p className="font-semibold text-sm">Kontoinformationen</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>E-Mail: <span className="text-foreground">{session?.user.email ?? "—"}</span></p>
              <p>Name: <span className="text-foreground">{session?.user.name ?? "—"}</span></p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Zahlungen werden über Stripe verarbeitet. Kündigung jederzeit möglich, gilt zum Ende der Laufzeit.
          </p>
        </div>
      </SidebarInset>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={tier === "starter" ? "Lookahead-Alerts mit Pro" : undefined}
      />
    </SidebarProvider>
  )
}
