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
import { SeriesLegend } from "../SeriesLegend";
import { formatKAxis, formatTooltipValue } from "../../utils/formatters";
import { COLORS } from "../../utils/colors";
import type { SeriesPoint, RevenueSeriesKey } from "../../types";
import type { SeriesToggle } from "../../hooks/useSeriesToggle";

const REVENUE_LEGEND_PAYLOAD = [
  { value: "Revenue new", type: "square", dataKey: "newCustomerAmount", color: COLORS.revenueNew },
  {
    value: "Revenue returning",
    type: "square",
    dataKey: "returningCustomerAmount",
    color: COLORS.revenueReturning,
  },
  { value: "Revenue total", type: "line", dataKey: "totalAmount", color: COLORS.revenueTotal },
] as const;

/** Stacked new/returning revenue with a total line. Used inline and in the expanded dialog. */
export function RevenueChart({
  data,
  yAxisMax,
  toggle,
}: {
  data: SeriesPoint[];
  yAxisMax: number;
  toggle: SeriesToggle<RevenueSeriesKey>;
}) {
  const showNew = toggle.isActive("newCustomerAmount");
  const showReturning = toggle.isActive("returningCustomerAmount");
  const showTotal = toggle.isActive("totalAmount");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        key={toggle.chartKey("revenue")}
        data={data}
        margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          width={90}
          tickLine={false}
          axisLine={false}
          domain={[0, yAxisMax]}
          tickFormatter={(v) => formatKAxis(Number(v), { currency: true })}
        />
        <Tooltip formatter={formatTooltipValue} />
        <Legend
          payload={REVENUE_LEGEND_PAYLOAD as any}
          content={() => (
            <SeriesLegend
              payload={REVENUE_LEGEND_PAYLOAD}
              isActive={toggle.isActive}
              onClick={toggle.handleClick}
              isFiltered={toggle.isFiltered}
              onReset={toggle.reset}
            />
          )}
        />
        {showNew && (
          <Bar
            dataKey="newCustomerAmount"
            stackId="revenue"
            name="Revenue new"
            fill={COLORS.revenueNew}
            fillOpacity={1}
            onClick={() => toggle.handleClick("newCustomerAmount")}
          />
        )}
        {showReturning && (
          <Bar
            dataKey="returningCustomerAmount"
            stackId="revenue"
            name="Revenue returning"
            fill={COLORS.revenueReturning}
            fillOpacity={1}
            onClick={() => toggle.handleClick("returningCustomerAmount")}
          />
        )}
        {showTotal && (
          <Line
            dataKey="totalAmount"
            name="Revenue total"
            type="monotone"
            stroke={COLORS.revenueTotal}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORS.revenueTotal }}
            onClick={() => toggle.handleClick("totalAmount")}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
