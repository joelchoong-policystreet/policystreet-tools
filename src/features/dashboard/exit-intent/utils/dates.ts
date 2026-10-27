const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** YYYY-MM-DD of a timestamp in Asia/Kuala_Lumpur (UTC+8, no DST). */
export function mytDay(d: Date): string {
  return new Date(d.getTime() + MYT_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string, style: "short" | "long" = "long"): string {
  const [y, m] = month.split("-").map(Number);
  return `${(style === "short" ? MONTH_SHORT : MONTH_LONG)[m - 1]} ${y}`;
}

export function monthName(month: string): string {
  return MONTH_LONG[Number(month.split("-")[1]) - 1];
}

export function dayLabel(day: string, withYear = false): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** Monday (YYYY-MM-DD) of the ISO week containing the day. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function timeLabel(d: Date): string {
  return new Date(d.getTime() + MYT_OFFSET_MS).toISOString().slice(11, 16);
}
