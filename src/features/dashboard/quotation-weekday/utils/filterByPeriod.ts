import { format, startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Granularity, PeriodMode } from "../types";

/** Applies the shared View Filter (period mode / year / custom range) to any day-tagged row set. */
export function filterRowsByPeriod<T extends { day: string; year: number }>(
  rows: T[],
  opts: {
    periodMode: PeriodMode;
    granularity: Granularity;
    yearNum: number;
    customRange: DateRange | undefined;
    availableDateRange: { min: string; max: string };
  }
): T[] {
  const { periodMode, granularity, yearNum, customRange, availableDateRange } = opts;

  if (periodMode === "this_month") {
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");
    return rows.filter((r) => r.day >= start && r.day <= end);
  }
  if (periodMode === "custom_range") {
    const selectedStart = customRange?.from ? format(customRange.from, "yyyy-MM-dd") : "";
    const selectedEnd = customRange?.to ? format(customRange.to, "yyyy-MM-dd") : selectedStart;
    const start = selectedStart || availableDateRange.min;
    const end = selectedEnd || availableDateRange.max;
    if (!start) return [];
    if (!end) return rows.filter((r) => r.day >= start);
    const from = start <= end ? start : end;
    const to = start <= end ? end : start;
    return rows.filter((r) => r.day >= from && r.day <= to);
  }
  if (!Number.isFinite(yearNum)) return [];
  if (granularity === "year") {
    return rows.filter((r) => r.year <= yearNum);
  }
  return rows.filter((r) => r.year === yearNum);
}

export function computeAvailableDateRange<T extends { day: string }>(rows: T[]): {
  min: string;
  max: string;
} {
  if (rows.length === 0) return { min: "", max: "" };
  const sortedDays = rows.map((r) => r.day).sort();
  return { min: sortedDays[0] ?? "", max: sortedDays[sortedDays.length - 1] ?? "" };
}
