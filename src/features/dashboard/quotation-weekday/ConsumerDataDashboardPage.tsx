import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, getISOWeek, getISOWeekYear, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ConsumerRow = {
  day: string;
  quotationCnt: number;
  requestCnt: number;
  policyCnt: number;
  newPolicyCnt: number;
  returningPolicyCnt: number;
  totalAmount: number;
  newCustomerAmount: number;
  returningCustomerAmount: number;
};

type Granularity = "day" | "week" | "month" | "year";
type PeriodMode = "full_year" | "this_month";

type SeriesPoint = {
  label: string;
  sortKey: string;
  quotationCnt: number;
  requestCnt: number;
  policyCnt: number;
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
        quotationCnt: 0,
        requestCnt: 0,
        policyCnt: 0,
        newPolicyCnt: 0,
        returningPolicyCnt: 0,
        totalCustomerCnt: 0,
        totalAmount: 0,
        newCustomerAmount: 0,
        returningCustomerAmount: 0,
      } satisfies SeriesPoint);

    current.quotationCnt += row.quotationCnt;
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
  const [expandedPanel, setExpandedPanel] = useState<"revenue" | "counts" | "newReturning" | null>(null);
  const [expandedTablePanel, setExpandedTablePanel] = useState<
    "revenue" | "counts" | "newReturning" | null
  >(null);
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
            "date,quotation_cnt,request_cnt,policy_cnt,new_policy,returning_policy,total_amount,new_customer_amount,returning_customer_amount"
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
            quotationCnt: Number(r.quotation_cnt ?? 0),
            requestCnt: Number(r.request_cnt ?? 0),
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
  const [selectedYear, setSelectedYear] = useState(String(DEFAULT_YEAR));
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("full_year");

  const yearNum = Number.parseInt(selectedYear, 10);

  const filteredRows = useMemo(() => {
    if (periodMode === "this_month") {
      const now = new Date();
      const start = format(startOfMonth(now), "yyyy-MM-dd");
      const end = format(endOfMonth(now), "yyyy-MM-dd");
      return rows.filter((r) => r.day >= start && r.day <= end);
    }
    if (!Number.isFinite(yearNum)) return [];
    if (granularity === "year") {
      return rows.filter((r) => {
        const y = parseISO(r.day).getFullYear();
        return Number.isFinite(y) && y <= yearNum;
      });
    }
    return rows.filter((r) => parseISO(r.day).getFullYear() === yearNum);
  }, [rows, yearNum, periodMode, granularity]);

  const effectiveGranularity = useMemo<Granularity>(() => {
    if (periodMode !== "this_month") return granularity;
    // In MTD mode we support day/week switching only.
    if (granularity === "day" || granularity === "week") return granularity;
    return "week";
  }, [periodMode, granularity]);

  const chartData = useMemo(
    () => aggregateBy(filteredRows, effectiveGranularity),
    [filteredRows, effectiveGranularity]
  );

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.quotationCnt += row.quotationCnt;
        acc.requestCnt += row.requestCnt;
        acc.policyCnt += row.policyCnt;
        acc.newPolicyCnt += row.newPolicyCnt;
        acc.returningPolicyCnt += row.returningPolicyCnt;
        acc.totalAmount += row.totalAmount;
        return acc;
      },
      {
        quotationCnt: 0,
        requestCnt: 0,
        policyCnt: 0,
        newPolicyCnt: 0,
        returningPolicyCnt: 0,
        totalAmount: 0,
        conversionRatePct: 0,
      }
    );
  }, [filteredRows]);

  const summaryWithConversion = useMemo(
    () => ({
      ...summary,
      newCustomerSharePct: summary.policyCnt > 0 ? (summary.newPolicyCnt / summary.policyCnt) * 100 : 0,
      returningCustomerSharePct:
        summary.policyCnt > 0 ? (summary.returningPolicyCnt / summary.policyCnt) * 100 : 0,
    }),
    [summary]
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-7xl py-8">
        <PageHeader icon={BarChart3} title="consumer data" description="" />

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
            <div className="space-y-2 min-w-0">
              <Label htmlFor="f-period">Period</Label>
              <Select
                value={periodMode}
                onValueChange={(v) => v && setPeriodMode(v as PeriodMode)}
                disabled={isLoading}
              >
                <SelectTrigger id="f-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_year">Calendar year (Day / Week / Month / Year)</SelectItem>
                  <SelectItem value="this_month">This month (MTD)</SelectItem>
                </SelectContent>
              </Select>
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
                    <BarChart data={chartData} margin={{ top: 12, right: 20, left: 20, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={90}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatKAxis(Number(v), { currency: true })}
                      />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="newCustomerAmount"
                        stackId="revenue"
                        name="Revenue new"
                        fill={COLORS.revenueNew}
                      />
                      <Bar
                        dataKey="returningCustomerAmount"
                        stackId="revenue"
                        name="Revenue returning"
                        fill={COLORS.revenueReturning}
                      />
                      <Line
                        dataKey="totalAmount"
                        name="Revenue total"
                        type="monotone"
                        stroke={COLORS.revenueTotal}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: COLORS.revenueTotal }}
                      />
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
                  <CardTitle>Quotation / Request / Policy</CardTitle>
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
                    <BarChart data={chartData} margin={{ top: 12, right: 20, left: 20, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="quotationCnt" name="Quotation count" fill={COLORS.quotations} />
                      <Bar dataKey="requestCnt" name="Request count" fill={COLORS.requests} />
                      <Bar dataKey="policyCnt" name="Policy count" fill={COLORS.policies} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!isLoading && chartData.length > 0 && (
                <ChartDataTable
                  rows={chartData}
                  title="Counts"
                  onExpandTable={() => setExpandedTablePanel("counts")}
                  columns={[
                    { key: "quotationCnt", label: "Quotation count", kind: "int" },
                    { key: "requestCnt", label: "Request count", kind: "int" },
                    { key: "policyCnt", label: "Policy count", kind: "int" },
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
                <SummaryRow title="Quotations" value={formatInt(summaryWithConversion.quotationCnt)} />
                <SummaryRow title="Requests" value={formatInt(summaryWithConversion.requestCnt)} />
                <SummaryRow title="Policies" value={formatInt(summaryWithConversion.policyCnt)} />
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
                    <BarChart data={chartData} margin={{ top: 12, right: 20, left: 20, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="newPolicyCnt" stackId="customers" name="New customers" fill={COLORS.newPolicy} />
                      <Bar
                        dataKey="returningPolicyCnt"
                        stackId="customers"
                        name="Returning customers"
                        fill={COLORS.returningPolicy}
                      />
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
                  ? "Quotation / Request / Policy"
                  : "New vs Returning Customers"}
              </DialogTitle>
              <DialogDescription>Expanded chart and data table view.</DialogDescription>
            </DialogHeader>

            {expandedPanel === "revenue" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 12, right: 20, left: 20, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={90}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatKAxis(Number(v), { currency: true })}
                      />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="newCustomerAmount"
                        stackId="revenue"
                        name="Revenue new"
                        fill={COLORS.revenueNew}
                      />
                      <Bar
                        dataKey="returningCustomerAmount"
                        stackId="revenue"
                        name="Revenue returning"
                        fill={COLORS.revenueReturning}
                      />
                      <Line
                        dataKey="totalAmount"
                        name="Revenue total"
                        type="monotone"
                        stroke={COLORS.revenueTotal}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: COLORS.revenueTotal }}
                      />
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
                    <BarChart data={chartData} margin={{ top: 12, right: 20, left: 20, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="quotationCnt" name="Quotation count" fill={COLORS.quotations} />
                      <Bar dataKey="requestCnt" name="Request count" fill={COLORS.requests} />
                      <Bar dataKey="policyCnt" name="Policy count" fill={COLORS.policies} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartDataTable
                  rows={chartData}
                  title="Counts"
                  columns={[
                    { key: "quotationCnt", label: "Quotation count", kind: "int" },
                    { key: "requestCnt", label: "Request count", kind: "int" },
                    { key: "policyCnt", label: "Policy count", kind: "int" },
                  ]}
                />
              </>
            )}

            {expandedPanel === "newReturning" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 12, right: 20, left: 20, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        width={72}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatKAxis(Number(v))}
                      />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="newPolicyCnt" stackId="customers" name="New customers" fill={COLORS.newPolicy} />
                      <Bar
                        dataKey="returningPolicyCnt"
                        stackId="customers"
                        name="Returning customers"
                        fill={COLORS.returningPolicy}
                      />
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
                  { key: "quotationCnt", label: "Quotation count", kind: "int" },
                  { key: "requestCnt", label: "Request count", kind: "int" },
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
