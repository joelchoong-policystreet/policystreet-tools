import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/shared/utils/cn";
import type { ClusterStat } from "../utils/aggregate";
import { formatPp } from "../utils/aggregate";
import { GROUP_ORDER, GROUPS, groupColor } from "../utils/colors";
import { InfoTip } from "./InfoTip";

export function GroupLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs", className)}>
      {GROUP_ORDER.map((g) => (
        <span key={g} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: groupColor(g) }} />
          {GROUPS[g].label}
        </span>
      ))}
    </div>
  );
}

export function ClusterSizesCard({ stats, compareLabel }: { stats: ClusterStat[]; compareLabel: string | null }) {
  const max = stats[0]?.count ?? 1;
  return (
    <Card className="rounded-2xl border-2 border-border/80 shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle>Cluster sizes</CardTitle>
        <CardDescription>
          {compareLabel ? `Count · share of feedback · change in share vs ${compareLabel}` : "Count · share of feedback"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {stats.length === 0 && <p className="text-sm text-muted-foreground">No submissions for this period.</p>}
        {stats.map((s) => {
          const d = s.delta;
          return (
            <div
              key={s.cluster.code}
              className="grid grid-cols-[minmax(0,190px)_minmax(0,1fr)_40px_44px_72px] items-center gap-2.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1">
                <span className="truncate font-medium" title={s.cluster.name}>
                  {s.cluster.name}
                </span>
                {s.cluster.isPriority && <span className="text-xs text-primary" aria-label="priority cluster">★</span>}
                <InfoTip text={s.cluster.description} label={s.cluster.name} />
              </span>
              <div className="h-3.5 overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.max(1.5, (100 * s.count) / max)}%`, backgroundColor: groupColor(s.cluster.groupKey) }}
                />
              </div>
              <span className="text-right font-mono text-[13px] tabular-nums">{s.count}</span>
              <span className="text-right font-mono text-[13px] tabular-nums text-muted-foreground">{s.share.toFixed(0)}%</span>
              <span
                className={cn(
                  "text-right font-mono text-[13px] tabular-nums",
                  d !== null && d >= 1 && "font-semibold text-red-700",
                  d !== null && d <= -1 && "font-semibold text-teal-700"
                )}
                title="Percentage-point change in share"
              >
                {d === null ? "" : formatPp(d)}
              </span>
            </div>
          );
        })}
        {stats.length > 0 && <GroupLegend className="pt-3" />}
      </CardContent>
    </Card>
  );
}
