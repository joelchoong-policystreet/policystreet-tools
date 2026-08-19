import { format, getISOWeek, getISOWeekYear } from "date-fns";
import type { ConsumerRow, Granularity, SeriesPoint } from "../types";

export const DEFAULT_YEAR = 2026;

export function yearOptionsForSelect(rows: { year: number }[]): number[] {
  let minY = DEFAULT_YEAR;
  let maxY = DEFAULT_YEAR;
  for (const r of rows) {
    const y = r.year;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const min = Math.min(minY, 2015);
  const max = Math.max(maxY, DEFAULT_YEAR);
  const options: number[] = [];
  for (let y = min; y <= max; y++) options.push(y);
  return options;
}

/** Shared by every per-row aggregator: which period bucket a date falls into at this granularity. */
export function bucketKeyAndLabel(d: Date, granularity: Granularity): { sortKey: string; label: string } {
  if (granularity === "year") {
    const sortKey = String(d.getFullYear());
    return { sortKey, label: sortKey };
  }
  if (granularity === "day") {
    return { sortKey: format(d, "yyyy-MM-dd"), label: format(d, "d MMM") };
  }
  if (granularity === "month") {
    return { sortKey: format(d, "yyyy-MM"), label: format(d, "MMM") };
  }
  const isoYear = getISOWeekYear(d);
  const isoWeek = getISOWeek(d);
  return {
    sortKey: `${isoYear}-${String(isoWeek).padStart(2, "0")}`,
    label: `W${String(isoWeek).padStart(2, "0")}`,
  };
}

export function aggregateBy(rows: ConsumerRow[], granularity: Granularity): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint>();
  for (const row of rows) {
    const { sortKey, label } = bucketKeyAndLabel(row.dayDate, granularity);

    const current =
      buckets.get(sortKey) ??
      ({
        label,
        sortKey,
        newLeadsCnt: 0,
        requestCnt: 0,
        policyCnt: 0,
        conversionRatePct: 0,
        newPolicyCnt: 0,
        returningPolicyCnt: 0,
        totalCustomerCnt: 0,
        totalAmount: 0,
        newCustomerAmount: 0,
        returningCustomerAmount: 0,
      } satisfies SeriesPoint);

    current.newLeadsCnt += row.newLeadsCnt;
    current.requestCnt += row.requestCnt;
    current.policyCnt += row.policyCnt;
    current.newPolicyCnt += row.newPolicyCnt;
    current.returningPolicyCnt += row.returningPolicyCnt;
    current.totalAmount += row.totalAmount;
    current.newCustomerAmount += row.newCustomerAmount;
    current.returningCustomerAmount += row.returningCustomerAmount;

    buckets.set(sortKey, current);
  }

  return [...buckets.values()]
    .map((point) => ({
      ...point,
      conversionRatePct: point.newLeadsCnt > 0 ? (point.policyCnt / point.newLeadsCnt) * 100 : 0,
      totalCustomerCnt: point.newPolicyCnt + point.returningPolicyCnt,
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
