/** Shared bar-sizing rules for the multi-series count charts (Leads/Policy and Detailed Breakdown). */
export function getBarSizing(activeCount: number, useLineForDaily: boolean) {
  const isSingleActive = activeCount === 1;
  const barCategoryGap = isSingleActive ? "10%" : useLineForDaily ? "8%" : "20%";
  const barGap = isSingleActive ? 0 : useLineForDaily ? 2 : 4;
  const maxBarSize =
    activeCount === 1 ? 72 : activeCount === 2 ? 40 : useLineForDaily ? 22 : undefined;
  const fixedBarSize = activeCount === 1 ? 34 : activeCount === 2 ? 22 : undefined;
  return { barCategoryGap, barGap, maxBarSize, fixedBarSize };
}
