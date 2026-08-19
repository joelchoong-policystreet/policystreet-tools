import type { Granularity, QuotationConversionRow, QuotationConversionSeriesPoint } from "../types";
import { bucketKeyAndLabel } from "./aggregate";

type Bucket = QuotationConversionSeriesPoint & {
  /** Running weighted sums, divided down to averages once every row is folded in. */
  insurersConvertedWeightedSum: number;
  insurersNotConvertedWeightedSum: number;
};

export function aggregateQuotationConversionBy(
  rows: QuotationConversionRow[],
  granularity: Granularity
): QuotationConversionSeriesPoint[] {
  const buckets = new Map<string, Bucket>();
  for (const row of rows) {
    const { sortKey, label } = bucketKeyAndLabel(row.dayDate, granularity);

    const current =
      buckets.get(sortKey) ??
      ({
        label,
        sortKey,
        convertedRequests: 0,
        notConvertedRequests: 0,
        totalRequests: 0,
        avgInsurersConverted: 0,
        avgInsurersNotConverted: 0,
        insurersConvertedWeightedSum: 0,
        insurersNotConvertedWeightedSum: 0,
      } satisfies Bucket);

    current.convertedRequests += row.convertedRequests;
    current.notConvertedRequests += row.notConvertedRequests;
    current.totalRequests += row.totalRequests;
    current.insurersConvertedWeightedSum += row.avgInsurersConverted * row.convertedRequests;
    current.insurersNotConvertedWeightedSum += row.avgInsurersNotConverted * row.notConvertedRequests;

    buckets.set(sortKey, current);
  }

  return [...buckets.values()]
    .map((point) => ({
      label: point.label,
      sortKey: point.sortKey,
      convertedRequests: point.convertedRequests,
      notConvertedRequests: point.notConvertedRequests,
      totalRequests: point.totalRequests,
      // Weighted by request volume per bucket, not a naive average of daily averages.
      avgInsurersConverted:
        point.convertedRequests > 0 ? point.insurersConvertedWeightedSum / point.convertedRequests : 0,
      avgInsurersNotConverted:
        point.notConvertedRequests > 0
          ? point.insurersNotConvertedWeightedSum / point.notConvertedRequests
          : 0,
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
