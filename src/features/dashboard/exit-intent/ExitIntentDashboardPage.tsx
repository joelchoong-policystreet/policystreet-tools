import { useEffect, useMemo, useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SummaryRow } from "@/features/dashboard/quotation-weekday/components/SummaryRow";
import { useExitIntentData } from "./hooks/useExitIntentData";
import type { Granularity, PeriodKey } from "./types";
import {
  availableMonths,
  clusterStats,
  computedHighlights,
  countByCluster,
  formatPp,
  inPeriod,
  noteForPeriod,
  periodRangeLabel,
  previousPeriod,
  resolvePeriod,
  subclusterStats,
  trendRows,
  type TrendMeasure,
} from "./utils/aggregate";
import { dayLabel, monthLabel, monthName, timeLabel } from "./utils/dates";
import { HighlightsCard } from "./components/HighlightsCard";
import { ClusterSizesCard } from "./components/ClusterSizesCard";
import { TrendCard } from "./components/TrendCard";
import { SubclusterCard } from "./components/SubclusterCard";
import { SubmissionsCard } from "./components/SubmissionsCard";

const SHELL = "rounded-2xl border-2 border-border/80 shadow-sm overflow-hidden";

export default function ExitIntentDashboardPage() {
  const { submissions, clusters, subclusters, notes, lastSync, isLoading, isError, error } = useExitIntentData();

  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [measure, setMeasure] = useState<TrendMeasure>("rate");
  const [subCluster, setSubCluster] = useState("I");

  const months = useMemo(() => availableMonths(submissions), [submissions]);
  const period = useMemo(() => resolvePeriod(periodKey, submissions), [periodKey, submissions]);
  const prevPeriod = useMemo(() => previousPeriod(period, submissions), [period, submissions]);
  const cur = useMemo(() => inPeriod(submissions, period), [submissions, period]);
  const prev = useMemo(() => (prevPeriod ? inPeriod(submissions, prevPeriod) : null), [submissions, prevPeriod]);

  const isSingleMonth = !!period?.month;
  const effectiveGranularity: Granularity = isSingleMonth ? granularity : "month";
  useEffect(() => {
    if (!isSingleMonth && granularity !== "month") setGranularity("month");
  }, [isSingleMonth, granularity]);

  const stats = useMemo(() => clusterStats(clusters, cur, prev), [clusters, cur, prev]);
  const compareLabel = prevPeriod?.month ? monthName(prevPeriod.month) : null;
  const compareShort = prevPeriod?.month ? monthLabel(prevPeriod.month, "short").split(" ")[0] : null;

  const note = noteForPeriod(notes, period);
  const highlights = useMemo(
    () => (period ? note?.items ?? computedHighlights(stats, subclusters, cur, period, prev, prevPeriod) : []),
    [note, stats, subclusters, cur, period, prev, prevPeriod]
  );
  const highlightsTitle = note?.title ?? (period?.month ? `${monthName(period.month)} at a glance` : "Since launch at a glance");
  const highlightsDesc = note
    ? `${note.subtitle ?? ""}${note.subtitle ? " · " : ""}${note.isFinal ? "final" : `as of ${dayLabel(note.asOf.toISOString().slice(0, 10))}`} · updated weekly by the Exit Intent sync`
    : "Generated from the data — no written notes for this period";

  const trend = useMemo(
    () => (period ? trendRows(submissions, clusters, period, effectiveGranularity, measure) : []),
    [submissions, clusters, period, effectiveGranularity, measure]
  );

  const subRows = useMemo(() => subclusterStats(subclusters, subCluster, cur, prev), [subclusters, subCluster, cur, prev]);
  const subClusterOptions = useMemo(
    () => clusters.filter((c) => subclusters.some((s) => s.clusterCode === c.code)),
    [clusters, subclusters]
  );

  const perDay = period ? cur.length / period.days : 0;
  const prevPerDay = prev && prevPeriod ? prev.length / prevPeriod.days : null;
  const priority = stats.filter((s) => s.cluster.isPriority).reduce((n, s) => n + s.count, 0);
  const riser = stats.filter((s) => s.delta !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];
  const noise = stats.find((s) => s.cluster.code === "U");
  const latest = submissions[submissions.length - 1];

  const lastSyncedLabel = lastSync
    ? `last synced ${dayLabel(lastSync.ranAt.toISOString().slice(0, 10), true)}, ${timeLabel(lastSync.ranAt)}`
    : latest
      ? `latest submission ${dayLabel(latest.day, true)}, ${timeLabel(latest.submittedAt)}`
      : "not synced yet";

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-7xl py-8">
        <PageHeader
          icon={MessageSquareWarning}
          title="Exit Intent Feedback"
          description={`From #exit-intent-submission-notification · ${lastSyncedLabel} · refreshed every Monday`}
        />

        {isError && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">
              {(error as Error)?.message ?? "Failed to load exit-intent data."}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">View filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 md:items-end">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="ei-period">Period</Label>
              <Select value={periodKey} onValueChange={setPeriodKey} disabled={isLoading || months.length === 0}>
                <SelectTrigger id="ei-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month (MTD)</SelectItem>
                  <SelectItem value="previous_month">Previous month</SelectItem>
                  {months
                    .slice()
                    .reverse()
                    .map((m) => (
                      <SelectItem key={m} value={`month:${m}`}>
                        {monthLabel(m)}
                      </SelectItem>
                    ))}
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label className="text-muted-foreground">Compared with</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {prevPeriod?.month ? `${monthLabel(prevPeriod.month)} (previous month)` : "— (no earlier period)"}
              </div>
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Granularity</Label>
              <ToggleGroup
                type="single"
                value={effectiveGranularity}
                onValueChange={(v) => v && setGranularity(v as Granularity)}
                className="grid w-full grid-cols-3 gap-1.5"
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="day" className="w-full justify-center" disabled={!isSingleMonth}>
                  Day
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="w-full justify-center" disabled={!isSingleMonth}>
                  Week
                </ToggleGroupItem>
                <ToggleGroupItem value="month" className="w-full justify-center">
                  Month
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex h-[420px] items-center justify-center text-muted-foreground">Loading exit-intent data…</div>
        ) : !period ? (
          <div className="flex h-[420px] items-center justify-center text-muted-foreground">
            No submissions yet. The weekly sync fills this table from Slack.
          </div>
        ) : (
          <div className="space-y-10">
            <HighlightsCard title={highlightsTitle} description={highlightsDesc} items={highlights} />

            <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
              <ClusterSizesCard stats={stats} compareLabel={compareLabel} />
              <Card className={SHELL}>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>Overall totals for {periodRangeLabel(period)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <SummaryRow title="Submissions" value={cur.length.toLocaleString()} />
                  <SummaryRow
                    title={prevPerDay !== null ? `Per day (vs ${prevPerDay.toFixed(1)} in ${compareLabel})` : "Per day"}
                    value={perDay.toFixed(1)}
                  />
                  <SummaryRow
                    title="Per-day change vs previous period"
                    value={prevPerDay ? `${perDay >= prevPerDay ? "+" : ""}${Math.round((perDay / prevPerDay - 1) * 100)}%` : "—"}
                  />
                  <SummaryRow
                    title="★ Priority clusters (insurer + Agreed Value)"
                    value={`${priority} · ${cur.length ? ((100 * priority) / cur.length).toFixed(0) : 0}%`}
                  />
                  <SummaryRow title="Top cluster" value={stats[0] ? `${stats[0].cluster.name} (${stats[0].count})` : "—"} />
                  <SummaryRow
                    title="Biggest riser"
                    value={riser && (riser.delta ?? 0) > 0 ? `${riser.cluster.name} (${formatPp(riser.delta!)})` : "—"}
                  />
                  <SummaryRow
                    title="Actionable feedback"
                    value={`${(100 - (noise?.share ?? 0)).toFixed(0)}% · ${noise?.count ?? 0} not actionable`}
                  />
                </CardContent>
              </Card>
            </div>

            <TrendCard rows={trend} granularity={effectiveGranularity} measure={measure} onMeasureChange={setMeasure} />

            <SubclusterCard
              clusters={subClusterOptions}
              value={subCluster}
              onChange={setSubCluster}
              rows={subRows}
              clusterCount={countByCluster(cur)[subCluster] ?? 0}
              rangeLabel={periodRangeLabel(period)}
              compareLabel={compareLabel}
            />

            <SubmissionsCard
              submissions={cur}
              clusters={clusters}
              subclusters={subclusters}
              prevCounts={prev ? countByCluster(prev) : null}
              compareShort={compareShort}
            />
          </div>
        )}
      </main>
    </div>
  );
}
