import { useMemo } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInt, formatCurrency } from "../utils/formatters";

type LabeledSortableRow = { label: string; sortKey: string };

export function ChartDataTable<T extends LabeledSortableRow>({
  rows,
  columns,
  title,
  onExpandTable,
  maxHeightClassName,
}: {
  rows: T[];
  columns: { key: keyof T; label: string; kind?: "int" | "currency" | "pct" | "decimal" }[];
  title?: string;
  onExpandTable?: () => void;
  maxHeightClassName?: string;
}) {
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
    [rows]
  );

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
                    : c.kind === "decimal"
                    ? raw.toFixed(2)
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
