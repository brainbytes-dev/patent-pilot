"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail } from "lucide-react";
import { INDUSTRY_LABELS } from "@/lib/epo/cpc-map";

interface Props {
  industries: string[];
  keywords: string[];
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
}

export function ConfirmStep({ industries, keywords, onBack, onFinish, saving }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Alles bereit.</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Ihr erstes Briefing erhalten Sie am kommenden Montag um 8 Uhr.
      </p>
      <Card className="p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Branchen
          </p>
          <p className="font-medium">
            {industries.map((i) => INDUSTRY_LABELS[i] ?? i).join(", ")}
          </p>
        </div>
        {keywords.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Keywords
            </p>
            <p className="font-medium">{keywords.join(", ")}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground text-sm pt-2 border-t">
          <Mail className="size-4" />
          <span>Briefings jeden Montag um 8 Uhr</span>
        </div>
      </Card>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={saving}
        >
          Zurück
        </Button>
        <Button
          onClick={onFinish}
          disabled={saving}
          className="flex-[2] bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <CheckCircle className="size-4 mr-2" />
          {saving ? "Wird gespeichert..." : "Patent Pilot starten"}
        </Button>
      </div>
    </div>
  );
}
