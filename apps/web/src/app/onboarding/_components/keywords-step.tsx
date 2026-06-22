"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NICHE_SUBCATEGORIES, NICHE_LABELS } from "@/lib/epo/cpc-map";
import { useState } from "react";

interface Props {
  keywords: string[];
  cpcCodes: string[];
  industries: string[];
  onChangeKeywords: (v: string[]) => void;
  onChangeCpc: (v: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const ALL_SUBS = Object.values(NICHE_SUBCATEGORIES).flat();

function cpcLabel(cpc: string) {
  return ALL_SUBS.find((s) => s.cpc === cpc)?.label ?? cpc;
}

export function KeywordsStep({
  keywords, cpcCodes, industries,
  onChangeKeywords, onChangeCpc,
  onNext, onBack,
}: Props) {
  const [keywordInput, setKeywordInput] = useState("");

  function toggleCpc(cpc: string) {
    onChangeCpc(
      cpcCodes.includes(cpc) ? cpcCodes.filter((c) => c !== cpc) : [...cpcCodes, cpc]
    );
  }

  function addKeyword(kw: string) {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) onChangeKeywords([...keywords, trimmed]);
    setKeywordInput("");
  }

  // All subcategories grouped by selected industry
  const groups = industries.map((key) => ({
    key,
    label: NICHE_LABELS[key] ?? key,
    subs: NICHE_SUBCATEGORIES[key] ?? [],
  })).filter((g) => g.subs.length > 0);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Feinjustierung</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Wählen Sie Unterkategorien aus Ihren Branchen.
      </p>

      {/* Subcategory chips grouped by industry */}
      <div className="space-y-5 mb-6">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.subs.map((s) => {
                const selected = cpcCodes.includes(s.cpc);
                return (
                  <Badge
                    key={s.key}
                    variant="outline"
                    onClick={() => toggleCpc(s.cpc)}
                    className={
                      selected
                        ? "cursor-pointer bg-accent/10 border-accent text-foreground"
                        : "cursor-pointer hover:bg-accent/10 hover:border-accent"
                    }
                  >
                    {selected ? "✓ " : "+ "}{s.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Free-text keywords */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Eigene Stichworte (optional)
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Stichwort eingeben..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(keywordInput); } }}
          />
          <Button variant="outline" onClick={() => addKeyword(keywordInput)} disabled={!keywordInput.trim()}>
            Hinzufügen
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <Badge key={kw} className="bg-primary text-primary-foreground gap-1 pr-1">
                {kw}
                <button onClick={() => onChangeKeywords(keywords.filter((k) => k !== kw))} className="ml-1 hover:opacity-70 rounded">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Zurück</Button>
        <Button onClick={onNext} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
          Weiter
        </Button>
      </div>
    </div>
  );
}
