import { Mail, TrendingUp, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { INDUSTRY_LABELS } from "@/lib/epo/cpc-map";

interface Props {
  stats: {
    briefingsSent: number;
    patentsInBranch: number;
    newThisWeek: number;
    industries: string[];
  };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + " Mio.";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toLocaleString("de-DE");
}

export function StatsBar({ stats }: Props) {
  const branchLabel =
    stats.industries.length > 0
      ? stats.industries.map((i) => INDUSTRY_LABELS[i] ?? i).join(", ")
      : "Alle Branchen";

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Mail className="size-8 text-accent flex-shrink-0" />
          <div>
            <p className="text-2xl font-semibold font-ibm-plex">{stats.briefingsSent}</p>
            <p className="text-xs text-muted-foreground">Briefings erhalten</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <TrendingUp className="size-8 text-accent flex-shrink-0" />
          <div>
            <p className="text-2xl font-semibold font-ibm-plex">{formatCount(stats.patentsInBranch)}</p>
            <p className="text-xs text-muted-foreground">
              Frei in {branchLabel}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Sparkles className="size-8 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-2xl font-semibold font-ibm-plex">{formatCount(stats.newThisWeek)}</p>
            <p className="text-xs text-muted-foreground">Neu frei diese Woche</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
