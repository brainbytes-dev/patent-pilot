"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  briefingId: string;
  weekOf: string | null;
}

export function LatestBriefing({ briefingId, weekOf }: Props) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    fetch(`/api/briefings/${briefingId}`)
      .then((r) => r.json())
      .then((d: { htmlContent?: string }) => setHtml(d.htmlContent ?? ""));
  }, [briefingId]);

  const dateLabel = weekOf
    ? new Date(weekOf).toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Letztes Briefing</h2>
        {dateLabel && (
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        )}
      </div>
      <div
        className="prose prose-sm max-w-none text-foreground line-clamp-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Button variant="outline" size="sm" className="mt-4" asChild>
        <Link href={`/briefings/${briefingId}`}>
          Vollständig lesen <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </Card>
  );
}
