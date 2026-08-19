import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SeriesLegend } from "../SeriesLegend";
import { formatKAxis, formatTooltipValue } from "../../utils/formatters";
import { getBarSizing } from "../../utils/barSizing";
import { COLORS } from "../../utils/colors";
import type { SeriesPoint, CountSeriesKey, CountLegendSeriesKey } from "../../types";
import type { SeriesToggle } from "../../hooks/useSeriesToggle";

const LEADS_POLICY_LEGEND_PAYLOAD = [
  { value: "Leads count", type: "square", dataKey: "newLeadsCnt", color: COLORS.uniqueLeads },
  { value: "Policy count", type: "square", dataKey: "policyCnt", color: COLORS.policies },
  { value: "Conversion rate", type: "line", dataKey: "conversionRatePct", color: COLORS.requests },
] as const;

/** Leads vs policy counts with a conversion-rate line. Used inline and in the expanded dialog. */
export function LeadsPolicyChart({
  data,
  yAxisMax,
  toggle,
  useLineForDaily,
}: {
  data: SeriesPoint[];
  yAxisMax: number;
  toggle: SeriesToggle<CountSeriesKey>;
  useLineForDaily: boolean;
}) {
  const showLeads = toggle.isActive("newLeadsCnt");
  const showPolicy = toggle.isActive("policyCnt");
  const sizing = getBarSizing(toggle.effectiveActive.length, useLineForDaily);

  const chartData = data.map((row) => ({
    ...row,
    newLeadsCnt: showLeads ? row.newLeadsCnt : 0,
    policyCnt: showPolicy ? row.policyCnt : 0,
  }));

  const isLegendActive = (key: CountLegendSeriesKey) =>
    key === "conversionRatePct" ? true : toggle.isActive(key);
  const isLegendClickable = (key: CountLegendSeriesKey) => key !== "conversionRatePct";
  const handleLegendClick = (key: CountLegendSeriesKey) => {
    if (key !== "conversionRatePct") toggle.handleClick(key);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        key={toggle.chartKey("counts")}
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
        <Legend
          payload={LEADS_POLICY_LEGEND_PAYLOAD as any}
          content={() => (
            <SeriesLegend
              payload={LEADS_POLICY_LEGEND_PAYLOAD}
              isActive={isLegendActive}
              isClickable={isLegendClickable}
              onClick={handleLegendClick}
              isFiltered={toggle.isFiltered}
              onReset={toggle.reset}
            />
          )}
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
  );
}
