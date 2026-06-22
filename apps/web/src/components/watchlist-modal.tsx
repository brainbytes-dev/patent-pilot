"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail } from "lucide-react";
import { IndustryStep } from "@/app/onboarding/_components/industry-step";
import { KeywordsStep } from "@/app/onboarding/_components/keywords-step";
import { NICHE_LABELS, NICHE_SUBCATEGORIES } from "@/lib/epo/cpc-map";

interface WatchlistRow {
  id: string;
  name: string | null;
  industries: string[];
  keywords: string[];
  cpcCodes: string[];
  active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the saved row after a successful save */
  onSuccess: (row: WatchlistRow) => void;
  /** When provided the modal is in edit mode */
  existing?: WatchlistRow;
}

const ALL_SUBS = Object.values(NICHE_SUBCATEGORIES).flat();
function cpcLabel(cpc: string) {
  return ALL_SUBS.find((s) => s.cpc === cpc)?.label ?? cpc;
}

export function WatchlistModal({ open, onClose, onSuccess, existing }: Props) {
  const isEdit = !!existing;
  const [step, setStep] = useState(1);
  const [industries, setIndustries] = useState<string[]>(existing?.industries ?? []);
  const [keywords, setKeywords] = useState<string[]>(existing?.keywords ?? []);
  const [cpcCodes, setCpcCodes] = useState<string[]>(existing?.cpcCodes ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    // reset state on close
    setStep(1);
    setIndustries(existing?.industries ?? []);
    setKeywords(existing?.keywords ?? []);
    setCpcCodes(existing?.cpcCodes ?? []);
    setError(null);
    onClose();
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: industries.slice(0, 2).join(", "),
        industries,
        keywords,
        cpcCodes,
      };
      const res = isEdit
        ? await fetch(`/api/watchlist/${existing!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      const row = await res.json() as WatchlistRow;
      handleClose();
      onSuccess(row);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  const title = isEdit ? "Watchlist bearbeiten" : "Watchlist einrichten";

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-serif text-xl">{title}</DialogTitle>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Schritt {step} von 3</span>
            </div>
            <Progress value={(step / 3) * 100} className="h-1" />
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4 min-h-[360px] flex flex-col overflow-y-auto">
          {step === 1 && (
            <IndustryStep
              selected={industries}
              onChange={setIndustries}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <KeywordsStep
              keywords={keywords}
              cpcCodes={cpcCodes}
              industries={industries}
              onChangeKeywords={setKeywords}
              onChangeCpc={setCpcCodes}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <h2 className="text-base font-semibold mb-1">Alles bereit.</h2>
                <p className="text-sm text-muted-foreground">
                  {isEdit ? "Änderungen werden sofort übernommen." : "Ihr erstes Briefing erhalten Sie in der nächsten Woche."}
                </p>
              </div>
              <Card className="p-5 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Branchen</p>
                  <p className="font-medium text-sm">{industries.map((i) => NICHE_LABELS[i] ?? i).join(", ")}</p>
                </div>
                {cpcCodes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Unterkategorien</p>
                    <p className="font-medium text-sm">{cpcCodes.map(cpcLabel).join(", ")}</p>
                  </div>
                )}
                {keywords.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Keywords</p>
                    <p className="font-medium text-sm">{keywords.join(", ")}</p>
                  </div>
                )}
                {!isEdit && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm pt-2 border-t">
                    <Mail className="size-4" />
                    <span>Wöchentliches Briefing per E-Mail</span>
                  </div>
                )}
              </Card>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 mt-auto pt-2">
                <Button variant="outline" onClick={() => setStep(2)} disabled={saving} className="flex-1">
                  Zurück
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-[2] bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <CheckCircle className="size-4 mr-2" />
                  {saving ? "Wird gespeichert..." : isEdit ? "Speichern" : "Watchlist starten"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
