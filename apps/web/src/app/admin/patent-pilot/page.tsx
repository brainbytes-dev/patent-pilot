"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCw, Send, CheckCircle } from "lucide-react";

export default function AdminPatentbriefPage() {
  const [ingestStatus, setIngestStatus] = useState("");
  const [generateStatus, setGenerateStatus] = useState("");
  const [userId, setUserId] = useState("");

  async function triggerIngest() {
    setIngestStatus("Wird gestartet...");
    const res = await fetch("/api/admin/trigger-ingest", { method: "POST" });
    setIngestStatus(
      res.ok
        ? "Ingest-Job via Inngest ausgeloest."
        : "Fehler beim Ausloesen."
    );
  }

  async function triggerGenerate() {
    setGenerateStatus("Wird gestartet...");
    const res = await fetch("/api/admin/trigger-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId || undefined }),
    });
    setGenerateStatus(
      res.ok
        ? "Briefing-Generierung via Inngest ausgeloest."
        : "Fehler beim Ausloesen."
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Patentbrief Admin</h1>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-medium mb-1">EPO Nightly Ingest</h2>
          <p className="text-sm text-muted-foreground">
            Startet den Nightly-Ingest-Job manuell (laeuft sonst taeg. 01:00 UTC).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={triggerIngest} variant="outline">
            <RefreshCw className="mr-2 size-4" /> Ingest starten
          </Button>
          {ingestStatus && (
            <p className="text-sm text-muted-foreground">{ingestStatus}</p>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-medium mb-1">Briefing generieren</h2>
          <p className="text-sm text-muted-foreground">
            Generiert ein Briefing fuer eine User-ID. Leer lassen = eigener Account.
          </p>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="User-ID (optional)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="max-w-xs"
          />
          <Button
            onClick={triggerGenerate}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Send className="mr-2 size-4" /> Generieren
          </Button>
        </div>
        {generateStatus && (
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-accent" />
            <p className="text-sm text-muted-foreground">{generateStatus}</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-medium mb-3">Inngest-Funktionen</h2>
        <ul className="space-y-2 text-sm text-muted-foreground font-mono">
          <li>nightly-patent-ingest:cron 01:00 UTC daily</li>
          <li>sunday-briefing-trigger:cron 21:00 UTC Sunday</li>
          <li>generate-user-briefing:event: briefing/generate</li>
          <li>cleanup-sessions:cron 03:00 UTC daily</li>
          <li>send-welcome-email:event: user/signup</li>
          <li>payment-failed-reminder:event: stripe/payment.failed</li>
          <li>subscription-canceled:event: stripe/subscription.canceled</li>
        </ul>
      </Card>
    </div>
  );
}
