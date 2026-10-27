import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartDataTable } from "@/features/dashboard/quotation-weekday/components/ChartDataTable";
import type { Granularity } from "../types";
import type { TrendMeasure, TrendRow } from "../utils/aggregate";
import { GROUP_ORDER, GROUPS, groupColor } from "../utils/colors";
import { GroupLegend } from "./ClusterSizesCard";

export function TrendCard({
  rows,
  granularity,
  measure,
  onMeasureChange,
}: {
  rows: TrendRow[];
  granularity: Granularity;
  measure: TrendMeasure;
  onMeasureChange: (m: TrendMeasure) => void;
}) {
  const isMonth = granularity === "month";
  const fmt = (v: number) => (measure === "share" ? `${v.toFixed(0)}%` : isMonth ? v.toFixed(1) : String(Math.round(v)));
  const description = isMonth
    ? measure === "share"
      ? "Each month's mix of feedback, by cluster group"
      : "Average submissions per day each month, by cluster group — fair across partial months"
    : measure === "share"
      ? `Mix of feedback by ${granularity}`
      : `Submissions by ${granularity}, by cluster group`;

  return (
    <Card className="rounded-2xl border-2 border-border/80 shadow-sm overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Feedback over time</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={measure}
            onValueChange={(v) => v && onMeasureChange(v as TrendMeasure)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="rate">{isMonth ? "Per day" : "Count"}</ToggleGroupItem>
            <ToggleGroupItem value="share">Share</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[320px] w-full px-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 4 }} maxBarSize={isMonth ? 110 : 56}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                domain={measure === "share" ? [0, 100] : [0, "auto"]}
                tickFormatter={(v) => (measure === "share" ? `${v}%` : String(v))}
              />
              <Tooltip formatter={(value: number, name: string) => [fmt(value), name]} cursor={{ fillOpacity: 0.15 }} />
              {GROUP_ORDER.map((g) => (
                <Bar key={g} dataKey={g} name={GROUPS[g].label} stackId="groups" fill={groupColor(g)} stroke="#fff" strokeWidth={1}>
                  {rows.map((r) => (
                    <Cell key={r.sortKey} fillOpacity={r.highlighted ? 1 : 0.4} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <GroupLegend className="px-6 pb-4" />
        <ChartDataTable
          rows={rows}
          title="Feedback over time"
          columns={[
            ...GROUP_ORDER.map((g) => ({
              key: g as keyof TrendRow,
              label: GROUPS[g].label,
              kind: (measure === "share" ? "pct" : isMonth ? "decimal" : "int") as "pct" | "decimal" | "int",
            })),
            { key: "total" as keyof TrendRow, label: "Total", kind: (measure === "share" ? "pct" : isMonth ? "decimal" : "int") as "pct" | "decimal" | "int" },
          ]}
        />
      </CardContent>
    </Card>
  );
}
