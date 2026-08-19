import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatKAxis, formatTooltipValue } from "../../utils/formatters";
import { getBarSizing } from "../../utils/barSizing";
import { COLORS } from "../../utils/colors";
import type { SeriesPoint, CountSeriesKey, CountLegendSeriesKey } from "../../types";
import type { SeriesToggle } from "../../hooks/useSeriesToggle";

const COUNTS_LEGEND_PAYLOAD = [
  { value: "Request count", type: "square", dataKey: "requestCnt", color: COLORS.requests },
  { value: "Leads count", type: "square", dataKey: "newLeadsCnt", color: COLORS.uniqueLeads },
  { value: "Policy count", type: "square", dataKey: "policyCnt", color: COLORS.policies },
  { value: "Conversion rate", type: "line", dataKey: "conversionRatePct", color: COLORS.requests },
] as const;

/** End-to-end wide timeline with a button-row legend instead of a floating one, for scannability at scroll. */
export function DetailedBreakdownChart({
  data,
  yAxisMax,
  toggle,
  useLineForDaily,
  scrollRef,
}: {
  data: SeriesPoint[];
  yAxisMax: number;
  toggle: SeriesToggle<CountSeriesKey>;
  useLineForDaily: boolean;
  scrollRef: { current: HTMLDivElement | null };
}) {
  const showRequest = toggle.isActive("requestCnt");
  const showLeads = toggle.isActive("newLeadsCnt");
  const showPolicy = toggle.isActive("policyCnt");
  const sizing = getBarSizing(toggle.effectiveActive.length, useLineForDaily);
  const chartWidth = Math.max(1400, data.length * 82);

  const chartData = data.map((row) => ({
    ...row,
    requestCnt: showRequest ? row.requestCnt : 0,
    newLeadsCnt: showLeads ? row.newLeadsCnt : 0,
    policyCnt: showPolicy ? row.policyCnt : 0,
  }));

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {COUNTS_LEGEND_PAYLOAD.map((entry) => {
            const key = entry.dataKey as CountLegendSeriesKey;
            const isClickable = key !== "conversionRatePct";
            const isActive = key === "conversionRatePct" || toggle.isActive(key as CountSeriesKey);
            const isLine = entry.type === "line";
            return (
              <Button
                key={`wide-top-${key}`}
                type="button"
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className={`h-7 px-2.5 ${!isClickable ? "cursor-default" : ""}`}
                onClick={() => isClickable && toggle.handleClick(key as CountSeriesKey)}
              >
                {isLine ? (
                  <span
                    className="mr-1 inline-block h-0.5 w-3 rounded"
                    style={{ backgroundColor: entry.color }}
                  />
                ) : (
                  <span
                    className="mr-1 inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                )}
                <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                  {entry.value}
                </span>
              </Button>
            );
          })}
        </div>
        {toggle.isFiltered && (
          <Button variant="outline" size="sm" className="h-7 px-2.5" onClick={toggle.reset}>
            Reset
          </Button>
        )}
      </div>
      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ width: chartWidth, minWidth: "100%" }}>
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart
              key={`${toggle.chartKey("counts-detailed")}:wide`}
              data={chartData}
              barCategoryGap={sizing.barCategoryGap}
              barGap={sizing.barGap}
              margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="left"
                width={72}
                tickLine={false}
                axisLine={false}
                domain={[0, yAxisMax]}
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
              <Bar
                yAxisId="left"
                dataKey="requestCnt"
                name="Request count"
                fill={COLORS.requests}
                barSize={sizing.fixedBarSize}
                fillOpacity={toggle.opacityFor("requestCnt")}
                opacity={toggle.opacityFor("requestCnt")}
                stroke={showRequest ? COLORS.requests : "transparent"}
                strokeWidth={showRequest ? 1.25 : 0}
                minPointSize={useLineForDaily ? 3 : 0}
                maxBarSize={sizing.maxBarSize}
                onClick={() => toggle.handleClick("requestCnt")}
              />
              <Bar
                yAxisId="left"
                dataKey="newLeadsCnt"
                name="Leads count"
                fill={COLORS.uniqueLeads}
                barSize={sizing.fixedBarSize}
                fillOpacity={toggle.opacityFor("newLeadsCnt")}
                opacity={toggle.opacityFor("newLeadsCnt")}
                stroke={showLeads ? COLORS.uniqueLeads : "transparent"}
                strokeWidth={showLeads ? 1.25 : 0}
                minPointSize={useLineForDaily ? 3 : 0}
                maxBarSize={sizing.maxBarSize}
                onClick={() => toggle.handleClick("newLeadsCnt")}
              />
              <Bar
                yAxisId="left"
                dataKey="policyCnt"
                name="Policy count"
                fill={COLORS.policies}
                barSize={sizing.fixedBarSize}
                fillOpacity={toggle.opacityFor("policyCnt")}
                opacity={toggle.opacityFor("policyCnt")}
                stroke={showPolicy ? COLORS.policies : "transparent"}
                strokeWidth={showPolicy ? 1.25 : 0}
                minPointSize={useLineForDaily ? 3 : 0}
                maxBarSize={sizing.maxBarSize}
                onClick={() => toggle.handleClick("policyCnt")}
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
      </div>
    </>
  );
}
