"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText,
  Calendar,
  Building2,
  Tag,
  Database,
  LayoutGrid,
  List,
  Loader2,
  ChevronDown,
  Check,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { FreeTierBanner, UpgradeModal } from "@/components/upgrade-modal";

interface Patent {
  id: string;
  patentNumber: string;
  title: string;
  titleDe: string | null;
  abstractDe: string | null;
  filingDate: string | null;
  expiryDate: string | null;
  lapsedAt: string | null;
  owner: string | null;
  cpcCodes: string[];
  status: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:  { label: "Aktiv",      color: "bg-status-watch/10 text-status-watch border-status-watch/20" },
  expired: { label: "Frei",       color: "bg-status-free/10 text-status-free border-status-free/20" },
  lapsed:  { label: "Erloschen",  color: "bg-status-erloschen/10 text-status-erloschen border-status-erloschen/20" },
  pending: { label: "Angemeldet", color: "bg-muted text-muted-foreground border-border" },
};


const REGION_TABS = [
  { label: "Alle", value: "" },
  { label: "Europa", value: "eu" },
  { label: "USA", value: "us" },
  { label: "Asien", value: "asia" },
];

const NICHE_OPTIONS = [
  { label: "Med Tech", value: "medtech" },
  { label: "Pharma", value: "pharma" },
  { label: "Biotechnologie", value: "biotech" },
  { label: "Chemie", value: "chemistry" },
  { label: "Kunststoffe / Polymere", value: "polymers" },
  { label: "Maschinenbau", value: "mechanical" },
  { label: "Fertigungstechnik", value: "manufacturing" },
  { label: "Automotive", value: "automotive" },
  { label: "Luft- und Raumfahrt", value: "aerospace" },
  { label: "Marine / Schifffahrt", value: "marine" },
  { label: "Elektronik / Halbleiter", value: "electronics" },
  { label: "Elektrotechnik", value: "electrical" },
  { label: "Telekommunikation", value: "telecom" },
  { label: "IT / Software / KI", value: "software" },
  { label: "Optik / Photonik", value: "optics" },
  { label: "Messtechnik / Sensorik", value: "measurement" },
  { label: "Energie / Erneuerbare", value: "energy" },
  { label: "Robotik / Automatisierung", value: "robotics" },
  { label: "Bau / Konstruktion", value: "construction" },
  { label: "Lebensmittel / Getränke", value: "food" },
  { label: "Agrar / Landwirtschaft", value: "agriculture" },
  { label: "Textil / Bekleidung", value: "textiles" },
  { label: "Verpackung / Logistik", value: "packaging" },
  { label: "Umwelt / Wasseraufbereitung", value: "environment" },
];

function NicheDropdown({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  const filtered = search.trim()
    ? NICHE_OPTIONS.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : NICHE_OPTIONS;

  const label = selected
    ? (NICHE_OPTIONS.find((o) => o.value === selected)?.label ?? selected)
    : "Alle Branchen";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`font-ibm-plex text-xs font-medium px-3 py-1.5 border flex items-center gap-1.5 transition-colors ${
          selected
            ? "bg-foreground text-background border-foreground"
            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        {label}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border min-w-[220px]">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="w-full pl-6 pr-2 py-1 font-ibm-plex text-xs bg-muted border border-border focus:outline-none focus:border-foreground"
              />
            </div>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {!search && (
              <>
                <button
                  onClick={() => { onChange(""); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 font-ibm-plex text-xs flex items-center gap-2 hover:bg-muted transition-colors"
                >
                  <span className={`size-3.5 border flex items-center justify-center shrink-0 ${!selected ? "bg-foreground border-foreground" : "border-border"}`}>
                    {!selected && <Check className="size-2.5 text-background" />}
                  </span>
                  Alle Branchen
                </button>
                <div className="h-px bg-border my-1" />
              </>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-2 font-ibm-plex text-xs text-muted-foreground">Keine Treffer</p>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-1.5 font-ibm-plex text-xs flex items-center gap-2 hover:bg-muted transition-colors"
              >
                <span className={`size-3.5 border flex items-center justify-center shrink-0 ${selected === opt.value ? "bg-foreground border-foreground" : "border-border"}`}>
                  {selected === opt.value && <Check className="size-2.5 text-background" />}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const LANG_OPTIONS = [
  { label: "Deutsch", value: "de" },
  { label: "Englisch", value: "en" },
  { label: "Französisch", value: "fr" },
  { label: "Japanisch", value: "ja" },
  { label: "Chinesisch", value: "zh" },
  { label: "Koreanisch", value: "ko" },
  { label: "Russisch", value: "ru" },
  { label: "Spanisch", value: "es" },
  { label: "Portugiesisch", value: "pt" },
  { label: "Arabisch", value: "ar" },
];

function LangDropdown({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const label =
    selected.length === 0
      ? "Alle Sprachen"
      : selected.length === 1
        ? (LANG_OPTIONS.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} Sprachen`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`font-ibm-plex text-xs font-medium px-3 py-1.5 border flex items-center gap-1.5 transition-colors ${
          selected.length > 0
            ? "bg-foreground text-background border-foreground"
            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        {label}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border min-w-[160px] py-1">
          <button
            onClick={() => onChange([])}
            className="w-full text-left px-3 py-1.5 font-ibm-plex text-xs flex items-center gap-2 hover:bg-muted transition-colors"
          >
            <span className={`size-3.5 border flex items-center justify-center shrink-0 ${selected.length === 0 ? "bg-foreground border-foreground" : "border-border"}`}>
              {selected.length === 0 && <Check className="size-2.5 text-background" />}
            </span>
            Alle Sprachen
          </button>
          <div className="h-px bg-border my-1" />
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="w-full text-left px-3 py-1.5 font-ibm-plex text-xs flex items-center gap-2 hover:bg-muted transition-colors"
            >
              <span className={`size-3.5 border flex items-center justify-center shrink-0 ${selected.includes(opt.value) ? "bg-foreground border-foreground" : "border-border"}`}>
                {selected.includes(opt.value) && <Check className="size-2.5 text-background" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type ResolvedStatus =
  | { state: "free";        freeDate: Date }
  | { state: "reinstatable"; lapseDate: Date }   // erloschen, aber < 12 Monate → Wiedereinsetzung möglich
  | { state: "active";      expiryDate: Date }
  | { state: "unknown" };

function resolveStatus(patent: Patent): ResolvedStatus {
  const today    = new Date();
  const expiry   = patent.expiryDate ? new Date(patent.expiryDate) : null;
  const lapsedAt = patent.lapsedAt   ? new Date(patent.lapsedAt)   : null;

  if (lapsedAt) {
    const reinstateDeadline = new Date(lapsedAt);
    reinstateDeadline.setFullYear(reinstateDeadline.getFullYear() + 1);

    if (reinstateDeadline <= today) {
      // > 12 Monate seit Lapse → definitiv frei, Wiedereinsetzung nicht mehr möglich
      return { state: "free", freeDate: lapsedAt };
    } else {
      // < 12 Monate → Wiedereinsetzung noch möglich
      return { state: "reinstatable", lapseDate: lapsedAt };
    }
  }

  if (expiry) {
    if (expiry <= today) return { state: "free", freeDate: expiry };
    return { state: "active", expiryDate: expiry };
  }

  return { state: "unknown" };
}

function formatPatentDate(patent: Patent): string {
  const fmt    = (d: Date) => d.toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
  const status = resolveStatus(patent);

  if (status.state === "free")         return `Frei seit ${fmt(status.freeDate)}`;
  if (status.state === "reinstatable") return `Erloschen seit ${fmt(status.lapseDate)}`;
  if (status.state === "active")       return `Läuft ab ${fmt(status.expiryDate)}`;
  return patent.filingDate ? `Anmeldung ${fmt(new Date(patent.filingDate))}` : "—";
}

function StatusBadge({ patent }: { patent: Patent }) {
  const status = resolveStatus(patent);

  const cfg =
    status.state === "free"
      ? { label: "Frei",       color: "bg-status-free/10 text-status-free border-status-free/20",               title: undefined }
    : status.state === "reinstatable"
      ? { label: "Erloschen",  color: "bg-status-erloschen/10 text-status-erloschen border-status-erloschen/20", title: "Wiedereinsetzung ggf. noch möglich (< 12 Monate)" }
    : status.state === "active"
      ? { label: "Aktiv",      color: "bg-status-watch/10 text-status-watch border-status-watch/20",             title: undefined }
    : { label: "Unbekannt",    color: "bg-muted text-muted-foreground border-border",                            title: undefined };

  return (
    <span
      title={cfg.title}
      className={`inline-flex items-center text-xs font-ibm-plex font-semibold tracking-[0.05em] uppercase px-2 py-0.5 border ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

function PatentCardImage({ patentId }: { patentId: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/patents/${patentId}/drawings/1`}
      alt=""
      loading="lazy"
      onError={() => setVisible(false)}
      className="w-full h-32 object-contain bg-muted/40 border-b border-border"
    />
  );
}

function PatentCard({ patent, onClick }: { patent: Patent; onClick: () => void }) {
  const displayTitle = patent.titleDe || patent.title;
  const abstract = patent.abstractDe ?? "";

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-card border border-border hover:border-foreground transition-colors duration-150 flex flex-col"
    >
      <PatentCardImage patentId={patent.id} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <StatusBadge patent={patent} />
          <span className="font-ibm-plex text-xs text-muted-foreground shrink-0">{patent.patentNumber}</span>
        </div>

        <h3 className="font-serif text-base font-semibold text-foreground leading-snug line-clamp-2">
          {displayTitle}
        </h3>

        {abstract && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {abstract}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
          {patent.owner && (
            <span className="flex items-center gap-1">
              <Building2 className="size-3" />
              <span className="line-clamp-1 max-w-[120px]">{patent.owner}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatPatentDate(patent)}
          </span>
          {patent.cpcCodes?.slice(0, 2).map((code) => (
            <span key={code} className="flex items-center gap-1 font-ibm-plex">
              <Tag className="size-3" />
              {code}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function PatentRow({ patent, onClick }: { patent: Patent; onClick: () => void }) {
  const displayTitle = patent.titleDe || patent.title;

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-card border-b border-border px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3 min-w-[560px]"
    >
      <div className="w-24 shrink-0">
        <StatusBadge patent={patent} />
      </div>
      <div className="w-28 shrink-0 font-ibm-plex text-xs text-muted-foreground truncate">{patent.patentNumber}</div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm font-semibold text-foreground truncate">{displayTitle}</p>
        {patent.owner && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{patent.owner}</p>
        )}
      </div>
      <div className="hidden lg:flex items-center gap-1 shrink-0 w-32">
        {patent.cpcCodes?.slice(0, 2).map((code) => (
          <span key={code} className="font-ibm-plex text-xs px-1.5 py-0.5 bg-muted border border-border text-muted-foreground truncate max-w-[56px]">
            {code}
          </span>
        ))}
      </div>
      <div className="hidden sm:block shrink-0 text-xs text-muted-foreground font-ibm-plex w-20 text-right">
        {formatPatentDate(patent)}
      </div>
    </button>
  );
}

const LIMIT = 24;

export default function PatenteEntdeckenPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [langFilter, setLangFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [results, setResults] = useState<Patent[]>([]);
  const [total, setTotal] = useState(0);
  const [freeCount, setFreeCount] = useState<number | null>(null);
  const [reinstatable_count, setReinstatableCount] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFreeTier, setIsFreeTier] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const BLUR_COUNT = 3;

  useEffect(() => {
    fetch("/api/user/tier")
      .then((r) => r.json())
      .then((d: { tier: string }) => setIsFreeTier(d.tier === "free"))
      .catch(() => {});
  }, []);

  const debouncedQuery = useDebounce(query, 350);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Refs to avoid stale closures in IntersectionObserver
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const debouncedQueryRef = useRef(debouncedQuery);
  const regionFilterRef = useRef(regionFilter);
  const nicheFilterRef = useRef(nicheFilter);
  const langFilterRef = useRef(langFilter);
  const sortByRef = useRef(sortBy);

  debouncedQueryRef.current = debouncedQuery;
  regionFilterRef.current = regionFilter;
  nicheFilterRef.current = nicheFilter;
  langFilterRef.current = langFilter;
  sortByRef.current = sortBy;
  offsetRef.current = offset;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;

  const fetchPage = useCallback(async (q: string, region: string, niche: string, lang: string[], sort: string, off: number) => {
    const isInitial = off === 0;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    }
    try {
      const params = new URLSearchParams({ q, limit: String(LIMIT), offset: String(off), sort });
      if (region) params.set("region", region);
      if (niche) params.set("niche", niche);
      if (lang.length > 0) params.set("lang", lang.join(","));
      const res = await fetch(`/api/patents/search?${params}`);
      if (!res.ok) return;
      const data = await res.json() as { results?: Patent[]; total?: number; hasMore?: boolean; freeCount?: number | null; reinstatable_count?: number | null };
      const results = data.results ?? [];
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      if (isInitial) {
        setFreeCount(data.freeCount ?? null);
        setReinstatableCount(data.reinstatable_count ?? null);
      }
      hasMoreRef.current = data.hasMore ?? false;
      if (isInitial) {
        setResults(results);
        setOffset(results.length);
        offsetRef.current = results.length;
      } else {
        setResults((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...results.filter((p) => !seen.has(p.id))];
        });
        setOffset((prev) => {
          const next = prev + results.length;
          offsetRef.current = next;
          return next;
        });
      }
    } finally {
      if (isInitial) setLoading(false);
      else {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, []);

  // Reset + reload when query or filter changes
  useEffect(() => {
    fetchPage(debouncedQuery, regionFilter, nicheFilter, langFilter, sortBy, 0);
  }, [debouncedQuery, regionFilter, nicheFilter, langFilter, sortBy, fetchPage]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          fetchPage(debouncedQueryRef.current, regionFilterRef.current, nicheFilterRef.current, langFilterRef.current, sortByRef.current, offsetRef.current);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage]);

  const navigate = (patent: Patent) => router.push(`/dashboard/patente/${patent.id}`);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="overflow-x-hidden">
        <SiteHeader />
        <div className="flex flex-1 flex-col p-6 gap-5 min-w-0">
          {isFreeTier && <FreeTierBanner />}
          {/* Header */}
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Patente entdecken</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {freeCount !== null && reinstatable_count !== null ? (
                <>
                  <span className="text-green-400 font-medium">{freeCount.toLocaleString("de-CH")} Frei</span>
                  <span className="mx-1.5 opacity-40">·</span>
                  <span className="text-amber-400 font-medium">{reinstatable_count.toLocaleString("de-CH")} Erloschen</span>
                  <span className="mx-1.5 opacity-40">·</span>
                  nach Datum sortiert
                </>
              ) : total > 0 ? (
                `${total.toLocaleString("de-CH")} nicht-aktive Patente`
              ) : ""}
            </p>
          </div>

          {/* Search + view toggle */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Stichwort, Inhaber, Patentnummer …"
                className="pl-9 h-11 text-base"
              />
            </div>
            <div className="flex border border-border">
              <button
                onClick={() => setView("grid")}
                className={`h-11 px-3 flex items-center transition-colors ${view === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`h-11 px-3 flex items-center border-l border-border transition-colors ${view === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
            <div className="flex gap-1">
              {REGION_TABS.map((tab) => (
                <button
                  key={tab.value || "all-region"}
                  onClick={() => setRegionFilter(tab.value)}
                  className={`font-ibm-plex text-xs font-medium px-3 py-1.5 border transition-colors ${
                    regionFilter === tab.value
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <NicheDropdown selected={nicheFilter} onChange={setNicheFilter} />
            <LangDropdown selected={langFilter} onChange={setLangFilter} />
          </div>

          {/* Legende + Sort */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-ibm-plex text-muted-foreground">
                <span className="inline-block w-2.5 h-2.5 bg-status-free" />
                Frei: gemeinfrei, keine Schutzrechte mehr
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-ibm-plex text-muted-foreground">
                <span className="inline-block w-2.5 h-2.5 bg-status-erloschen" />
                Erloschen: &lt; 12 Monate, Wiedereinsetzung möglich
              </span>
            </div>
            <div className="flex gap-1 ml-auto">
              <span className="font-ibm-plex text-xs text-muted-foreground self-center pr-2">Sortierung</span>
              {([
                { value: "date", label: "Datum" },
                { value: "name", label: "Name" },
              ] as const).map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setSortBy(tab.value)}
                  className={`font-ibm-plex text-xs font-medium px-3 py-1.5 border transition-colors ${
                    sortBy === tab.value
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Empty DB state */}
          {!loading && total === 0 && !query && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-border bg-muted/30">
              <Database className="size-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">Datenbank wird befüllt</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Wir indexieren europäische Patente. Ihr erster Briefing-Batch erscheint am Montag.
                </p>
              </div>
            </div>
          )}

          {/* No results for query */}
          {!loading && total === 0 && query && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-border bg-muted/30">
              <FileText className="size-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">Keine Ergebnisse</p>
                <p className="text-sm text-muted-foreground mt-1">Versuchen Sie einen anderen Suchbegriff oder CPC-Code.</p>
              </div>
            </div>
          )}

          {/* Initial loading skeleton */}
          {loading && view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border animate-pulse h-52" />
              ))}
            </div>
          )}
          {loading && view === "list" && (
            <div className="border border-border divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse bg-card" />
              ))}
            </div>
          )}

          {/* Grid results */}
          {!loading && results.length > 0 && view === "grid" && (() => {
            const showBlur = isFreeTier && results.length > BLUR_COUNT;
            const visible = showBlur ? results.slice(0, -BLUR_COUNT) : results;
            const blurred = showBlur ? results.slice(-BLUR_COUNT) : [];
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visible.map((patent) => (
                    <PatentCard key={patent.id} patent={patent} onClick={() => navigate(patent)} />
                  ))}
                </div>
                {showBlur && (
                  <div className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pointer-events-none select-none">
                      {blurred.map((patent) => (
                        <div key={patent.id} className="blur-sm opacity-60">
                          <PatentCard patent={patent} onClick={() => {}} />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background flex flex-col items-center justify-end gap-4 pb-10">
                      <div className="text-center space-y-1.5">
                        <p className="font-serif text-xl font-semibold">Mehr Ergebnisse mit Starter</p>
                        <p className="text-sm text-muted-foreground">Unbegrenzte Suche, alle Länder, personalisierte Briefings.</p>
                      </div>
                      <button
                        onClick={() => setUpgradeOpen(true)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-2.5 text-sm font-medium transition-colors"
                      >
                        Jetzt upgraden, ab €250 / Monat
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* List results */}
          {!loading && results.length > 0 && view === "list" && (() => {
            const showBlur = isFreeTier && results.length > BLUR_COUNT;
            const visible = showBlur ? results.slice(0, -BLUR_COUNT) : results;
            const blurred = showBlur ? results.slice(-BLUR_COUNT) : [];
            const header = (
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-b border-border">
                <div className="w-24 shrink-0 text-xs font-ibm-plex font-semibold text-muted-foreground uppercase tracking-[0.06em]">Status</div>
                <div className="w-28 shrink-0 text-xs font-ibm-plex font-semibold text-muted-foreground uppercase tracking-[0.06em]">Nummer</div>
                <div className="flex-1 min-w-0 text-xs font-ibm-plex font-semibold text-muted-foreground uppercase tracking-[0.06em]">Titel</div>
                <div className="hidden lg:block w-32 shrink-0 text-xs font-ibm-plex font-semibold text-muted-foreground uppercase tracking-[0.06em]">CPC</div>
                <div className="hidden sm:block w-20 shrink-0 text-right text-xs font-ibm-plex font-semibold text-muted-foreground uppercase tracking-[0.06em]">Datum</div>
              </div>
            );
            return (
              <>
                <div className="border border-border w-full overflow-x-auto">
                  <div className="min-w-[560px]">
                    {header}
                    {visible.map((patent) => (
                      <PatentRow key={patent.id} patent={patent} onClick={() => navigate(patent)} />
                    ))}
                  </div>
                </div>
                {showBlur && (
                  <div className="relative border border-t-0 border-border w-full overflow-hidden">
                    <div className="min-w-[560px] pointer-events-none select-none blur-sm opacity-60">
                      {blurred.map((patent) => (
                        <PatentRow key={patent.id} patent={patent} onClick={() => {}} />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background flex flex-col items-center justify-end gap-4 pb-8">
                      <div className="text-center space-y-1.5">
                        <p className="font-serif text-xl font-semibold">Mehr Ergebnisse mit Starter</p>
                        <p className="text-sm text-muted-foreground">Unbegrenzte Suche, alle Länder, personalisierte Briefings.</p>
                      </div>
                      <button
                        onClick={() => setUpgradeOpen(true)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-2.5 text-sm font-medium transition-colors"
                      >
                        Jetzt upgraden, ab €250 / Monat
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Infinite scroll sentinel + spinner */}
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore && <Loader2 className="size-5 text-muted-foreground animate-spin" />}
          </div>
        </div>
      </SidebarInset>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="Starter-Plan erforderlich"
      />
    </SidebarProvider>
  );
}
