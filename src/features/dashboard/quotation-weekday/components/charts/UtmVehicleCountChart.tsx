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
import type {
  UtmVehicleCountSeriesPoint,
  UtmVehicleCountSeriesKey,
  UtmVehicleCountLegendSeriesKey,
} from "../../types";
import type { SeriesToggle } from "../../hooks/useSeriesToggle";

const UTM_VEHICLE_COUNT_LEGEND_PAYLOAD = [
  { value: "Total requests", type: "square", dataKey: "totalRequests", color: COLORS.utmRequests },
  { value: "Total vehicle no", type: "square", dataKey: "totalVehicleNo", color: COLORS.utmVehicleNo },
  { value: "Total sales", type: "square", dataKey: "totalSales", color: COLORS.utmSales },
  { value: "Conversion rate", type: "line", dataKey: "conversionPct", color: COLORS.requests },
] as const;

/** Requests / vehicle count / sales with a conversion-rate line. Used inline and in the expanded dialog. */
export function UtmVehicleCountChart({
  data,
  yAxisMax,
  toggle,
  useLineForDaily,
}: {
  data: UtmVehicleCountSeriesPoint[];
  yAxisMax: number;
  toggle: SeriesToggle<UtmVehicleCountSeriesKey>;
  useLineForDaily: boolean;
}) {
  const showRequests = toggle.isActive("totalRequests");
  const showVehicleNo = toggle.isActive("totalVehicleNo");
  const showSales = toggle.isActive("totalSales");
  const sizing = getBarSizing(toggle.effectiveActive.length, useLineForDaily);

  const chartData = data.map((row) => ({
    ...row,
    totalRequests: showRequests ? row.totalRequests : 0,
    totalVehicleNo: showVehicleNo ? row.totalVehicleNo : 0,
    totalSales: showSales ? row.totalSales : 0,
  }));

  const isLegendActive = (key: UtmVehicleCountLegendSeriesKey) =>
    key === "conversionPct" ? true : toggle.isActive(key);
  const isLegendClickable = (key: UtmVehicleCountLegendSeriesKey) => key !== "conversionPct";
  const handleLegendClick = (key: UtmVehicleCountLegendSeriesKey) => {
    if (key !== "conversionPct") toggle.handleClick(key);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        key={toggle.chartKey("utm-vehicle-count")}
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
          payload={UTM_VEHICLE_COUNT_LEGEND_PAYLOAD as any}
          content={() => (
            <SeriesLegend
              payload={UTM_VEHICLE_COUNT_LEGEND_PAYLOAD}
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
          dataKey="totalRequests"
          name="Total requests"
          fill={COLORS.utmRequests}
          barSize={sizing.fixedBarSize}
          fillOpacity={toggle.opacityFor("totalRequests")}
          opacity={toggle.opacityFor("totalRequests")}
          stroke={showRequests ? COLORS.utmRequests : "transparent"}
          strokeWidth={showRequests ? 1.25 : 0}
          minPointSize={useLineForDaily ? 3 : 0}
          maxBarSize={sizing.maxBarSize}
          onClick={() => toggle.handleClick("totalRequests")}
        />
        <Bar
          yAxisId="left"
          dataKey="totalVehicleNo"
          name="Total vehicle no"
          fill={COLORS.utmVehicleNo}
          barSize={sizing.fixedBarSize}
          fillOpacity={toggle.opacityFor("totalVehicleNo")}
          opacity={toggle.opacityFor("totalVehicleNo")}
          stroke={showVehicleNo ? COLORS.utmVehicleNo : "transparent"}
          strokeWidth={showVehicleNo ? 1.25 : 0}
          minPointSize={useLineForDaily ? 3 : 0}
          maxBarSize={sizing.maxBarSize}
          onClick={() => toggle.handleClick("totalVehicleNo")}
        />
        <Bar
          yAxisId="left"
          dataKey="totalSales"
          name="Total sales"
          fill={COLORS.utmSales}
          barSize={sizing.fixedBarSize}
          fillOpacity={toggle.opacityFor("totalSales")}
          opacity={toggle.opacityFor("totalSales")}
          stroke={showSales ? COLORS.utmSales : "transparent"}
          strokeWidth={showSales ? 1.25 : 0}
          minPointSize={useLineForDaily ? 3 : 0}
          maxBarSize={sizing.maxBarSize}
          onClick={() => toggle.handleClick("totalSales")}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversionPct"
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
