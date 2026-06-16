import { Mail, Database, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { INDUSTRY_LABELS } from "@/lib/epo/cpc-map";

interface Props {
  stats: {
    briefingsSent: number;
    patentsInDb: number;
    industries: string[];
  };
}

export function StatsBar({ stats }: Props) {
  const industryLabel =
    stats.industries.map((i) => INDUSTRY_LABELS[i] ?? i).join(", ") ||
    "Keine Branchen";

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Mail className="size-8 text-accent flex-shrink-0" />
          <div>
            <p className="text-2xl font-semibold font-mono">{stats.briefingsSent}</p>
            <p className="text-xs text-muted-foreground">Briefings erhalten</p>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Database className="size-8 text-primary flex-shrink-0" />
          <div>
            <p className="text-2xl font-semibold font-mono">
              {stats.patentsInDb.toLocaleString("de-DE")}
            </p>
            <p className="text-xs text-muted-foreground">Patente indexiert</p>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Eye className="size-8 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium leading-tight line-clamp-2">
              {industryLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ihre Watchlist</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
