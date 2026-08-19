/** Max active-series value across the chart data, padded 10% and floored at 10. */
export function computeYAxisMax<T, K extends keyof T>(chartData: T[], activeKeys: readonly K[]): number {
  let maxVal = 0;
  for (const row of chartData) {
    for (const key of activeKeys) {
      const value = Number(row[key] ?? 0);
      if (value > maxVal) maxVal = value;
    }
  }
  if (maxVal <= 0) return 10;
  return Math.ceil(maxVal * 1.1);
}
