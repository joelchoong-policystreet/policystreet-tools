import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import type {
  Granularity,
  PeriodMode,
  CountSeriesKey,
  RevenueSeriesKey,
  CustomerSeriesKey,
  InsurerSeriesKey,
  UtmVehicleCountSeriesKey,
} from "./types";
import { formatInt, formatCurrency } from "./utils/formatters";
import { DEFAULT_YEAR, yearOptionsForSelect, aggregateBy } from "./utils/aggregate";
import { aggregateQuotationConversionBy } from "./utils/aggregateQuotationConversion";
import { aggregateUtmVehicleCountBy } from "./utils/aggregateUtmVehicleCount";
import { filterRowsByPeriod, computeAvailableDateRange } from "./utils/filterByPeriod";
import {
  COUNT_SERIES_KEYS,
  LEADS_POLICY_SERIES_KEYS,
  REVENUE_SERIES_KEYS,
  CUSTOMER_SERIES_KEYS,
  INSURER_SERIES_KEYS,
  UTM_VEHICLE_COUNT_SERIES_KEYS,
} from "./utils/seriesKeys";
import { computeYAxisMax } from "./utils/yAxisMax";
import { useConsumerData } from "./hooks/useConsumerData";
import { useQuotationConversionData } from "./hooks/useQuotationConversionData";
import { useUtmVehicleCountData } from "./hooks/useUtmVehicleCountData";
import { useSeriesToggle } from "./hooks/useSeriesToggle";
import { ChartDataTable } from "./components/ChartDataTable";
import { SummaryRow } from "./components/SummaryRow";
import { RevenueChart } from "./components/charts/RevenueChart";
import { LeadsPolicyChart } from "./components/charts/LeadsPolicyChart";
import { CustomersChart } from "./components/charts/CustomersChart";
import { DetailedBreakdownChart } from "./components/charts/DetailedBreakdownChart";
import { InsurersComparisonChart } from "./components/charts/InsurersComparisonChart";
import { UtmVehicleCountChart } from "./components/charts/UtmVehicleCountChart";

const QUADRANT_CARD_HEIGHT_CLASS = "h-[700px]";
const QUADRANT_CARD_SHELL_CLASS =
  "rounded-2xl border-2 border-border/80 bg-card shadow-sm overflow-hidden";
const IN_CARD_CHART_AREA_CLASS = "flex-1 min-h-[320px]";

type ExpandedPanel = "revenue" | "counts" | "newReturning" | "insurers" | "utmVehicleCount";

export default function ConsumerDataDashboardPage() {
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel | null>(null);
  const [expandedTablePanel, setExpandedTablePanel] = useState<ExpandedPanel | null>(null);

  const countsToggle = useSeriesToggle<CountSeriesKey>(LEADS_POLICY_SERIES_KEYS, "multi");
  const detailedCountsToggle = useSeriesToggle<CountSeriesKey>(COUNT_SERIES_KEYS, "multi");
  const revenueToggle = useSeriesToggle<RevenueSeriesKey>(REVENUE_SERIES_KEYS, "isolate");
  const customersToggle = useSeriesToggle<CustomerSeriesKey>(CUSTOMER_SERIES_KEYS, "isolate");
  const insurersToggle = useSeriesToggle<InsurerSeriesKey>(INSURER_SERIES_KEYS, "isolate");
  const utmVehicleCountToggle = useSeriesToggle<UtmVehicleCountSeriesKey>(
    UTM_VEHICLE_COUNT_SERIES_KEYS,
    "multi"
  );

  const { rows, isLoading, isError, error } = useConsumerData();
  const {
    rows: quotationRows,
    isLoading: isQuotationLoading,
    isError: isQuotationError,
    error: quotationError,
  } = useQuotationConversionData();
  const {
    rows: utmVehicleCountRows,
    isLoading: isUtmVehicleCountLoading,
    isError: isUtmVehicleCountError,
    error: utmVehicleCountError,
  } = useUtmVehicleCountData();
  const yearOptions = useMemo(
    () => yearOptionsForSelect([...rows, ...quotationRows, ...utmVehicleCountRows]),
    [rows, quotationRows, utmVehicleCountRows]
  );
  const availableDateRange = useMemo(() => computeAvailableDateRange(rows), [rows]);
  const quotationAvailableDateRange = useMemo(
    () => computeAvailableDateRange(quotationRows),
    [quotationRows]
  );
  const utmVehicleCountAvailableDateRange = useMemo(
    () => computeAvailableDateRange(utmVehicleCountRows),
    [utmVehicleCountRows]
  );
  const [selectedYear, setSelectedYear] = useState(String(DEFAULT_YEAR));
  useEffect(() => {
    if (yearOptions.length === 0) return;
    if (yearOptions.includes(Number.parseInt(selectedYear, 10))) return;
    setSelectedYear(String(yearOptions[yearOptions.length - 1]));
  }, [yearOptions, selectedYear]);

  const [granularity, setGranularity] = useState<Granularity>("month");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("full_year");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customRangeDropdownOpen, setCustomRangeDropdownOpen] = useState(false);
  const customRangePanelRef = useRef<HTMLDivElement | null>(null);
  const wideCountsScrollRef = useRef<HTMLDivElement | null>(null);
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

  const filteredRows = useMemo(
    () =>
      filterRowsByPeriod(rows, { periodMode, granularity, yearNum, customRange, availableDateRange }),
    [rows, yearNum, periodMode, granularity, customRange, availableDateRange]
  );

  const quotationFilteredRows = useMemo(
    () =>
      filterRowsByPeriod(quotationRows, {
        periodMode,
        granularity,
        yearNum,
        customRange,
        availableDateRange: quotationAvailableDateRange,
      }),
    [quotationRows, yearNum, periodMode, granularity, customRange, quotationAvailableDateRange]
  );

  const utmVehicleCountFilteredRows = useMemo(
    () =>
      filterRowsByPeriod(utmVehicleCountRows, {
        periodMode,
        granularity,
        yearNum,
        customRange,
        availableDateRange: utmVehicleCountAvailableDateRange,
      }),
    [
      utmVehicleCountRows,
      yearNum,
      periodMode,
      granularity,
      customRange,
      utmVehicleCountAvailableDateRange,
    ]
  );

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

  const quotationChartData = useMemo(
    () => aggregateQuotationConversionBy(quotationFilteredRows, effectiveGranularity),
    [quotationFilteredRows, effectiveGranularity]
  );

  const utmVehicleCountChartData = useMemo(
    () => aggregateUtmVehicleCountBy(utmVehicleCountFilteredRows, effectiveGranularity),
    [utmVehicleCountFilteredRows, effectiveGranularity]
  );

  useEffect(() => {
    const container = wideCountsScrollRef.current;
    if (!container) return;
    const rafId = window.requestAnimationFrame(() => {
      container.scrollLeft = container.scrollWidth;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [chartData]);

  const useLineForDailyCounts = effectiveGranularity === "day";

  const revenueYAxisMax = useMemo(
    () => computeYAxisMax(chartData, revenueToggle.effectiveActive),
    [chartData, revenueToggle.effectiveActive]
  );
  const countsYAxisMax = useMemo(
    () => computeYAxisMax(chartData, countsToggle.effectiveActive),
    [chartData, countsToggle.effectiveActive]
  );
  const detailedCountsYAxisMax = useMemo(
    () => computeYAxisMax(chartData, detailedCountsToggle.effectiveActive),
    [chartData, detailedCountsToggle.effectiveActive]
  );
  const customerYAxisMax = useMemo(
    () => computeYAxisMax(chartData, customersToggle.effectiveActive),
    [chartData, customersToggle.effectiveActive]
  );
  const insurersYAxisMax = useMemo(
    () => computeYAxisMax(quotationChartData, insurersToggle.effectiveActive),
    [quotationChartData, insurersToggle.effectiveActive]
  );
  const utmVehicleCountYAxisMax = useMemo(
    () => computeYAxisMax(utmVehicleCountChartData, utmVehicleCountToggle.effectiveActive),
    [utmVehicleCountChartData, utmVehicleCountToggle.effectiveActive]
  );

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.requestCnt += row.requestCnt;
        acc.newLeadsCnt += row.newLeadsCnt;
        acc.policyCnt += row.policyCnt;
        acc.newPolicyCnt += row.newPolicyCnt;
        acc.returningPolicyCnt += row.returningPolicyCnt;
        acc.totalAmount += row.totalAmount;
        return acc;
      },
      {
        requestCnt: 0,
        newLeadsCnt: 0,
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
      conversionRatePct: summary.newLeadsCnt > 0 ? (summary.policyCnt / summary.newLeadsCnt) * 100 : 0,
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

        {isQuotationError && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">
              {(quotationError as Error)?.message ?? "Failed to load quotation conversion data."}
            </CardContent>
          </Card>
        )}

        {isUtmVehicleCountError && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">
              {(utmVehicleCountError as Error)?.message ?? "Failed to load UTM vehicle count data."}
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
                  <RevenueChart data={chartData} yAxisMax={revenueYAxisMax} toggle={revenueToggle} />
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
                  <LeadsPolicyChart
                    data={chartData}
                    yAxisMax={countsYAxisMax}
                    toggle={countsToggle}
                    useLineForDaily={useLineForDailyCounts}
                  />
                </div>
              )}
              {!isLoading && chartData.length > 0 && (
                <ChartDataTable
                  rows={chartData}
                  title="Counts"
                  onExpandTable={() => setExpandedTablePanel("counts")}
                  columns={[
                    { key: "newLeadsCnt", label: "Leads count", kind: "int" },
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
                <SummaryRow title="Request count" value={formatInt(summaryWithConversion.requestCnt)} />
                <SummaryRow title="Leads count" value={formatInt(summaryWithConversion.newLeadsCnt)} />
                <SummaryRow title="Policies" value={formatInt(summaryWithConversion.policyCnt)} />
                <SummaryRow
                  title="Conversion rate (Policies / Leads count)"
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
                  <CustomersChart data={chartData} yAxisMax={customerYAxisMax} toggle={customersToggle} />
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

        <Card className="mt-12 rounded-2xl border-2 border-border/80 bg-card shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Detailed Breakdown</CardTitle>
            <CardDescription>End-to-end timeline for clearer period-by-period comparison</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex h-[420px] items-center justify-center text-muted-foreground">
                Loading chart…
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-[420px] items-center justify-center text-muted-foreground">
                No data for selected filters.
              </div>
            ) : (
              <DetailedBreakdownChart
                data={chartData}
                yAxisMax={detailedCountsYAxisMax}
                toggle={detailedCountsToggle}
                useLineForDaily={useLineForDailyCounts}
                scrollRef={wideCountsScrollRef}
              />
            )}
            {!isLoading && chartData.length > 0 && (
              <ChartDataTable
                rows={chartData}
                title="Detailed Breakdown"
                onExpandTable={() => setExpandedTablePanel("counts")}
                columns={[
                  { key: "requestCnt", label: "Request count", kind: "int" },
                  { key: "newLeadsCnt", label: "Leads count", kind: "int" },
                  { key: "policyCnt", label: "Policy count", kind: "int" },
                  { key: "conversionRatePct", label: "Conversion rate", kind: "pct" },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
          <Card className={`${QUADRANT_CARD_HEIGHT_CLASS} ${QUADRANT_CARD_SHELL_CLASS} flex flex-col`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Avg Insurers Compared</CardTitle>
                  <CardDescription>
                    Converted vs not-converted requests (data available from July 2026)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedPanel("insurers")}
                  disabled={isQuotationLoading || quotationChartData.length === 0}
                >
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {isQuotationLoading ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  Loading chart…
                </div>
              ) : quotationChartData.length === 0 ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  No data for selected filters.
                </div>
              ) : (
                <div className={`${IN_CARD_CHART_AREA_CLASS} w-full min-w-0`}>
                  <InsurersComparisonChart
                    data={quotationChartData}
                    yAxisMax={insurersYAxisMax}
                    toggle={insurersToggle}
                  />
                </div>
              )}
              {!isQuotationLoading && quotationChartData.length > 0 && (
                <ChartDataTable
                  rows={quotationChartData}
                  title="Avg Insurers Compared"
                  onExpandTable={() => setExpandedTablePanel("insurers")}
                  columns={[
                    { key: "convertedRequests", label: "Converted requests", kind: "int" },
                    { key: "notConvertedRequests", label: "Not converted requests", kind: "int" },
                    { key: "avgInsurersConverted", label: "Avg insurers (converted)", kind: "decimal" },
                    { key: "avgInsurersNotConverted", label: "Avg insurers (not converted)", kind: "decimal" },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          <Card className={`${QUADRANT_CARD_HEIGHT_CLASS} ${QUADRANT_CARD_SHELL_CLASS} flex flex-col`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>UTM Vehicle Count</CardTitle>
                  <CardDescription>
                    Requests / vehicle count / sales (data available from June 2026)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedPanel("utmVehicleCount")}
                  disabled={isUtmVehicleCountLoading || utmVehicleCountChartData.length === 0}
                >
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {isUtmVehicleCountLoading ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  Loading chart…
                </div>
              ) : utmVehicleCountChartData.length === 0 ? (
                <div className={`flex ${IN_CARD_CHART_AREA_CLASS} items-center justify-center text-muted-foreground`}>
                  No data for selected filters.
                </div>
              ) : (
                <div className={`${IN_CARD_CHART_AREA_CLASS} w-full min-w-0`}>
                  <UtmVehicleCountChart
                    data={utmVehicleCountChartData}
                    yAxisMax={utmVehicleCountYAxisMax}
                    toggle={utmVehicleCountToggle}
                    useLineForDaily={useLineForDailyCounts}
                  />
                </div>
              )}
              {!isUtmVehicleCountLoading && utmVehicleCountChartData.length > 0 && (
                <ChartDataTable
                  rows={utmVehicleCountChartData}
                  title="UTM Vehicle Count"
                  onExpandTable={() => setExpandedTablePanel("utmVehicleCount")}
                  columns={[
                    { key: "totalRequests", label: "Total requests", kind: "int" },
                    { key: "totalVehicleNo", label: "Total vehicle no", kind: "int" },
                    { key: "totalSales", label: "Total sales", kind: "int" },
                    { key: "conversionPct", label: "Conversion rate", kind: "pct" },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={expandedPanel !== null} onOpenChange={(open) => !open && setExpandedPanel(null)}>
          <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {expandedPanel === "revenue"
                  ? "Revenue (Total / New / Returning)"
                  : expandedPanel === "counts"
                  ? "Leads / Policy"
                  : expandedPanel === "newReturning"
                  ? "New vs Returning Customers"
                  : expandedPanel === "insurers"
                  ? "Avg Insurers Compared"
                  : "UTM Vehicle Count"}
              </DialogTitle>
              <DialogDescription>Expanded chart and data table view.</DialogDescription>
            </DialogHeader>

            {expandedPanel === "revenue" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <RevenueChart data={chartData} yAxisMax={revenueYAxisMax} toggle={revenueToggle} />
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
                  <LeadsPolicyChart
                    data={chartData}
                    yAxisMax={countsYAxisMax}
                    toggle={countsToggle}
                    useLineForDaily={useLineForDailyCounts}
                  />
                </div>
                <ChartDataTable
                  rows={chartData}
                  title="Counts"
                  columns={[
                    { key: "newLeadsCnt", label: "Leads count", kind: "int" },
                    { key: "policyCnt", label: "Policy count", kind: "int" },
                    { key: "conversionRatePct", label: "Conversion rate", kind: "pct" },
                  ]}
                />
              </>
            )}

            {expandedPanel === "newReturning" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <CustomersChart data={chartData} yAxisMax={customerYAxisMax} toggle={customersToggle} />
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

            {expandedPanel === "insurers" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <InsurersComparisonChart
                    data={quotationChartData}
                    yAxisMax={insurersYAxisMax}
                    toggle={insurersToggle}
                  />
                </div>
                <ChartDataTable
                  rows={quotationChartData}
                  title="Avg Insurers Compared"
                  columns={[
                    { key: "convertedRequests", label: "Converted requests", kind: "int" },
                    { key: "notConvertedRequests", label: "Not converted requests", kind: "int" },
                    { key: "avgInsurersConverted", label: "Avg insurers (converted)", kind: "decimal" },
                    { key: "avgInsurersNotConverted", label: "Avg insurers (not converted)", kind: "decimal" },
                  ]}
                />
              </>
            )}

            {expandedPanel === "utmVehicleCount" && (
              <>
                <div className="h-[65vh] w-full min-w-0">
                  <UtmVehicleCountChart
                    data={utmVehicleCountChartData}
                    yAxisMax={utmVehicleCountYAxisMax}
                    toggle={utmVehicleCountToggle}
                    useLineForDaily={useLineForDailyCounts}
                  />
                </div>
                <ChartDataTable
                  rows={utmVehicleCountChartData}
                  title="UTM Vehicle Count"
                  columns={[
                    { key: "totalRequests", label: "Total requests", kind: "int" },
                    { key: "totalVehicleNo", label: "Total vehicle no", kind: "int" },
                    { key: "totalSales", label: "Total sales", kind: "int" },
                    { key: "conversionPct", label: "Conversion rate", kind: "pct" },
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
                  : expandedTablePanel === "newReturning"
                  ? "New vs Returning Customers Table"
                  : expandedTablePanel === "insurers"
                  ? "Avg Insurers Compared Table"
                  : "UTM Vehicle Count Table"}
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
                  { key: "requestCnt", label: "Request count", kind: "int" },
                  { key: "newLeadsCnt", label: "Leads count", kind: "int" },
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

            {expandedTablePanel === "insurers" && (
              <ChartDataTable
                rows={quotationChartData}
                title="Avg Insurers Compared"
                maxHeightClassName="max-h-[72vh]"
                columns={[
                  { key: "convertedRequests", label: "Converted requests", kind: "int" },
                  { key: "notConvertedRequests", label: "Not converted requests", kind: "int" },
                  { key: "avgInsurersConverted", label: "Avg insurers (converted)", kind: "decimal" },
                  { key: "avgInsurersNotConverted", label: "Avg insurers (not converted)", kind: "decimal" },
                ]}
              />
            )}

            {expandedTablePanel === "utmVehicleCount" && (
              <ChartDataTable
                rows={utmVehicleCountChartData}
                title="UTM Vehicle Count"
                maxHeightClassName="max-h-[72vh]"
                columns={[
                  { key: "totalRequests", label: "Total requests", kind: "int" },
                  { key: "totalVehicleNo", label: "Total vehicle no", kind: "int" },
                  { key: "totalSales", label: "Total sales", kind: "int" },
                  { key: "conversionPct", label: "Conversion rate", kind: "pct" },
                ]}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
