# Consumer Data Dashboard — Refactor Plan

`ConsumerDataDashboardPage.tsx` is ~2000 lines and does five unrelated jobs in
one file: data fetching/caching, aggregation math, per-chart interaction state,
and rendering. This plan breaks that apart. Checklist items get checked off as
each piece lands, not all at once at the end.

## Issues found and why they matter

1. **Chart JSX is duplicated 3x per chart.** Revenue, Leads/Policy, and New vs
   Returning are each rendered once inline in their card, once again in the
   "expanded" dialog, and their table once more in the "expanded table"
   dialog — ~450-500 lines of near-identical `BarChart`/`ComposedChart`/`Legend`
   JSX. The two chart copies even use different legend APIs (custom `content`
   renderer vs `formatter`+`onClick`) for identical behavior. Any chart tweak
   today means editing 2-3 places and risking them drifting out of sync.

2. **The component mixes fetching, caching, and UI.** Supabase paging,
   localStorage caching (`consumer-data-dashboard-cache-v3`), and the
   fingerprint-polling freshness check (~90 lines) live directly in the page
   component. This logic is self-contained and testable in isolation but
   currently can't be reused or tested without the whole page.

3. **Series-toggle/opacity/bar-sizing logic is duplicated 4x.** Counts,
   detailed counts, revenue, and customer series each have their own copy of
   near-identical toggle/opacity/chart-key/bar-sizing logic
   (`toggleCountSeriesSelection`, `handle*LegendClick`, `*BarOpacity`,
   `*ChartKey`, `*MaxBarSize`, etc.).

4. **Reusable pieces are stuck local to the file.** `ChartDataTable` and
   `SummaryRow` are already well-scoped components but are defined inside this
   file, alongside types, formatters (`formatInt`, `formatCurrency`,
   `formatKAxis`, `formatTooltipValue`), and `aggregateBy` — all of which have
   no dependency on the page itself.

## Target structure

Note: during implementation, the single generic `DashboardChart` originally
sketched below turned out to be the wrong shape — Revenue/Customers (simple
show-hide, isolate-on-click) and Leads-Policy/Detailed-Breakdown (opacity-fade
ghost bars, multi-toggle, dual Y-axis) differ enough in behavior that forcing
them through one generic component would have meant a large prop API doing
runtime branching instead of composition. Built instead: one small component
per distinct chart (each still used twice — inline card + expanded dialog,
so the triplication is gone), a shared `SeriesLegend` for the legend
click/dim/reset behavior all four charts have in common, and a `useSeriesToggle`
hook for the selection-state logic. Actual structure:

```
src/features/dashboard/quotation-weekday/
  ConsumerDataDashboardPage.tsx        # orchestration + layout, 1996 -> 679 lines
  plan.md
  types.ts
  utils/
    formatters.ts                     # formatInt, formatCurrency, formatKAxis, formatTooltipValue
    aggregate.ts                      # aggregateBy, yearOptionsForSelect, DEFAULT_YEAR
    colors.ts                         # COLORS palette shared by all charts
    seriesKeys.ts                     # module-level key arrays (was recreated every render before)
    yAxisMax.ts                       # computeYAxisMax, shared by all 4 charts
    barSizing.ts                      # getBarSizing, shared by Leads/Policy + Detailed Breakdown
  hooks/
    useConsumerData.ts                # Supabase fetch + localStorage cache + fingerprint polling
    useSeriesToggle.ts                # generic multi/isolate toggle + opacity + chart-key logic
  components/
    ChartDataTable.tsx
    SummaryRow.tsx
    SeriesLegend.tsx                  # shared clickable legend row
    charts/
      RevenueChart.tsx                # used inline + in expanded dialog
      LeadsPolicyChart.tsx            # used inline + in expanded dialog
      CustomersChart.tsx              # used inline + in expanded dialog
      DetailedBreakdownChart.tsx      # used once, extracted anyway for page size/readability
```

## Checklist

- [x] Extract types into `types.ts`
- [x] Extract formatters into `utils/formatters.ts`
- [x] Extract `aggregateBy` / `yearOptionsForSelect` into `utils/aggregate.ts`
- [x] Extract `useConsumerData` hook (fetch + cache + fingerprint polling)
- [x] Extract `ChartDataTable` into its own component file
- [x] Extract `SummaryRow` into its own component file
- [x] Build `useSeriesToggle` hook to unify the 4 duplicated toggle/opacity blocks
- [x] Build shared `SeriesLegend` component + per-chart components to remove chart triplication
- [x] Migrate Revenue chart (inline + expanded dialog + table dialog) to `RevenueChart.tsx`
- [x] Migrate Leads/Policy chart to `LeadsPolicyChart.tsx`
- [x] Migrate New vs Returning chart to `CustomersChart.tsx`
- [x] Migrate Detailed Breakdown (wide) chart to `DetailedBreakdownChart.tsx`
- [x] Remove now-dead inline code from `ConsumerDataDashboardPage.tsx`
- [x] Manual QA: user confirmed the dashboard (charts, legends, toggles, expand dialogs, filters) works as before
- [x] Final line-count check / cleanup pass — page is 679 lines, largest new file is 182

**Manual QA note:** the route is behind Supabase auth (`ProtectedRoute` /
`useAuth`), so headless click-through wasn't possible without credentials.
Verified mechanically first: `tsc --noEmit` clean across the project, `eslint`
shows no new issues (pre-existing `any`-cast count actually dropped from ~19
to 7 since duplicate legend blocks collapsed), and every new/changed file
was requested directly through the Vite dev server (200 OK on all 17 files),
confirming the whole module graph resolves and transforms with no import or
syntax errors. User then did the logged-in click-through (filters, legend
toggles, all three expand dialogs) and confirmed everything works.
