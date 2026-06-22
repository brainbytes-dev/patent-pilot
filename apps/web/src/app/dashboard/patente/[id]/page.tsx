"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Tag,
  FileText,
  ExternalLink,
  Clock,
  ImageOff,
  Users,
} from "lucide-react";

interface Patent {
  id: string;
  patentNumber: string;
  title: string;
  titleDe: string | null;
  abstractEn: string | null;
  abstractDe: string | null;
  filingDate: string | null;
  grantDate: string | null;
  expiryDate: string | null;
  lapsedAt: string | null;
  owner: string | null;
  cpcCodes: string[];
  status: string;
  source: string | null;
}

function resolveStatus(patent: Patent): { label: string; color: string; title?: string } {
  const today   = new Date();
  const expiry  = patent.expiryDate ? new Date(patent.expiryDate) : null;
  const lapsedAt = patent.lapsedAt  ? new Date(patent.lapsedAt)  : null;

  if (lapsedAt) {
    const reinstateDeadline = new Date(lapsedAt);
    reinstateDeadline.setFullYear(reinstateDeadline.getFullYear() + 1);
    if (reinstateDeadline <= today) {
      return { label: "Frei", color: "bg-status-free/10 text-status-free border-status-free/20" };
    }
    return { label: "Erloschen", color: "bg-status-erloschen/10 text-status-erloschen border-status-erloschen/20", title: "Wiedereinsetzung ggf. noch möglich (< 12 Monate)" };
  }

  if (expiry) {
    // +1 Tag Puffer: läuft heute ab → gilt als frei
    const freedAt = new Date(expiry);
    freedAt.setDate(freedAt.getDate() + 1);
    if (freedAt <= today) {
      return { label: "Frei", color: "bg-status-free/10 text-status-free border-status-free/20" };
    }
    return { label: "Aktiv", color: "bg-status-watch/10 text-status-watch border-status-watch/20" };
  }

  return { label: "Aktiv", color: "bg-status-watch/10 text-status-watch border-status-watch/20" };
}

interface PatentEvent {
  id: string;
  eventType: string;
  eventDate: string;
  details: Record<string, unknown> | null;
}

interface OpsEnriched {
  inventors: string[];
  abstractEn: string | null;
  abstractDe: string | null;
  claimsEn: string | null;
  applicationNumber: string | null;
}

interface Drawing {
  page: number;
  url: string;
}

function PatentDrawings({ patentId }: { patentId: string }) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patents/${patentId}/drawings`)
      .then((r) => r.json())
      .then((d: { drawings: Drawing[] }) => setDrawings(d.drawings ?? []))
      .finally(() => setLoading(false));
  }, [patentId]);

  if (loading) return <div className="h-64 bg-muted animate-pulse" />;
  if (drawings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 border border-border bg-muted/30">
        <ImageOff className="size-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Keine Zeichnungen verfügbar</p>
      </div>
    );
  }

  return (
    <div>
      <div className="border border-border bg-white relative aspect-[3/4] overflow-hidden">
        <Image
          key={drawings[selected]?.url}
          src={drawings[selected]?.url ?? ""}
          alt={`Zeichnung Seite ${drawings[selected]?.page ?? 0}`}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      {drawings.length > 1 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {drawings.map((d, i) => (
            <button
              key={d.page}
              onClick={() => setSelected(i)}
              className={`w-8 h-8 text-xs font-ibm-plex border transition-colors ${
                selected === i
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {d.page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  FILED: "Angemeldet",
  GRANTED: "Erteilt",
  LAPSED: "Erloschen",
  ASSIGNED: "Abgetreten",
  LISTED_FOR_SALE: "Zum Verkauf gestellt",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric" });
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-ibm-plex text-muted-foreground uppercase tracking-[0.06em]">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function PatentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ patent: Patent; events: PatentEvent[]; enriched: OpsEnriched | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/patents/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d as typeof data); })
      .finally(() => setLoading(false));
  }, [id]);

  const patent = data?.patent;
  const events = data?.events ?? [];
  const enriched = data?.enriched;
  const status = patent ? resolveStatus(patent) : null;
  const displayTitle = patent?.titleDe || patent?.title;

  // Best abstract: prefer DB DE → DB EN → OPS DE → OPS EN
  const abstract = patent?.abstractDe || patent?.abstractEn || enriched?.abstractDe || enriched?.abstractEn;

  // Inventors from OPS
  const inventors = enriched?.inventors ?? [];

  // Google Patents link (most reliable, works for all countries)
  const googlePatentsUrl = patent
    ? `https://patents.google.com/patent/${patent.patentNumber}/de`
    : null;

  // Espacenet — accepts publication numbers directly, no application number needed
  const epoRegisterUrl = patent
    ? `https://worldwide.espacenet.com/patent/search?q=pn%3D${patent.patentNumber}`
    : null;

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-6 gap-6 max-w-5xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="self-start -ml-2"
          >
            <ArrowLeft className="size-4 mr-1.5" />
            Zurück zur Suche
          </Button>

          {loading && (
            <div className="space-y-4">
              <div className="h-8 w-2/3 bg-muted animate-pulse" />
              <div className="h-4 w-1/3 bg-muted animate-pulse" />
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {notFound && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border">
              <FileText className="size-10 text-muted-foreground" />
              <p className="font-medium">Patent nicht gefunden</p>
              <p className="text-sm text-muted-foreground">Diese ID existiert nicht in der Datenbank.</p>
            </div>
          )}

          {patent && status && (
            <>
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span title={status.title} className={`inline-flex items-center text-xs font-ibm-plex font-semibold tracking-[0.05em] uppercase px-2 py-0.5 border ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="font-ibm-plex text-sm text-muted-foreground">{patent.patentNumber}</span>
                  {googlePatentsUrl && (
                    <a
                      href={googlePatentsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-foreground border border-border px-2 py-0.5 hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="size-3" />
                      Google Patents
                    </a>
                  )}
                  {epoRegisterUrl && (
                    <a
                      href={epoRegisterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="size-3" />
                      Espacenet
                    </a>
                  )}
                </div>
                <h1 className="font-serif text-2xl font-semibold text-foreground leading-snug">
                  {displayTitle}
                </h1>
                {patent.titleDe && patent.title && patent.title !== patent.titleDe && (
                  <p className="text-sm text-muted-foreground italic">{patent.title}</p>
                )}
              </div>

              {/* Two-column layout */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Left — abstract + inventors + claims + events */}
                <div className="md:col-span-2 space-y-6">
                  {abstract && (
                    <div>
                      <h2 className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                        Zusammenfassung
                      </h2>
                      <p className="text-sm text-foreground leading-relaxed">{abstract}</p>
                    </div>
                  )}

                  {inventors.length > 0 && (
                    <div>
                      <h2 className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                        Erfinder
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {inventors.map((inv) => (
                          <span key={inv} className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 bg-muted border border-border">
                            <Users className="size-3 text-muted-foreground" />
                            {inv}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {enriched?.claimsEn && (() => {
                    const decoded = enriched.claimsEn
                      .replace(/&lt;[^&]*&gt;/g, "")
                      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                      .replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, '"')
                    const parts = decoded.split(/\s+(?=\d+\.\s+[A-Z])/).map(s => s.replace(/^\.?\s*\d+\.\s*/, "").trim()).filter(Boolean)
                    const shown = parts.slice(0, 3)
                    const total = parts.length
                    return (
                      <div>
                        <h2 className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                          Ansprüche (Auszug)
                        </h2>
                        <div className="space-y-3">
                          {shown.map((claim, i) => (
                            <div key={i} className="text-sm text-foreground leading-relaxed border-l-2 border-border pl-4">
                              <span className="font-ibm-plex text-xs text-muted-foreground font-semibold mr-2">{i + 1}.</span>
                              {claim}
                            </div>
                          ))}
                        </div>
                        {total > 3 && (
                          <p className="text-xs text-muted-foreground mt-2 font-ibm-plex">+ {total - 3} weitere Ansprüche, vollständig auf Google Patents</p>
                        )}
                      </div>
                    )
                  })()}

                  {patent.cpcCodes && patent.cpcCodes.length > 0 && (
                    <div>
                      <h2 className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                        CPC-Klassifikationen
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {patent.cpcCodes.map((code) => (
                          <a
                            key={code}
                            href={`https://worldwide.espacenet.com/patent/search?q=cpc%3D${encodeURIComponent(code)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-ibm-plex text-xs px-2.5 py-1 bg-muted border border-border text-foreground hover:border-foreground transition-colors"
                          >
                            <Tag className="size-3 text-muted-foreground" />
                            {code}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {events.length > 0 && (
                    <div>
                      <h2 className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                        Ereignisverlauf
                      </h2>
                      <div className="space-y-0 border-l-2 border-border ml-2">
                        {events.map((ev) => (
                          <div key={ev.id} className="flex items-start gap-3 pl-4 pb-4 relative">
                            <div className="absolute -left-[5px] top-1.5 size-2 bg-border" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                              </p>
                              <p className="text-xs text-muted-foreground font-ibm-plex mt-0.5">
                                {formatDate(ev.eventDate)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right — drawings + meta */}
                <div className="space-y-5">
                  <div>
                    <h2 className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                      Zeichnungen
                    </h2>
                    <PatentDrawings patentId={patent.id} />
                  </div>

                  <div className="bg-muted/30 border border-border p-4">
                    <h2 className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
                      Details
                    </h2>
                    <div className="divide-y divide-border">
                      {patent.owner && (
                        <MetaRow icon={Building2} label="Anmelder" value={patent.owner} />
                      )}
                      <MetaRow icon={Calendar} label="Anmeldedatum" value={formatDate(patent.filingDate)} />
                      {patent.grantDate && (
                        <MetaRow icon={Calendar} label="Erteilungsdatum" value={formatDate(patent.grantDate)} />
                      )}
                      {patent.expiryDate && (
                        <MetaRow icon={Clock} label="Ablaufdatum" value={formatDate(patent.expiryDate)} />
                      )}
                      <MetaRow icon={FileText} label="Quelle" value={patent.source?.toUpperCase() ?? "EPO"} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
