"use client";

import {
  Building2, FlaskConical, Stethoscope, Zap, Car, Plane, Ship,
  Cpu, Radio, Code2, Eye, BarChart2, Flame, Bot, HardHat,
  UtensilsCrossed, Leaf, Shirt, Package, Recycle, Pill, Dna,
  Wrench, Factory,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NICHE_LABELS } from "@/lib/epo/cpc-map";

const ICONS: Record<string, LucideIcon> = {
  medtech:       Stethoscope,
  pharma:        Pill,
  biotech:       Dna,
  chemistry:     FlaskConical,
  polymers:      Package,
  mechanical:    Wrench,
  manufacturing: Factory,
  automotive:    Car,
  aerospace:     Plane,
  marine:        Ship,
  electronics:   Cpu,
  electrical:    Zap,
  telecom:       Radio,
  software:      Code2,
  optics:        Eye,
  measurement:   BarChart2,
  energy:        Flame,
  robotics:      Bot,
  construction:  HardHat,
  food:          UtensilsCrossed,
  agriculture:   Leaf,
  textiles:      Shirt,
  packaging:     Package,
  environment:   Recycle,
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
      <p className="text-muted-foreground text-sm mb-6">Mehrfachauswahl möglich.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {Object.entries(NICHE_LABELS).map(([key, label]) => {
          const Icon = ICONS[key] ?? Building2;
          const active = selected.includes(key);
          return (
            <Card
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                "p-4 cursor-pointer border-2 transition-colors hover:border-accent min-h-[80px] flex flex-col items-center justify-center gap-2 text-center",
                active ? "border-accent bg-accent/5" : "border-border"
              )}
            >
              <Icon className={cn("size-5 shrink-0", active ? "text-accent" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium leading-tight", active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
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
