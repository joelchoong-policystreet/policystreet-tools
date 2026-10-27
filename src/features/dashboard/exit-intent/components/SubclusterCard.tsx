import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Cluster } from "../types";
import type { SubclusterStat } from "../utils/aggregate";
import { groupColor } from "../utils/colors";
import { InfoTip } from "./InfoTip";

export function SubclusterCard({
  clusters,
  value,
  onChange,
  rows,
  clusterCount,
  rangeLabel,
  compareLabel,
}: {
  clusters: Cluster[];
  value: string;
  onChange: (code: string) => void;
  rows: SubclusterStat[];
  clusterCount: number;
  rangeLabel: string;
  compareLabel: string | null;
}) {
  const current = clusters.find((c) => c.code === value);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="rounded-2xl border-2 border-border/80 shadow-sm overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Inside a cluster</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-foreground">{current?.name}</span>
              <InfoTip text={current?.description} label={current?.name ?? "cluster"} />
              <span>· {clusterCount} submissions in {rangeLabel}</span>
            </CardDescription>
            {current?.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{current.description}</p>}
          </div>
          <div className="w-full space-y-1.5 sm:w-64">
            <Label htmlFor="ei-subcluster" className="text-xs uppercase tracking-wide text-muted-foreground">
              Cluster
            </Label>
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger id="ei-subcluster">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clusters.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                    {c.isPriority ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No sub-cluster data for this period.</p>}
        {rows.map((r) => (
          <div key={r.sub.id} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_40px_52px] items-center gap-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate" title={r.sub.name}>
                {r.sub.name}
              </span>
              <InfoTip text={r.sub.description} label={r.sub.name} />
            </span>
            <div className="h-3.5 overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded"
                style={{ width: `${Math.max(1.5, (100 * r.count) / max)}%`, backgroundColor: current ? groupColor(current.groupKey) : undefined }}
              />
            </div>
            <span className="text-right font-mono text-[13px] tabular-nums">{r.count}</span>
            <span className="text-right font-mono text-[13px] tabular-nums text-muted-foreground">{r.prevCount ?? ""}</span>
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          {compareLabel ? `Second number = ${compareLabel}. ` : ""}Sub-clusters are tagged automatically, so treat them as approximate.
        </p>
      </CardContent>
    </Card>
  );
}
