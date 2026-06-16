"use client";

import { Building2, FlaskConical, Stethoscope, Zap, Car } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INDUSTRY_LABELS } from "@/lib/epo/cpc-map";

const ICONS: Record<string, LucideIcon> = {
  maschinenbau: Building2,
  chemie: FlaskConical,
  medtech: Stethoscope,
  elektro: Zap,
  automotive: Car,
};

interface Props {
  selected: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
}

export function IndustryStep({ selected, onChange, onNext }: Props) {
  function toggle(key: string) {
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">In welcher Branche sind Sie aktiv?</h2>
      <p className="text-muted-foreground text-sm mb-6">Mehrfachauswahl moeglich.</p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
          const Icon = ICONS[key] ?? Building2;
          const active = selected.includes(key);
          return (
            <Card
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                "p-6 cursor-pointer border-2 transition-colors hover:border-accent",
                active ? "border-accent bg-accent/5" : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "size-6",
                    active ? "text-accent" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
      <Button
        onClick={onNext}
        disabled={selected.length === 0}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        Weiter
      </Button>
    </div>
  );
}
