import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, getISOWeek, getISOWeekYear, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Maximize2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DateRange } from "react-day-picker";

type ConsumerRow = {
  day: string;
  leadsCnt: number;
  policyCnt: number;
  newPolicyCnt: number;
  returningPolicyCnt: number;
  totalAmount: number;
  newCustomerAmount: number;
  returningCustomerAmount: number;
};

type Granularity = "day" | "week" | "month" | "year";
type PeriodMode = "full_year" | "this_month" | "custom_range";
type CountSeriesKey = "leadsCnt" | "policyCnt";
type CountLegendSeriesKey = CountSeriesKey | "conversionRatePct";
type RevenueSeriesKey = "newCustomerAmount" | "returningCustomerAmount" | "totalAmount";
type CustomerSeriesKey = "newPolicyCnt" | "returningPolicyCnt";

type SeriesPoint = {
  label: string;
  sortKey: string;
  leadsCnt: number;
  policyCnt: number;
  conversionRatePct: number;
  newPolicyCnt: number;
  returningPolicyCnt: number;
  totalCustomerCnt: number;
  totalAmount: number;
  newCustomerAmount: number;
  returningCustomerAmount: number;
};

const TABLE_NAME = "consumer_data_daily";
const DEFAULT_YEAR = 2026;
const QUADRANT_CARD_HEIGHT_CLASS = "h-[700px]";
const QUADRANT_CARD_SHELL_CLASS =
  "rounded-2xl border-2 border-border/80 bg-card shadow-sm overflow-hidden";
const IN_CARD_CHART_AREA_CLASS = "flex-1 min-h-[320px]";

const COLORS = {
  quotations: "hsl(221.2 83.2% 53.3%)",
  requests: "hsl(142.1 70.6% 45.3%)",
  policies: "hsl(37.7 92.1% 50.2%)",
  newPolicy: "hsl(262.1 83.3% 57.8%)",
  returningPolicy: "hsl(191 85% 42%)",
  revenueTotal: "hsl(24.6 95% 53.1%)",
  revenueNew: "hsl(158.1 64.4% 51.6%)",
  revenueReturning: "hsl(336.2 79.2% 57.8%)",
} as const;

const REVENUE_LEGEND_PAYLOAD = [
  { value: "Revenue new", type: "square", id: "newCustomerAmount", color: COLORS.revenueNew, dataKey: "newCustomerAmount" },
  {
    value: "Revenue returning",
    type: "square",
    id: "returningCustomerAmount",
    color: COLORS.revenueReturning,
    dataKey: "returningCustomerAmount",
  },
  { value: "Revenue total", type: "line", id: "totalAmount", color: COLORS.revenueTotal, dataKey: "totalAmount" },
] as const;

const COUNTS_LEGEND_PAYLOAD = [
  { value: "Leads count", type: "square", id: "leadsCnt", color: COLORS.quotations, dataKey: "leadsCnt" },
  { value: "Policy count", type: "square", id: "policyCnt", color: COLORS.policies, dataKey: "policyCnt" },
  {
    value: "Conversion rate",
    type: "line",
    id: "conversionRatePct",
    color: COLORS.requests,
    dataKey: "conversionRatePct",
  },
] as const;

const CUSTOMERS_LEGEND_PAYLOAD = [
  { value: "New customers", type: "square", id: "newPolicyCnt", color: COLORS.newPolicy, dataKey: "newPolicyCnt" },
  {
    value: "Returning customers",
    type: "square",
    id: "returningPolicyCnt",
    color: COLORS.returningPolicy,
    dataKey: "returningPolicyCnt",
  },
] as const;

function formatInt(n: number) {
  return n.toLocaleString();
}

function formatCurrency(n: number) {
  return `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyChart(n: number) {
  return `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatKAxis(n: number, opts?: { currency?: boolean }) {
  const abs = Math.abs(n);
  const prefix = opts?.currency ? "RM " : "";
  if (abs >= 1_000_000) {
    const inM = n / 1_000_000;
    const rounded =
      Math.abs(inM) >= 100
        ? inM.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : inM.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return `${prefix}${rounded}M`;
  }
  if (abs >= 1000) {
    const inK = n / 1000;
    const rounded =
      Math.abs(inK) >= 100
        ? inK.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : inK.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return `${prefix}${rounded}K`;
  }
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatTooltipValue(value: unknown, name: unknown) {
  const n = Number(value ?? 0);
  const label = String(name ?? "");
  const isRevenue =
    label.toLowerCase().includes("revenue") ||
    label.toLowerCase().includes("amount");
  if (isRevenue) return [formatCurrency(n), label];
  return [n.toLocaleString(undefined, { maximumFractionDigits: 2 }), label];
}

function yearOptionsForSelect(rows: ConsumerRow[]): number[] {
  let minY = DEFAULT_YEAR;
  let maxY = DEFAULT_YEAR;
  for (const r of rows) {
    const d = parseISO(r.day);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const min = Math.min(minY, 2015);
  const max = Math.max(maxY, DEFAULT_YEAR);
  const options: number[] = [];
  for (let y = min; y <= max; y++) options.push(y);
  return options;
}

function aggregateBy(rows: ConsumerRow[], granularity: Granularity): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint>();
  for (const row of rows) {
    const d = parseISO(row.day);
    if (Number.isNaN(d.getTime())) continue;

    let sortKey = "";
    let label = "";
    if (granularity === "year") {
      sortKey = String(d.getFullYear());
      label = sortKey;
    } else if (granularity === "day") {
      sortKey = format(d, "yyyy-MM-dd");
      label = format(d, "d MMM");
    } else if (granularity === "month") {
      sortKey = format(d, "yyyy-MM");
      label = format(d, "MMM");
    } else {
      const isoYear = getISOWeekYear(d);
      const isoWeek = getISOWeek(d);
      sortKey = `${isoYear}-${String(isoWeek).padStart(2, "0")}`;
      label = `W${String(isoWeek).padStart(2, "0")}`;
    }

    const current =
      buckets.get(sortKey) ??
      ({
        label,
        sortKey,
        leadsCnt: 0,
        policyCnt: 0,
        conversionRatePct: 0,
        newPolicyCnt: 0,
        returningPolicyCnt: 0,
        totalCustomerCnt: 0,
        totalAmount: 0,
        newCustomerAmount: 0,
        returningCustomerAmount: 0,
      } satisfies SeriesPoint);

    current.leadsCnt += row.leadsCnt;
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
      conversionRatePct: point.leadsCnt > 0 ? (point.policyCnt / point.leadsCnt) * 100 : 0,
      totalCustomerCnt: point.newPolicyCnt + point.returningPolicyCnt,
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function SummaryRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background/70 px-3 py-2.5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-base font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ChartDataTable({
  rows,
  columns,
  title,
  onExpandTable,
  maxHeightClassName,
}: {
  rows: SeriesPoint[];
  columns: { key: keyof SeriesPoint; label: string; kind?: "int" | "currency" | "pct" }[];
  title?: string;
  onExpandTable?: () => void;
  maxHeightClassName?: string;
}) {
  const sortedRows = [...rows].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return (
    <div className="mt-0 rounded-b-lg border-t bg-muted/10 overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title ? `${title} Table` : "Data Table"}
        </p>
        <div className="flex items-center gap-2">
          {onExpandTable && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onExpandTable}>
              <Maximize2 className="h-3.5 w-3.5" />
              Expand table
            </Button>
          )}
        </div>
      </div>
      <div className={`${maxHeightClassName ?? "max-h-[160px]"} overflow-y-auto bg-background`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/70 hover:bg-muted/70">
            <TableHead className="sticky top-0 z-10 bg-muted/90 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              Period
            </TableHead>
            {columns.map((c) => (
              <TableHead
                key={String(c.key)}
                className="sticky top-0 z-10 bg-muted/90 text-right text-xs font-semibold uppercase tracking-wide text-foreground/80"
              >
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((r, idx) => (
            <TableRow
              key={r.sortKey}
              className={idx % 2 === 0 ? "bg-background/80" : "bg-background/40"}
            >
              <TableCell className="text-sm font-medium">{r.label}</TableCell>
              {columns.map((c) => {
                const raw = Number(r[c.key] ?? 0);
                const text =
                  c.kind === "currency"
                    ? formatCurrency(raw)
                    : c.kind === "pct"
                    ? `${raw.toFixed(2)}%`
                    : formatInt(raw);
                return (
                  <TableCell key={String(c.key)} className="text-right text-sm font-mono tabular-nums">
                    {text}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="h-2 border-t bg-muted/30" />
    </div>
  );
}

export default function ConsumerDataDashboardPage() {
  const COUNT_SERIES_KEYS: CountSeriesKey[] = ["leadsCnt", "policyCnt"];
  const REVENUE_SERIES_KEYS: RevenueSeriesKey[] = [
    "newCustomerAmount",
    "returningCustomerAmount",
    "totalAmount",
  ];
  const CUSTOMER_SERIES_KEYS: CustomerSeriesKey[] = ["newPolicyCnt", "returningPolicyCnt"];

  const [expandedPanel, setExpandedPanel] = useState<"revenue" | "counts" | "newReturning" | null>(null);
  const [expandedTablePanel, setExpandedTablePanel] = useState<
    "revenue" | "counts" | "newReturning" | null
  >(null);
  const [activeCountSeries, setActiveCountSeries] = useState<CountSeriesKey[]>(COUNT_SERIES_KEYS);
  const [activeRevenueSeries, setActiveRevenueSeries] = useState<RevenueSeriesKey[]>(REVENUE_SERIES_KEYS);
  const [activeCustomerSeries, setActiveCustomerSeries] =
    useState<CustomerSeriesKey[]>(CUSTOMER_SERIES_KEYS);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["consumer-data-dashboard", TABLE_NAME],
    queryFn: async () => {
      const pageSize = 1000;
      const allRows: any[] = [];
      let from = 0;
      while (true) {
        const to = from + pageSize - 1;
        const { data, error } = await (supabase as any)
          .from(TABLE_NAME)
          .select(
            "date,leads_cnt,policy_cnt,new_policy,returning_policy,total_amount,new_customer_amount,returning_customer_amount"
          )
          .order("date", { ascending: true })
          .range(from, to);
        if (error) throw error;
        const page = data ?? [];
        allRows.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      return allRows
        .map((r) => {
          const day = String(r.date ?? "").trim().slice(0, 10);
          const row = {
            day,
            leadsCnt: Number(r.leads_cnt ?? 0),
            policyCnt: Number(r.policy_cnt ?? 0),
            newPolicyCnt: Number(r.new_policy ?? 0),
            returningPolicyCnt: Number(r.returning_policy ?? 0),
            totalAmount: Number(r.total_amount ?? 0),
            newCustomerAmount: Number(r.new_customer_amount ?? 0),
            returningCustomerAmount: Number(r.returning_customer_amount ?? 0),
          } satisfies ConsumerRow;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
          return row;
        })
        .filter(Boolean) as ConsumerRow[];
    },
  });

  const rows = data ?? [];
  const yearOptions = useMemo(() => yearOptionsForSelect(rows), [rows]);
  const availableDateRange = useMemo(() => {
    if (rows.length === 0) return { min: "", max: "" };
    const sortedDays = rows.map((r) => r.day).sort();
    return {
      min: sortedDays[0] ?? "",
      max: sortedDays[sortedDays.length - 1] ?? "",
    };
  }, [rows]);
  const [selectedYear, setSelectedYear] = useState(String(DEFAULT_YEAR));
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("full_year");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customRangeDropdownOpen, setCustomRangeDropdownOpen] = useState(false);
  const customRangePanelRef = useRef<HTMLDivElement | null>(null);
  const customRangeLabel = useMemo(() => {
    if (!customRange?.from) return "Custom range";
    if (!customRange.to) return `Custom: ${format(customRange.from, "dd/MM/yyyy")}`;
    return `Custom: ${format(customRange.from, "dd/MM/yyyy")} - ${format(customRange.to, "dd/MM/yyyy")}`;
  }, [customRange]);

  useEffect(() => {
    if (!customRangeDropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (customRangePanelRef.current?.contains(target)) return;
      setCustomRangeDropdownOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [customRangeDropdownOpen]);

  const yearNum = Number.parseInt(selectedYear, 10);

  const filteredRows = useMemo(() => {
    if (periodMode === "this_month") {
      const now = new Date();
      const start = format(startOfMonth(now), "yyyy-MM-dd");
      const end = format(endOfMonth(now), "yyyy-MM-dd");
      return rows.filter((r) => r.day >= start && r.day <= end);
    }
    if (periodMode === "custom_range") {
      const selectedStart = customRange?.from ? format(customRange.from, "yyyy-MM-dd") : "";
      const selectedEnd = customRange?.to
        ? format(customRange.to, "yyyy-MM-dd")
        : selectedStart;
      const start = selectedStart || availableDateRange.min;
      const end = selectedEnd || availableDateRange.max;
      if (!start) return [];
      if (!end) return rows.filter((r) => r.day >= start);
      const from = start <= end ? start : end;
      const to = start <= end ? end : start;
      return rows.filter((r) => r.day >= from && r.day <= to);
    }
    if (!Number.isFinite(yearNum)) return [];
    if (granularity === "year") {
      return rows.filter((r) => {
        const y = parseISO(r.day).getFullYear();
        return Number.isFinite(y) && y <= yearNum;
      });
    }
    return rows.filter((r) => parseISO(r.day).getFullYear() === yearNum);
  }, [rows, yearNum, periodMode, granularity, customRange, availableDateRange]);

  const effectiveGranularity = useMemo<Granularity>(() => {
    if (periodMode === "full_year") return granularity;
    // In MTD and custom range mode we support day/week switching only.
    if (granularity === "day" || granularity === "week") return granularity;
    return "week";
  }, [periodMode, granularity]);

  const chartData = useMemo(
    () => aggregateBy(filteredRows, effectiveGranularity),
    [filteredRows, effectiveGranularity]
  );

  const validActiveCountSeries = useMemo(
    () => activeCountSeries.filter((k): k is CountSeriesKey => COUNT_SERIES_KEYS.includes(k)),
    [activeCountSeries]
  );
  const effectiveActiveCountSeries =
    validActiveCountSeries.length > 0 ? validActiveCountSeries : COUNT_SERIES_KEYS;

  const countsYAxisMax = useMemo(() => {
    const activeKeys: CountSeriesKey[] = effectiveActiveCountSeries;

    let maxVal = 0;
    for (const row of chartData) {
      for (const key of activeKeys) {
        const value = Number(row[key] ?? 0);
        if (value > maxVal) maxVal = value;
      }
    }

    if (maxVal <= 0) return 10;
    return Math.ceil(maxVal * 1.1);
  }, [chartData, effectiveActiveCountSeries]);

  const validActiveRevenueSeries = useMemo(
    () => activeRevenueSeries.filter((k): k is RevenueSeriesKey => REVENUE_SERIES_KEYS.includes(k)),
    [activeRevenueSeries]
  );
  const effectiveActiveRevenueSeries =
    validActiveRevenueSeries.length > 0 ? validActiveRevenueSeries : REVENUE_SERIES_KEYS;

  const revenueYAxisMax = useMemo(() => {
    const activeKeys: RevenueSeriesKey[] = effectiveActiveRevenueSeries;

    let maxVal = 0;
    for (const row of chartData) {
      for (const key of activeKeys) {
        const value = Number(row[key] ?? 0);
        if (value > maxVal) maxVal = value;
      }
    }

    if (maxVal <= 0) return 10;
    return Math.ceil(maxVal * 1.1);
  }, [chartData, effectiveActiveRevenueSeries]);

  const validActiveCustomerSeries = useMemo(
    () => activeCustomerSeries.filter((k): k is CustomerSeriesKey => CUSTOMER_SERIES_KEYS.includes(k)),
    [activeCustomerSeries]
  );
  const effectiveActiveCustomerSeries =
    validActiveCustomerSeries.length > 0 ? validActiveCustomerSeries : CUSTOMER_SERIES_KEYS;

  const customerYAxisMax = useMemo(() => {
    const activeKeys: CustomerSeriesKey[] = effectiveActiveCustomerSeries;

    let maxVal = 0;
    for (const row of chartData) {
      for (const key of activeKeys) {
        const value = Number(row[key] ?? 0);
        if (value > maxVal) maxVal = value;
      }
    }

    if (maxVal <= 0) return 10;
    return Math.ceil(maxVal * 1.1);
  }, [chartData, effectiveActiveCustomerSeries]);

  const handleCountLegendClick = (key: CountSeriesKey) => {
    setActiveCountSeries([key]);
  };
  const getCountLegendKey = (legendPayload: any): CountSeriesKey | null => {
    const rawKey = String(legendPayload?.dataKey ?? legendPayload?.payload?.dataKey ?? "").trim();
    if (rawKey === "leadsCnt" || rawKey === "policyCnt") return rawKey;
    const rawValue = String(legendPayload?.value ?? legendPayload?.payload?.value ?? "")
      .trim()
      .toLowerCase();
    if (rawValue === "leads count") return "leadsCnt";
    if (rawValue === "policy count") return "policyCnt";
    return null;
  };
  const handleRevenueLegendClick = (key: RevenueSeriesKey) => {
    setActiveRevenueSeries([key]);
  };
  const handleCustomerLegendClick = (key: CustomerSeriesKey) => {
    setActiveCustomerSeries([key]);
  };

  const showLeadsSeries = effectiveActiveCountSeries.includes("leadsCnt");
  const showPolicySeries = effectiveActiveCountSeries.includes("policyCnt");
  const showRevenueNewSeries = effectiveActiveRevenueSeries.includes("newCustomerAmount");
  const showRevenueReturningSeries = effectiveActiveRevenueSeries.includes("returningCustomerAmount");
  const showRevenueTotalSeries = effectiveActiveRevenueSeries.includes("totalAmount");
  const showNewCustomerSeries = effectiveActiveCustomerSeries.includes("newPolicyCnt");
  const showReturningCustomerSeries = effectiveActiveCustomerSeries.includes("returningPolicyCnt");
  const useLineForDailyCounts = effectiveGranularity === "day";
  const hasPartialCountSelection = effectiveActiveCountSeries.length < COUNT_SERIES_KEYS.length;
  const leadsBarOpacity = showLeadsSeries ? 1 : hasPartialCountSelection ? 0.08 : 0.28;
  const policyBarOpacity = showPolicySeries ? 1 : hasPartialCountSelection ? 0.08 : 0.28;
  const countsChartKey = `counts:${effectiveActiveCountSeries.slice().sort().join("|")}`;
  const revenueChartKey = `revenue:${effectiveActiveRevenueSeries.slice().sort().join("|")}`;
  const customersChartKey = `customers:${effectiveActiveCustomerSeries.slice().sort().join("|")}`;
  const isCountsFiltered = effectiveActiveCountSeries.length !== COUNT_SERIES_KEYS.length;
  const isRevenueFiltered = effectiveActiveRevenueSeries.length !== REVENUE_SERIES_KEYS.length;
  const isCustomersFiltered = effectiveActiveCustomerSeries.length !== CUSTOMER_SERIES_KEYS.length;
  const countsChartData = useMemo(
    () =>
      chartData.map((row) => ({
        ...row,
        leadsCnt: showLeadsSeries ? row.leadsCnt : 0,
        policyCnt: showPolicySeries ? row.policyCnt : 0,
      })),
    [chartData, showLeadsSeries, showPolicySeries]
  );
  const resetCountsSeries = () => setActiveCountSeries(COUNT_SERIES_KEYS);
  const resetRevenueSeries = () => setActiveRevenueSeries(REVENUE_SERIES_KEYS);
  const resetCustomerSeries = () => setActiveCustomerSeries(CUSTOMER_SERIES_KEYS);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.leadsCnt += row.leadsCnt;
        acc.policyCnt += row.policyCnt;
        acc.newPolicyCnt += row.newPolicyCnt;
        acc.returningPolicyCnt += row.returningPolicyCnt;
        acc.totalAmount += row.totalAmount;
        return acc;
      },
      {
        leadsCnt: 0,
        policyCnt: 0,
        conversionRatePct: 0,
        newPolicyCnt: 0,
        returningPolicyCnt: 0,
        totalAmount: 0,
      }
    );
  }, [filteredRows]);

  const summaryWithConversion = useMemo(
    () => ({
      ...summary,
      conversionRatePct: summary.leadsCnt > 0 ? (summary.policyCnt / summary.leadsCnt) * 100 : 0,
      newCustomerSharePct: summary.policyCnt > 0 ? (summary.newPolicyCnt / summary.policyCnt) * 100 : 0,
      returningCustomerSharePct:
        summary.policyCnt > 0 ? (summary.returningPolicyCnt / summary.policyCnt) * 100 : 0,
    }),
    [summary]
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-7xl py-8">
        <PageHeader icon={BarChart3} title="Consumer Sales" description="" />

        {isError && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">
              {(error as Error)?.message ?? "Failed to load data."}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">View filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1.1fr_0.7fr_2.2fr] md:items-end">
            <div className="space-y-2 min-w-0 relative">
              <Label htmlFor="f-period">Period</Label>
              <Select
                value={periodMode}
                onValueChange={(v) => {
                  if (!v) return;
                  const nextMode = v as PeriodMode;
                  setPeriodMode(nextMode);
                  if (nextMode === "custom_range") {
                    setTimeout(() => setCustomRangeDropdownOpen(true), 0);
                  } else {
                    setCustomRangeDropdownOpen(false);
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="f-period">
                  {periodMode === "custom_range" ? (
                    <span className="truncate">{customRangeLabel}</span>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_year">Calendar year (Day / Week / Month / Year)</SelectItem>
                  <SelectItem value="this_month">This month (MTD)</SelectItem>
                  <SelectItem value="custom_range">Custom range</SelectItem>
                </SelectContent>
              </Select>
              {periodMode === "custom_range" && customRangeDropdownOpen && (
                <div
                  ref={customRangePanelRef}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
                >
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={2}
                    defaultMonth={customRange?.from}
                    disabled={
                      availableDateRange.min && availableDateRange.max
                        ? {
                            before: parseISO(availableDateRange.min),
                            after: parseISO(availableDateRange.max),
                          }
                        : undefined
                    }
                  />
                  <div className="flex items-center justify-end border-t px-2 pb-1 pt-2">
                    <Button size="sm" onClick={() => setCustomRangeDropdownOpen(false)}>
                      Confirm
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <Label htmlFor="f-year" className={periodMode !== "full_year" ? "text-muted-foreground" : ""}>
                Year
              </Label>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
                disabled={isLoading || periodMode !== "full_year"}
              >
                <SelectTrigger id="f-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-0">
              <Label>Granularity</Label>
              <ToggleGroup
                type="single"
                value={effectiveGranularity}
                onValueChange={(v) => v && setGranularity(v as Granularity)}
                className="grid w-full grid-cols-4 gap-1.5"
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="day" className="w-full justify-center">
                  Day
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="w-full justify-center">
                  Week
                </ToggleGroupItem>
                {periodMode === "full_year" && (
                  <ToggleGroupItem value="month" className="w-full justify-center">
                    Month
                  </ToggleGroupItem>
                )}
                {periodMode === "full_year" && (
                  <ToggleGroupItem value="year" className="w-full justify-center">
                    Year
                  </ToggleGroupItem>
                )}
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
          <div className="space-y-12">
          <Card className={`${QUADRANT_CARD_HEIGHT_CLASS} ${QUADRANT_CARD_SHELL_CLASS} flex flex-col`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Revenue (Total / New / Returning)</CardTitle>
                  <CardDescription>Stacked new/returning with total line</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedPanel("revenue")}
                  disabled={isLoading || chartData.length === 0}
                >
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {isLoading ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  Loading chart…
                </div>
              ) : chartData.length === 0 ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  No data for selected filters.
                </div>
              ) : (
                <div className={`${IN_CARD_CHART_AREA_CLASS} w-full min-w-0`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={revenueChartKey}
                      data={chartData}
                      margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={90}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, revenueYAxisMax]}
                        tickFormatter={(v) => formatKAxis(Number(v), { currency: true })}
                      />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend
                        payload={REVENUE_LEGEND_PAYLOAD as any}
                        content={({ payload }) => (
                          <div className="relative flex items-center justify-center gap-2 px-2 text-xs">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                              {(payload ?? []).map((entry: any) => {
                                const key = String(entry?.dataKey ?? "") as RevenueSeriesKey;
                                const isActive = effectiveActiveRevenueSeries.includes(key);
                                const isLine = String(entry?.type ?? "") === "line";
                                return (
                                  <button
                                    key={`${key}-${String(entry?.value ?? "")}`}
                                    type="button"
                                    className="inline-flex items-center gap-1.5"
                                    onClick={() => handleRevenueLegendClick(key)}
                                  >
                                    {isLine ? (
                                      <span
                                        className="inline-block h-0.5 w-3 rounded"
                                        style={{ backgroundColor: String(entry?.color ?? "#8884d8") }}
                                      />
                                    ) : (
                                      <span
                                        className="inline-block h-2.5 w-2.5 rounded-sm"
                                        style={{ backgroundColor: String(entry?.color ?? "#8884d8") }}
                                      />
                                    )}
                                    <span style={{ color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                                      {String(entry?.value ?? "")}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {isRevenueFiltered && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute right-0 h-7 px-2.5"
                                onClick={resetRevenueSeries}
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        )}
                      />
                      {showRevenueNewSeries && (
                        <Bar
                          dataKey="newCustomerAmount"
                          stackId="revenue"
                          name="Revenue new"
                          fill={COLORS.revenueNew}
                          fillOpacity={1}
                          onClick={() => handleRevenueLegendClick("newCustomerAmount")}
                        />
                      )}
                      {showRevenueReturningSeries && (
                        <Bar
                          dataKey="returningCustomerAmount"
                          stackId="revenue"
                          name="Revenue returning"
                          fill={COLORS.revenueReturning}
                          fillOpacity={1}
                          onClick={() => handleRevenueLegendClick("returningCustomerAmount")}
                        />
                      )}
                      {showRevenueTotalSeries && (
                        <Line
                          dataKey="totalAmount"
                          name="Revenue total"
                          type="monotone"
                          stroke={COLORS.revenueTotal}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: COLORS.revenueTotal }}
                          onClick={() => handleRevenueLegendClick("totalAmount")}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!isLoading && chartData.length > 0 && (
                <ChartDataTable
                  rows={chartData}
                  title="Revenue"
                  onExpandTable={() => setExpandedTablePanel("revenue")}
                  columns={[
                    { key: "newCustomerAmount", label: "Revenue new", kind: "currency" },
                    { key: "returningCustomerAmount", label: "Revenue returning", kind: "currency" },
                    { key: "totalAmount", label: "Revenue total", kind: "currency" },
                  ]}
                />
              )}
            </CardContent>
          </Card>
          <Card className={`${QUADRANT_CARD_HEIGHT_CLASS} ${QUADRANT_CARD_SHELL_CLASS} flex flex-col`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Leads / Policy</CardTitle>
                  <CardDescription />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedPanel("counts")}
                  disabled={isLoading || chartData.length === 0}
                >
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {isLoading ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  Loading chart…
                </div>
              ) : chartData.length === 0 ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  No data for selected filters.
                </div>
              ) : (
                <div className={`${IN_CARD_CHART_AREA_CLASS} w-full min-w-0`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      key={countsChartKey}
                      data={countsChartData}
                      barCategoryGap={useLineForDailyCounts ? "8%" : "20%"}
                      barGap={useLineForDailyCounts ? 2 : 4}
                      margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        yAxisId="left"
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, countsYAxisMax]}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        width={52}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, "auto"]}
                        tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                      />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend
                        payload={COUNTS_LEGEND_PAYLOAD as any}
                        content={({ payload }) => (
                          <div className="relative flex items-center justify-center gap-2 px-2 text-xs">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                              {(payload ?? []).map((entry: any) => {
                                const key = String(entry?.dataKey ?? "") as CountLegendSeriesKey;
                                const isClickable = key === "leadsCnt" || key === "policyCnt";
                                const isActive =
                                  key === "conversionRatePct" || effectiveActiveCountSeries.includes(key);
                                const isLine = String(entry?.type ?? "") === "line";
                                return (
                                  <button
                                    key={`${key}-${String(entry?.value ?? "")}`}
                                    type="button"
                                    className="inline-flex items-center gap-1.5"
                                    onClick={() => isClickable && handleCountLegendClick(key as CountSeriesKey)}
                                  >
                                    {isLine ? (
                                      <span
                                        className="inline-block h-0.5 w-3 rounded"
                                        style={{ backgroundColor: String(entry?.color ?? "#8884d8") }}
                                      />
                                    ) : (
                                      <span
                                        className="inline-block h-2.5 w-2.5 rounded-sm"
                                        style={{ backgroundColor: String(entry?.color ?? "#8884d8") }}
                                      />
                                    )}
                                    <span style={{ color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                                      {String(entry?.value ?? "")}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {isCountsFiltered && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute right-0 h-7 px-2.5"
                                onClick={resetCountsSeries}
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        )}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="leadsCnt"
                        name="Leads count"
                        fill={COLORS.quotations}
                        fillOpacity={leadsBarOpacity}
                        opacity={leadsBarOpacity}
                        stroke={showLeadsSeries ? COLORS.quotations : "transparent"}
                        strokeWidth={showLeadsSeries ? 1.25 : 0}
                        minPointSize={useLineForDailyCounts ? 3 : 0}
                        maxBarSize={useLineForDailyCounts ? 22 : undefined}
                        onClick={() => handleCountLegendClick("leadsCnt")}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="policyCnt"
                        name="Policy count"
                        fill={COLORS.policies}
                        fillOpacity={policyBarOpacity}
                        opacity={policyBarOpacity}
                        stroke={showPolicySeries ? COLORS.policies : "transparent"}
                        strokeWidth={showPolicySeries ? 1.25 : 0}
                        minPointSize={useLineForDailyCounts ? 3 : 0}
                        maxBarSize={useLineForDailyCounts ? 22 : undefined}
                        onClick={() => handleCountLegendClick("policyCnt")}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="conversionRatePct"
                        name="Conversion rate"
                        stroke={COLORS.requests}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!isLoading && chartData.length > 0 && (
                <ChartDataTable
                  rows={chartData}
                  title="Counts"
                  onExpandTable={() => setExpandedTablePanel("counts")}
                  columns={[
                    { key: "leadsCnt", label: "Leads count", kind: "int" },
                    { key: "policyCnt", label: "Policy count", kind: "int" },
                    { key: "conversionRatePct", label: "Conversion rate", kind: "pct" },
                  ]}
                />
              )}
            </CardContent>
          </Card>
          </div>

          <div className="space-y-12">
          <Card className={`${QUADRANT_CARD_HEIGHT_CLASS} ${QUADRANT_CARD_SHELL_CLASS} flex flex-col`}>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Overall totals for selected filter range</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-2">
                <SummaryRow title="Leads (Unique Vehicle Num)" value={formatInt(summaryWithConversion.leadsCnt)} />
                <SummaryRow title="Policies" value={formatInt(summaryWithConversion.policyCnt)} />
                <SummaryRow
                  title="Conversion rate (Unique Leads/Policy)"
                  value={`${summaryWithConversion.conversionRatePct.toFixed(2)}%`}
                />
                <SummaryRow title="New customers" value={formatInt(summaryWithConversion.newPolicyCnt)} />
                <SummaryRow title="Returning customers" value={formatInt(summaryWithConversion.returningPolicyCnt)} />
                <SummaryRow
                  title="(New/Returning)/Total Policies"
                  value={`${summaryWithConversion.newCustomerSharePct.toFixed(2)}% / ${summaryWithConversion.returningCustomerSharePct.toFixed(2)}%`}
                />
                <SummaryRow title="Revenue total" value={formatCurrency(summaryWithConversion.totalAmount)} />
              </div>
            </CardContent>
          </Card>

          <Card className={`${QUADRANT_CARD_HEIGHT_CLASS} ${QUADRANT_CARD_SHELL_CLASS} flex flex-col`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>New vs Returning Customers</CardTitle>
                  <CardDescription />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedPanel("newReturning")}
                  disabled={isLoading || chartData.length === 0}
                >
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {isLoading ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  Loading chart…
                </div>
              ) : chartData.length === 0 ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  No data for selected filters.
                </div>
              ) : (
                <div className={`${IN_CARD_CHART_AREA_CLASS} w-full min-w-0`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={customersChartKey}
                      data={chartData}
                      margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, customerYAxisMax]}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <Tooltip />
                      <Legend
                        payload={CUSTOMERS_LEGEND_PAYLOAD as any}
                        content={({ payload }) => (
                          <div className="relative flex items-center justify-center gap-2 px-2 text-xs">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                              {(payload ?? []).map((entry: any) => {
                                const key = String(entry?.dataKey ?? "") as CustomerSeriesKey;
                                const isActive = effectiveActiveCustomerSeries.includes(key);
                                return (
                                  <button
                                    key={`${key}-${String(entry?.value ?? "")}`}
                                    type="button"
                                    className="inline-flex items-center gap-1.5"
                                    onClick={() => handleCustomerLegendClick(key)}
                                  >
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-sm"
                                      style={{ backgroundColor: String(entry?.color ?? "#8884d8") }}
                                    />
                                    <span style={{ color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                                      {String(entry?.value ?? "")}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {isCustomersFiltered && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute right-0 h-7 px-2.5"
                                onClick={resetCustomerSeries}
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        )}
                      />
                      {showNewCustomerSeries && (
                        <Bar
                          dataKey="newPolicyCnt"
                          stackId="customers"
                          name="New customers"
                          fill={COLORS.newPolicy}
                          fillOpacity={1}
                          onClick={() => handleCustomerLegendClick("newPolicyCnt")}
                        />
                      )}
                      {showReturningCustomerSeries && (
                        <Bar
                          dataKey="returningPolicyCnt"
                          stackId="customers"
                          name="Returning customers"
                          fill={COLORS.returningPolicy}
                          fillOpacity={1}
                          onClick={() => handleCustomerLegendClick("returningPolicyCnt")}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!isLoading && chartData.length > 0 && (
                <ChartDataTable
                  rows={chartData}
                  title="New vs Returning Customers"
                  onExpandTable={() => setExpandedTablePanel("newReturning")}
                  columns={[
                    { key: "newPolicyCnt", label: "New customers", kind: "int" },
                    { key: "returningPolicyCnt", label: "Returning customers", kind: "int" },
                    { key: "totalCustomerCnt", label: "Total customers", kind: "int" },
                  ]}
                />
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        <Dialog open={expandedPanel !== null} onOpenChange={(open) => !open && setExpandedPanel(null)}>
          <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {expandedPanel === "revenue"
                  ? "Revenue (Total / New / Returning)"
                  : expandedPanel === "counts"
                  ? "Leads / Policy"
                  : "New vs Returning Customers"}
              </DialogTitle>
              <DialogDescription>Expanded chart and data table view.</DialogDescription>
            </DialogHeader>

            {expandedPanel === "revenue" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={revenueChartKey}
                      data={chartData}
                      margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={90}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, revenueYAxisMax]}
                        tickFormatter={(v) => formatKAxis(Number(v), { currency: true })}
                      />
                      <Tooltip />
                      <Legend
                        payload={REVENUE_LEGEND_PAYLOAD as any}
                        wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
                        formatter={(value, entry) => {
                          const key = String(entry.dataKey ?? "") as RevenueSeriesKey;
                          const isActive = effectiveActiveRevenueSeries.includes(key);
                          return (
                            <span
                              style={{
                                color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {String(value)}
                            </span>
                          );
                        }}
                        onClick={(payload) => {
                          const key = String(payload?.dataKey ?? "") as RevenueSeriesKey;
                          if (
                            key === "newCustomerAmount" ||
                            key === "returningCustomerAmount" ||
                            key === "totalAmount"
                          ) {
                            handleRevenueLegendClick(key);
                          }
                        }}
                      />
                      {showRevenueNewSeries && (
                        <Bar
                          dataKey="newCustomerAmount"
                          stackId="revenue"
                          name="Revenue new"
                          fill={COLORS.revenueNew}
                          fillOpacity={1}
                          onClick={() => handleRevenueLegendClick("newCustomerAmount")}
                        />
                      )}
                      {showRevenueReturningSeries && (
                        <Bar
                          dataKey="returningCustomerAmount"
                          stackId="revenue"
                          name="Revenue returning"
                          fill={COLORS.revenueReturning}
                          fillOpacity={1}
                          onClick={() => handleRevenueLegendClick("returningCustomerAmount")}
                        />
                      )}
                      {showRevenueTotalSeries && (
                        <Line
                          dataKey="totalAmount"
                          name="Revenue total"
                          type="monotone"
                          stroke={COLORS.revenueTotal}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: COLORS.revenueTotal }}
                          onClick={() => handleRevenueLegendClick("totalAmount")}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartDataTable
                  rows={chartData}
                  title="Revenue"
                  columns={[
                    { key: "newCustomerAmount", label: "Revenue new", kind: "currency" },
                    { key: "returningCustomerAmount", label: "Revenue returning", kind: "currency" },
                    { key: "totalAmount", label: "Revenue total", kind: "currency" },
                  ]}
                />
              </>
            )}

            {expandedPanel === "counts" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      key={countsChartKey}
                      data={countsChartData}
                      barCategoryGap={useLineForDailyCounts ? "8%" : "20%"}
                      barGap={useLineForDailyCounts ? 2 : 4}
                      margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        yAxisId="left"
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, countsYAxisMax]}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        width={52}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, "auto"]}
                        tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                      />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend
                        payload={COUNTS_LEGEND_PAYLOAD as any}
                        wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
                        formatter={(value, entry) => {
                          const key = String(entry.dataKey ?? "") as CountLegendSeriesKey;
                          const isActive =
                            key === "conversionRatePct" || effectiveActiveCountSeries.includes(key);
                          return (
                            <span
                              style={{
                                color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {String(value)}
                            </span>
                          );
                        }}
                        onClick={(payload) => {
                          const key = getCountLegendKey(payload);
                          if (key) {
                            handleCountLegendClick(key);
                          }
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="leadsCnt"
                        name="Leads count"
                        fill={COLORS.quotations}
                        fillOpacity={leadsBarOpacity}
                        opacity={leadsBarOpacity}
                        stroke={showLeadsSeries ? COLORS.quotations : "transparent"}
                        strokeWidth={showLeadsSeries ? 1.25 : 0}
                        minPointSize={useLineForDailyCounts ? 3 : 0}
                        maxBarSize={useLineForDailyCounts ? 22 : undefined}
                        onClick={() => handleCountLegendClick("leadsCnt")}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="policyCnt"
                        name="Policy count"
                        fill={COLORS.policies}
                        fillOpacity={policyBarOpacity}
                        opacity={policyBarOpacity}
                        stroke={showPolicySeries ? COLORS.policies : "transparent"}
                        strokeWidth={showPolicySeries ? 1.25 : 0}
                        minPointSize={useLineForDailyCounts ? 3 : 0}
                        maxBarSize={useLineForDailyCounts ? 22 : undefined}
                        onClick={() => handleCountLegendClick("policyCnt")}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="conversionRatePct"
                        name="Conversion rate"
                        stroke={COLORS.requests}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <ChartDataTable
                  rows={chartData}
                  title="Counts"
                  columns={[
                    { key: "leadsCnt", label: "Leads count", kind: "int" },
                    { key: "policyCnt", label: "Policy count", kind: "int" },
                    { key: "conversionRatePct", label: "Conversion rate", kind: "pct" },
                  ]}
                />
              </>
            )}

            {expandedPanel === "newReturning" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={customersChartKey}
                      data={chartData}
                      margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, customerYAxisMax]}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <Tooltip />
                      <Legend
                        payload={CUSTOMERS_LEGEND_PAYLOAD as any}
                        wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
                        formatter={(value, entry) => {
                          const key = String(entry.dataKey ?? "") as CustomerSeriesKey;
                          const isActive = effectiveActiveCustomerSeries.includes(key);
                          return (
                            <span
                              style={{
                                color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {String(value)}
                            </span>
                          );
                        }}
                        onClick={(payload) => {
                          const key = String(payload?.dataKey ?? "") as CustomerSeriesKey;
                          if (key === "newPolicyCnt" || key === "returningPolicyCnt") {
                            handleCustomerLegendClick(key);
                          }
                        }}
                      />
                      {showNewCustomerSeries && (
                        <Bar
                          dataKey="newPolicyCnt"
                          stackId="customers"
                          name="New customers"
                          fill={COLORS.newPolicy}
                          fillOpacity={1}
                          onClick={() => handleCustomerLegendClick("newPolicyCnt")}
                        />
                      )}
                      {showReturningCustomerSeries && (
                        <Bar
                          dataKey="returningPolicyCnt"
                          stackId="customers"
                          name="Returning customers"
                          fill={COLORS.returningPolicy}
                          fillOpacity={1}
                          onClick={() => handleCustomerLegendClick("returningPolicyCnt")}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartDataTable
                  rows={chartData}
                  title="New vs Returning Customers"
                  columns={[
                    { key: "newPolicyCnt", label: "New customers", kind: "int" },
                    { key: "returningPolicyCnt", label: "Returning customers", kind: "int" },
                    { key: "totalCustomerCnt", label: "Total customers", kind: "int" },
                  ]}
                />
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={expandedTablePanel !== null}
          onOpenChange={(open) => !open && setExpandedTablePanel(null)}
        >
          <DialogContent className="w-[98vw] max-w-[1600px] max-h-[95vh] overflow-auto p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>
                {expandedTablePanel === "revenue"
                  ? "Revenue Table"
                  : expandedTablePanel === "counts"
                  ? "Counts Table"
                  : "New vs Returning Customers Table"}
              </DialogTitle>
              <DialogDescription>Expanded table-only view.</DialogDescription>
            </DialogHeader>

            {expandedTablePanel === "revenue" && (
              <ChartDataTable
                rows={chartData}
                title="Revenue"
                maxHeightClassName="max-h-[72vh]"
                columns={[
                  { key: "newCustomerAmount", label: "Revenue new", kind: "currency" },
                  { key: "returningCustomerAmount", label: "Revenue returning", kind: "currency" },
                  { key: "totalAmount", label: "Revenue total", kind: "currency" },
                ]}
              />
            )}

            {expandedTablePanel === "counts" && (
              <ChartDataTable
                rows={chartData}
                title="Counts"
                maxHeightClassName="max-h-[72vh]"
                columns={[
                  { key: "leadsCnt", label: "Leads count", kind: "int" },
                  { key: "policyCnt", label: "Policy count", kind: "int" },
                  { key: "conversionRatePct", label: "Conversion rate", kind: "pct" },
                ]}
              />
            )}

            {expandedTablePanel === "newReturning" && (
              <ChartDataTable
                rows={chartData}
                title="New vs Returning"
                maxHeightClassName="max-h-[72vh]"
                columns={[
                  { key: "newPolicyCnt", label: "New policy", kind: "int" },
                  { key: "returningPolicyCnt", label: "Returning policy", kind: "int" },
                ]}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
