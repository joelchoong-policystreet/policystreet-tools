import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SeriesLegend } from "../SeriesLegend";
import { formatKAxis } from "../../utils/formatters";
import { COLORS } from "../../utils/colors";
import type { SeriesPoint, CustomerSeriesKey } from "../../types";
import type { SeriesToggle } from "../../hooks/useSeriesToggle";

const CUSTOMERS_LEGEND_PAYLOAD = [
  { value: "New customers", type: "square", dataKey: "newPolicyCnt", color: COLORS.newPolicy },
  {
    value: "Returning customers",
    type: "square",
    dataKey: "returningPolicyCnt",
    color: COLORS.returningPolicy,
  },
] as const;

/** Stacked new vs returning customers. Used inline and in the expanded dialog. */
export function CustomersChart({
  data,
  yAxisMax,
  toggle,
}: {
  data: SeriesPoint[];
  yAxisMax: number;
  toggle: SeriesToggle<CustomerSeriesKey>;
}) {
  const showNew = toggle.isActive("newPolicyCnt");
  const showReturning = toggle.isActive("returningPolicyCnt");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        key={toggle.chartKey("customers")}
        data={data}
        margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          width={72}
          tickLine={false}
          axisLine={false}
          domain={[0, yAxisMax]}
          tickFormatter={(v) => formatKAxis(Number(v))}
        />
        <Tooltip />
        <Legend
          payload={CUSTOMERS_LEGEND_PAYLOAD as any}
          content={() => (
            <SeriesLegend
              payload={CUSTOMERS_LEGEND_PAYLOAD}
              isActive={toggle.isActive}
              onClick={toggle.handleClick}
              isFiltered={toggle.isFiltered}
              onReset={toggle.reset}
            />
          )}
        />
        {showNew && (
          <Bar
            dataKey="newPolicyCnt"
            stackId="customers"
            name="New customers"
            fill={COLORS.newPolicy}
            fillOpacity={1}
            onClick={() => toggle.handleClick("newPolicyCnt")}
          />
        )}
        {showReturning && (
          <Bar
            dataKey="returningPolicyCnt"
            stackId="customers"
            name="Returning customers"
            fill={COLORS.returningPolicy}
            fillOpacity={1}
            onClick={() => toggle.handleClick("returningPolicyCnt")}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
