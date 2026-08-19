import type { Granularity, UtmVehicleCountRow, UtmVehicleCountSeriesPoint } from "../types";
import { bucketKeyAndLabel } from "./aggregate";

export function aggregateUtmVehicleCountBy(
  rows: UtmVehicleCountRow[],
  granularity: Granularity
): UtmVehicleCountSeriesPoint[] {
  const buckets = new Map<string, UtmVehicleCountSeriesPoint>();
  for (const row of rows) {
    const { sortKey, label } = bucketKeyAndLabel(row.dayDate, granularity);

    const current =
      buckets.get(sortKey) ??
      ({
        label,
        sortKey,
        totalRequests: 0,
        totalVehicleNo: 0,
        totalSales: 0,
        conversionPct: 0,
      } satisfies UtmVehicleCountSeriesPoint);

    current.totalRequests += row.totalRequests;
    current.totalVehicleNo += row.totalVehicleNo;
    current.totalSales += row.totalSales;

    buckets.set(sortKey, current);
  }

  return [...buckets.values()]
    .map((point) => ({
      ...point,
      // Weighted by vehicle volume per bucket, not a naive average of daily percentages.
      conversionPct: point.totalVehicleNo > 0 ? (point.totalSales / point.totalVehicleNo) * 100 : 0,
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
