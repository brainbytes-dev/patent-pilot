"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Shown above the plan cards — context why the modal appeared */
  reason?: string;
}

type Billing = "monthly" | "yearly";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 250,
    yearlyMonthlyPrice: 199,
    features: [
      "Vollständiger Archiv-Zugriff (unbegrenzt)",
      "Unbegrenzte Watchlists",
      "Personalisierter Briefing nach eigenen Niches",
      "E-Mail + Dashboard-Archiv",
    ],
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 400,
    yearlyMonthlyPrice: 319,
    features: [
      "Alles aus Starter",
      "Lookahead-Alerts: 30 / 60 / 90 Tage im Voraus",
      "Strategischer Vorsprung vor Mitbewerbern",
    ],
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? "",
    highlight: true,
  },
] as const;

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loading, setLoading] = useState(false);

  async function checkout(plan: (typeof PLANS)[number]) {
    const priceId = billing === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error("checkout failed");
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-serif text-xl">
            {reason ?? "Upgraden für mehr Zugriff"}
          </DialogTitle>
        </DialogHeader>

        {/* Billing toggle */}
        <div className="px-6 pt-4 pb-2">
          <div className="inline-flex items-center gap-0 border border-border bg-muted/30">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${billing === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${billing === "yearly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Jährlich
              <span className={`text-xs font-semibold px-1.5 py-0.5 ${billing === "yearly" ? "bg-accent text-accent-foreground" : "bg-accent/20 text-accent"}`}>
                2 Monate gratis
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-2 gap-4 px-6 pb-6">
          {PLANS.map((plan) => {
            const price = billing === "yearly" ? plan.yearlyMonthlyPrice : plan.monthlyPrice;
            const annualSaving = plan.monthlyPrice * 12 - plan.yearlyMonthlyPrice * 12;
            return (
              <div
                key={plan.id}
                className={`relative border flex flex-col p-5 ${plan.highlight ? "border-accent border-2" : "border-border"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-accent text-accent-foreground text-xs font-semibold uppercase tracking-wider px-2 py-0.5">
                      Empfohlen
                    </span>
                  </div>
                )}
                <p className="font-serif text-lg font-semibold">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-2 mb-1">
                  <span className="font-mono text-3xl font-semibold">€{price}</span>
                  <span className="text-xs text-muted-foreground">/ Monat</span>
                </div>
                {billing === "yearly" && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Sie sparen €{annualSaving} / Jahr
                  </p>
                )}
                <ul className="space-y-2 flex-1 mt-3 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="size-3.5 text-accent shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  onClick={() => checkout(plan)}
                  disabled={loading}
                  variant={plan.highlight ? "default" : "outline"}
                  className={plan.highlight ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}
                >
                  {billing === "yearly" ? "Jährlich abonnieren" : "Abonnieren"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Small inline button that opens the upgrade modal */
export function UpgradeCta({ reason, label = "Upgraden" }: { reason?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="underline text-accent font-medium text-sm"
      >
        {label}
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} reason={reason} />
    </>
  );
}

/** Banner shown in search for free-tier users */
export function FreeTierBanner() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">
          Free-Plan: Suche zeigt nur die letzten 30 Tage.{" "}
          <button onClick={() => setOpen(true)} className="underline text-accent font-medium">
            Vollständiges Archiv freischalten
          </button>
        </span>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="size-3.5" />
        </button>
      </div>
      <UpgradeModal
        open={open}
        onClose={() => setOpen(false)}
        reason="Vollständiger Archiv-Zugriff ab Starter"
      />
    </>
  );
}
