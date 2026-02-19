import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  parseISO,
  parse,
  isValid,
  format,
  type Interval,
} from "date-fns";

export type FilterPreset = "all_time" | "this_month" | "last_month" | "custom";
export type DateRange = { from: Date; to?: Date };

export function parsePurchasedDateTime(value: string): Date | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  let d = parseISO(s);
  if (isValid(d)) return d;
  d = parse(s, "dd/MM/yyyy HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd", new Date());
  if (isValid(d)) return d;
  return null;
}

export function parseBillingDate(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  let d = parseISO(s);
  if (isValid(d)) return d;
  d = parse(s, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd", new Date());
  if (isValid(d)) return d;
  // Generali: "15 Feb 2026", "26 Jan 2026"
  d = parse(s, "d MMM yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "d MMMM yyyy", new Date());
  if (isValid(d)) return d;
  // "dd-MMM-yyyy" e.g. 02-Jan-2026
  d = parse(s, "dd-MMM-yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "d-MMM-yyyy", new Date());
  if (isValid(d)) return d;
  // Datetime: "2026-01-08 9:14:45", "2026-01-08 09:14:45"
  d = parse(s, "yyyy-MM-dd HH:mm:ss", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd H:mm:ss", new Date());
  if (isValid(d)) return d;
  return null;
}

/** Parse a date string and return YYYY-MM-DD for DB DATE columns, or null. */
export function toISODateOnly(value: string | null): string | null {
  const d = parseBillingDate(value);
  return d ? format(d, "yyyy-MM-dd") : null;
}

export function filterByDateRange<T>(
  rows: T[],
  preset: FilterPreset,
  customRange: DateRange | null,
  getDate: (row: T) => Date | null
): T[] {
  if (rows.length === 0) return rows;
  if (preset === "all_time") return rows;
  if (preset === "custom" && customRange?.from) {
    const from = customRange.from;
    const to = customRange.to ?? from;
    return rows.filter((r) => {
      const d = getDate(r);
      if (!d) return false;
      return isWithinInterval(d, { start: from, end: to });
    });
  }
  const now = new Date();
  let interval: Interval;
  if (preset === "last_month") {
    interval = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
  } else {
    interval = { start: startOfMonth(now), end: endOfMonth(now) };
  }
  return rows.filter((r) => {
    const d = getDate(r);
    if (!d) return false;
    return isWithinInterval(d, interval);
  });
}

export function getFilterLabel(preset: FilterPreset, customRange: DateRange | null): string {
  if (preset === "all_time") return "All time";
  if (preset === "this_month") return "This month";
  if (preset === "last_month") return "Last month";
  if (customRange?.from) {
    const from = customRange.from.toLocaleDateString();
    const to = customRange.to ? customRange.to.toLocaleDateString() : from;
    return `Custom (${from}${customRange.to ? ` – ${to}` : ""})`;
  }
  return "Custom";
}
