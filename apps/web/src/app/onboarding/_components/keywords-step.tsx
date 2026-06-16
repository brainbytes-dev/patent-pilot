"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS: Record<string, string[]> = {
  maschinenbau: ["Hydraulik", "Antrieb", "Getriebe", "Sensorik", "Robotik", "CNC"],
  chemie: ["Katalyse", "Polymer", "Beschichtung", "Filtration", "Synthese"],
  medtech: ["Implantat", "Diagnostik", "Bildgebung", "Chirurgie", "Wearable"],
  elektro: ["Leistungselektronik", "Sensor", "Kommunikation", "Batterie"],
  automotive: ["Elektroantrieb", "ADAS", "Karosserie", "Bremse", "Leichtbau"],
};

interface Props {
  keywords: string[];
  industries: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function KeywordsStep({ keywords, industries, onChange, onNext, onBack }: Props) {
  const [input, setInput] = useState("");

  const suggestions = [
    ...new Set(industries.flatMap((i) => SUGGESTIONS[i] ?? [])),
  ].filter((s) => !keywords.includes(s));

  function add(kw: string) {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
    }
    setInput("");
  }

  function remove(kw: string) {
    onChange(keywords.filter((k) => k !== kw));
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Welche Technologien interessieren Sie?</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Stichwörter helfen uns, treffsichere Patente zu finden.
      </p>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Stichwort eingeben..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
        />
        <Button variant="outline" onClick={() => add(input)} disabled={!input.trim()}>
          Hinzufügen
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Vorschläge:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover:bg-accent/10 hover:border-accent"
                onClick={() => add(s)}
              >
                + {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {keywords.map((kw) => (
            <Badge key={kw} className="bg-primary text-primary-foreground gap-1 pr-1">
              {kw}
              <button
                onClick={() => remove(kw)}
                className="ml-1 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurück
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}
