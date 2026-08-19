import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SeriesLegend } from "../SeriesLegend";
import { formatKAxis } from "../../utils/formatters";
import { COLORS } from "../../utils/colors";
import type { QuotationConversionSeriesPoint, InsurerSeriesKey } from "../../types";
import type { SeriesToggle } from "../../hooks/useSeriesToggle";

const INSURERS_LEGEND_PAYLOAD = [
  {
    value: "Avg insurers (converted)",
    type: "line",
    dataKey: "avgInsurersConverted",
    color: COLORS.insurersConverted,
  },
  {
    value: "Avg insurers (not converted)",
    type: "line",
    dataKey: "avgInsurersNotConverted",
    color: COLORS.insurersNotConverted,
  },
] as const;

/** Avg insurers quoted per request, converted vs not converted. Used inline and in the expanded dialog. */
export function InsurersComparisonChart({
  data,
  yAxisMax,
  toggle,
}: {
  data: QuotationConversionSeriesPoint[];
  yAxisMax: number;
  toggle: SeriesToggle<InsurerSeriesKey>;
}) {
  const showConverted = toggle.isActive("avgInsurersConverted");
  const showNotConverted = toggle.isActive("avgInsurersNotConverted");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        key={toggle.chartKey("insurers")}
        data={data}
        margin={{ top: 12, right: 20, left: 20, bottom: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          domain={[0, yAxisMax]}
          tickFormatter={(v) => formatKAxis(Number(v))}
        />
        <Tooltip formatter={(value: number, name: string) => [value.toFixed(2), name]} />
        <Legend
          payload={INSURERS_LEGEND_PAYLOAD as any}
          content={() => (
            <SeriesLegend
              payload={INSURERS_LEGEND_PAYLOAD}
              isActive={toggle.isActive}
              onClick={toggle.handleClick}
              isFiltered={toggle.isFiltered}
              onReset={toggle.reset}
            />
          )}
        />
        {showConverted && (
          <Line
            dataKey="avgInsurersConverted"
            name="Avg insurers (converted)"
            type="monotone"
            stroke={COLORS.insurersConverted}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORS.insurersConverted }}
            onClick={() => toggle.handleClick("avgInsurersConverted")}
          />
        )}
        {showNotConverted && (
          <Line
            dataKey="avgInsurersNotConverted"
            name="Avg insurers (not converted)"
            type="monotone"
            stroke={COLORS.insurersNotConverted}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORS.insurersNotConverted }}
            onClick={() => toggle.handleClick("avgInsurersNotConverted")}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
