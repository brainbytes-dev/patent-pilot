"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail } from "lucide-react";
import { NICHE_LABELS, NICHE_SUBCATEGORIES } from "@/lib/epo/cpc-map";

interface Props {
  industries: string[];
  keywords: string[];
  cpcCodes: string[];
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
}

const ALL_SUBS = Object.values(NICHE_SUBCATEGORIES).flat();

function cpcLabel(cpc: string) {
  return ALL_SUBS.find((s) => s.cpc === cpc)?.label ?? cpc;
}

export function ConfirmStep({ industries, keywords, cpcCodes, onBack, onFinish, saving }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Alles bereit.</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Ihr erstes Briefing erhalten Sie in der nächsten Woche.
      </p>
      <Card className="p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Branchen</p>
          <p className="font-medium">
            {industries.map((i) => NICHE_LABELS[i] ?? i).join(", ")}
          </p>
        </div>
        {cpcCodes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Unterkategorien</p>
            <p className="font-medium">{cpcCodes.map(cpcLabel).join(", ")}</p>
          </div>
        )}
        {keywords.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Keywords</p>
            <p className="font-medium">{keywords.join(", ")}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground text-sm pt-2 border-t">
          <Mail className="size-4" />
          <span>Wöchentliches Briefing per E-Mail</span>
        </div>
      </Card>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={saving}>
          Zurück
        </Button>
        <Button
          onClick={onFinish}
          disabled={saving}
          className="flex-[2] bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <CheckCircle className="size-4 mr-2" />
          {saving ? "Wird gespeichert..." : "Patentbrief starten"}
        </Button>
      </div>
    </div>
  );
}
