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
import { enUS } from "date-fns/locale";

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
  const s = value.trim().replace(/\s+/g, " ");
  let d = parseISO(s);
  if (isValid(d)) return d;
  // "2026-02-26 14:45:33" - try datetime formats early
  d = parse(s, "yyyy-MM-dd HH:mm:ss", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd H:mm:ss", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd HH:mm:ss.SSS", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "MM/dd/yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "dd-MM-yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "MM-dd-yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd", new Date());
  if (isValid(d)) return d;
  const refDate = new Date(2025, 0, 1);
  // "15 Feb 2026", "26 Jan 2026" (space, 4-digit year)
  d = parse(s, "d MMM yyyy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  d = parse(s, "dd MMM yyyy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  d = parse(s, "d MMMM yyyy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  // "24 Feb 26", "5 Jan 25" (space, 2-digit year - same as yyyy for duplicate detection)
  d = parse(s, "d MMM yy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  d = parse(s, "dd MMM yy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  // "15-Feb-2026", "2-Jan-2026" (hyphen, 4-digit year)
  d = parse(s, "d-MMM-yyyy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  d = parse(s, "dd-MMM-yyyy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  d = parse(s, "d-MMM-yyyy HH:mm:ss", refDate, { locale: enUS });
  if (isValid(d)) return d;
  d = parse(s, "dd-MMM-yyyy HH:mm:ss", refDate, { locale: enUS });
  if (isValid(d)) return d;
  // "24-Feb-26" (hyphen, 2-digit year)
  d = parse(s, "d-MMM-yy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  d = parse(s, "dd-MMM-yy", refDate, { locale: enUS });
  if (isValid(d)) return d;
  // "1/2/2026 12:15" (d/m/yyyy - day/month/year, single/double digit variants)
  d = parse(s, "d/M/yyyy HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "d/M/yyyy H:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "dd/M/yyyy HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "d/MM/yyyy HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "d/M/yyyy", refDate);
  if (isValid(d)) return d;
  d = parse(s, "dd/M/yyyy", refDate);
  if (isValid(d)) return d;
  d = parse(s, "d/MM/yyyy", refDate);
  if (isValid(d)) return d;
  // "1/2/26", "15/02/26" (slash, 2-digit year)
  d = parse(s, "d/M/yy", refDate);
  if (isValid(d)) return d;
  d = parse(s, "dd/M/yy", refDate);
  if (isValid(d)) return d;
  d = parse(s, "d/MM/yy", refDate);
  if (isValid(d)) return d;
  // Excel serial date (e.g. 45321.61475694444 from XLSX when cell not formatted as date)
  const num = Number(s);
  if (!Number.isNaN(num) && num >= 1 && num < 2958466) {
    const excelEpoch = new Date(1899, 11, 30);
    const ms = (num - (num >= 60 ? 1 : 0)) * 86400000;
    d = new Date(excelEpoch.getTime() + ms);
    if (isValid(d)) return d;
  }
  return null;
}

/** Parse a date string and return YYYY-MM-DD for DB DATE columns, or null. */
export function toISODateOnly(value: string | null): string | null {
  const d = parseBillingDate(value);
  return d ? format(d, "yyyy-MM-dd") : null;
}

/**
 * Parse OCR date_issue using US formats only (matches DB parse_ocr_date_to_iso).
 * Returns YYYY-MM-DD or null if unparseable.
 */
export function parseOcrDateToISO(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  const formats: [string, string][] = [
    ["yyyy-MM-dd", "yyyy-MM-dd"],
    ["yyyy/MM/dd", "yyyy-MM-dd"],
    ["MM/dd/yyyy", "yyyy-MM-dd"],
    ["M/dd/yyyy", "yyyy-MM-dd"],
    ["M/d/yyyy", "yyyy-MM-dd"],
    ["yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd"],
    ["yyyy-MM-dd HH:mm", "yyyy-MM-dd"],
    ["MM/dd/yyyy HH:mm", "yyyy-MM-dd"],
    ["M/dd/yyyy HH:mm", "yyyy-MM-dd"],
  ];
  for (const [fmt] of formats) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }
  return null;
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
