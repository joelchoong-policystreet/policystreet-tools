import type { Cluster, Granularity, GroupKey, MonthNote, NoteItem, Period, PeriodKey, Subcluster, Submission } from "../types";
import { GROUP_ORDER, GROUPS } from "./colors";
import {
  addDays,
  dayLabel,
  daysBetweenInclusive,
  monthEnd,
  monthLabel,
  monthName,
  monthStart,
  prevMonth,
  weekStart,
} from "./dates";

/* ------------------------------------------------------------------ periods */

export function availableMonths(subs: Submission[]): string[] {
  return Array.from(new Set(subs.map((s) => s.month))).sort();
}

function monthPeriod(key: PeriodKey, month: string, subs: Submission[], label?: string): Period {
  const inMonth = subs.filter((s) => s.month === month);
  const first = subs[0]?.day ?? monthStart(month);
  const last = subs[subs.length - 1]?.day ?? monthEnd(month);
  // Days the form was live within this month: never before launch, never after the latest synced post.
  const fromDay = monthStart(month) < first ? first : monthStart(month);
  const toDay = monthEnd(month) > last ? last : monthEnd(month);
  return {
    key,
    label: label ?? monthLabel(month),
    months: [month],
    fromDay,
    toDay: inMonth.length ? toDay : fromDay,
    days: inMonth.length ? daysBetweenInclusive(fromDay, toDay) : 1,
    month,
  };
}

export function resolvePeriod(key: PeriodKey, subs: Submission[]): Period | null {
  const months = availableMonths(subs);
  if (months.length === 0) return null;
  const latest = months[months.length - 1];
  if (key === "this_month") return monthPeriod(key, latest, subs, `${monthLabel(latest)} (MTD)`);
  if (key === "previous_month") {
    const m = prevMonth(latest);
    return months.includes(m) ? monthPeriod(key, m, subs) : null;
  }
  if (key.startsWith("month:")) {
    const m = key.slice(6);
    return months.includes(m) ? monthPeriod(key, m, subs) : null;
  }
  const fromDay = subs[0].day;
  const toDay = subs[subs.length - 1].day;
  return { key: "all", label: "All time", months, fromDay, toDay, days: daysBetweenInclusive(fromDay, toDay), month: null };
}

export function previousPeriod(p: Period | null, subs: Submission[]): Period | null {
  if (!p?.month) return null;
  const m = prevMonth(p.month);
  return availableMonths(subs).includes(m) ? monthPeriod(`month:${m}`, m, subs) : null;
}

export function inPeriod(subs: Submission[], p: Period | null): Submission[] {
  if (!p) return [];
  return subs.filter((s) => s.day >= p.fromDay && s.day <= p.toDay);
}

export function periodRangeLabel(p: Period): string {
  const isPartial = p.month !== null && p.toDay < monthEnd(p.month);
  return `${dayLabel(p.fromDay)} – ${dayLabel(p.toDay, true)} (${p.days} day${p.days === 1 ? "" : "s"}${isPartial ? ", month to date" : ""})`;
}

/* ------------------------------------------------------------------ counts */

export type ClusterStat = {
  cluster: Cluster;
  count: number;
  share: number;
  prevCount: number | null;
  prevShare: number | null;
  /** Change in share, percentage points. */
  delta: number | null;
};

export function countByCluster(subs: Submission[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of subs) out[s.clusterCode] = (out[s.clusterCode] ?? 0) + 1;
  return out;
}

export function clusterStats(clusters: Cluster[], cur: Submission[], prev: Submission[] | null): ClusterStat[] {
  const c = countByCluster(cur);
  const p = prev ? countByCluster(prev) : null;
  return clusters
    .map((cluster) => {
      const count = c[cluster.code] ?? 0;
      const share = cur.length ? (100 * count) / cur.length : 0;
      const prevCount = p ? p[cluster.code] ?? 0 : null;
      const prevShare = p && prev!.length ? (100 * (prevCount ?? 0)) / prev!.length : p ? 0 : null;
      return { cluster, count, share, prevCount, prevShare, delta: prevShare === null ? null : share - prevShare };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function formatPp(d: number): string {
  const r = Math.round(d * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r).toFixed(1)} pp`;
}

export type SubclusterStat = { sub: Subcluster; count: number; prevCount: number | null };

export function subclusterStats(
  subclusters: Subcluster[],
  clusterCode: string,
  cur: Submission[],
  prev: Submission[] | null
): SubclusterStat[] {
  const count = (list: Submission[], id: number) =>
    list.reduce((n, s) => n + (s.clusterCode === clusterCode && s.subclusterId === id ? 1 : 0), 0);
  return subclusters
    .filter((s) => s.clusterCode === clusterCode)
    .map((sub) => ({ sub, count: count(cur, sub.id), prevCount: prev ? count(prev, sub.id) : null }))
    .filter((r) => r.count > 0 || (r.prevCount ?? 0) > 0)
    .sort((a, b) => b.count - a.count || (b.prevCount ?? 0) - (a.prevCount ?? 0));
}

/* ------------------------------------------------------------------ trend */

export type TrendMeasure = "rate" | "share";

export type TrendRow = {
  label: string;
  sortKey: string;
  total: number;
  highlighted: boolean;
} & Record<GroupKey, number>;

export function trendRows(
  all: Submission[],
  clusters: Cluster[],
  period: Period,
  granularity: Granularity,
  measure: TrendMeasure
): TrendRow[] {
  const groupOf = new Map(clusters.map((c) => [c.code, c.groupKey]));
  type Bucket = { label: string; sortKey: string; days: number; highlighted: boolean; counts: Record<GroupKey, number>; n: number };
  const buckets = new Map<string, Bucket>();
  const empty = () => Object.fromEntries(GROUP_ORDER.map((g) => [g, 0])) as Record<GroupKey, number>;

  let source = all;
  if (granularity === "month") {
    for (const m of availableMonths(all)) {
      const mp = monthPeriod(`month:${m}`, m, all);
      buckets.set(m, {
        label: monthLabel(m, "short").split(" ")[0] + (mp.toDay < monthEnd(m) ? " (MTD)" : ""),
        sortKey: m,
        days: mp.days,
        highlighted: period.months.includes(m),
        counts: empty(),
        n: 0,
      });
    }
  } else {
    source = inPeriod(all, period);
    for (let d = period.fromDay; d <= period.toDay; d = addDays(d, 1)) {
      const key = granularity === "day" ? d : weekStart(d);
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: granularity === "day" ? dayLabel(d) : `Wk of ${dayLabel(key)}`,
          sortKey: key,
          days: 0,
          highlighted: true,
          counts: empty(),
          n: 0,
        });
      }
      buckets.get(key)!.days += 1;
    }
  }

  for (const s of source) {
    const key = granularity === "month" ? s.month : granularity === "day" ? s.day : weekStart(s.day);
    const b = buckets.get(key);
    const g = groupOf.get(s.clusterCode);
    if (!b || !g) continue;
    b.counts[g] += 1;
    b.n += 1;
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((b) => {
      const vals = empty();
      for (const g of GROUP_ORDER) {
        const raw = b.counts[g];
        vals[g] =
          measure === "share"
            ? b.n ? (100 * raw) / b.n : 0
            : granularity === "month"
              ? raw / Math.max(1, b.days)
              : raw;
      }
      const total = GROUP_ORDER.reduce((t, g) => t + vals[g], 0);
      return { label: b.label, sortKey: b.sortKey, total, highlighted: b.highlighted, ...vals };
    });
}

/* ------------------------------------------------------------------ highlights */

export function noteForPeriod(notes: MonthNote[], p: Period | null): MonthNote | null {
  if (!p?.month) return null;
  return notes.find((n) => n.month === p.month) ?? null;
}

/** Fallback highlights computed from the data when no analyst note exists (e.g. "All time"). */
export function computedHighlights(
  stats: ClusterStat[],
  subclusters: Subcluster[],
  cur: Submission[],
  period: Period,
  prev: Submission[] | null,
  prevPeriod: Period | null
): NoteItem[] {
  const items: NoteItem[] = [];
  if (!cur.length) return items;
  const perDay = cur.length / period.days;
  if (prev && prevPeriod) {
    const prevPerDay = prev.length / prevPeriod.days;
    const pct = Math.round((perDay / prevPerDay - 1) * 100);
    items.push({
      h: `Volume ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}% per day`,
      b: `${perDay.toFixed(1)} submissions a day vs ${prevPerDay.toFixed(1)} in ${monthName(prevPeriod.month!)}.`,
    });
  } else {
    items.push({
      h: `${cur.length.toLocaleString()} submissions`,
      b: `About ${perDay.toFixed(1)} a day across ${period.days} days.`,
    });
  }
  const [top, second] = stats;
  if (top) {
    items.push({
      h: `${top.cluster.name} is the biggest cluster`,
      b: `${top.count} submissions (${top.share.toFixed(0)}%)${second ? `, ahead of ${second.cluster.name.toLowerCase()} (${second.count}).` : "."}`,
    });
  }
  const risers = stats.filter((s) => (s.delta ?? 0) >= 1).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  if (risers[0]) {
    const r = risers[0];
    items.push({ h: `${r.cluster.name} is rising`, b: `Share ${r.prevShare!.toFixed(0)}% → ${r.share.toFixed(0)}% (${formatPp(r.delta!)}).` });
  }
  const insurer = subclusterStats(subclusters, "I", cur, null)[0];
  if (insurer) items.push({ h: `Most-asked insurer: ${insurer.sub.name}`, b: `${insurer.count} requests in this period.` });
  const noise = stats.find((s) => s.cluster.code === "U");
  items.push({
    h: "Share that's actionable",
    b: `${(100 - (noise?.share ?? 0)).toFixed(0)}% of submissions name something a team can act on.`,
  });
  return items.slice(0, 6);
}

export function groupLabel(g: GroupKey) {
  return GROUPS[g].label;
}
