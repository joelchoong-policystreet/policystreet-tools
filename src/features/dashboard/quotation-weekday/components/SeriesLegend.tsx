import { Button } from "@/components/ui/button";

type LegendEntry = {
  value: string;
  type: "square" | "line";
  dataKey: string;
  color: string;
};

/**
 * Clickable legend row shared by all quadrant charts: a colored swatch per
 * series that dims when deselected, plus a Reset button when filtered.
 */
export function SeriesLegend<K extends string>({
  payload,
  isActive,
  isClickable,
  onClick,
  isFiltered,
  onReset,
}: {
  payload: readonly LegendEntry[];
  isActive: (key: K) => boolean;
  isClickable?: (key: K) => boolean;
  onClick: (key: K) => void;
  isFiltered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="relative flex items-center justify-center gap-2 px-2 text-xs">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {payload.map((entry) => {
          const key = entry.dataKey as K;
          const active = isActive(key);
          const clickable = isClickable ? isClickable(key) : true;
          const isLine = entry.type === "line";
          return (
            <button
              key={`${entry.dataKey}-${entry.value}`}
              type="button"
              className="inline-flex items-center gap-1.5"
              onClick={() => clickable && onClick(key)}
            >
              {isLine ? (
                <span
                  className="inline-block h-0.5 w-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
              ) : (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span
                style={{
                  color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                {entry.value}
              </span>
            </button>
          );
        })}
      </div>
      {isFiltered && (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-0 h-7 px-2.5"
          onClick={onReset}
        >
          Reset
        </Button>
      )}
    </div>
  );
}
