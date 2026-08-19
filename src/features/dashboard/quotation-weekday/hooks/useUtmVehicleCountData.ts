import { parseISO } from "date-fns";
import type { UtmVehicleCountRow } from "../types";
import { useDailyTableData } from "./useDailyTableData";

const TABLE_NAME = "utm_vehicle_count";

function mapSupabaseRow(r: any): UtmVehicleCountRow | null {
  const day = String(r.request_date ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsedDay = parseISO(day);
  if (Number.isNaN(parsedDay.getTime())) return null;
  return {
    day,
    year: parsedDay.getFullYear(),
    dayDate: parsedDay,
    totalRequests: Number(r.total_requests ?? 0),
    totalVehicleNo: Number(r.total_vehicle_no ?? 0),
    totalSales: Number(r.total_sales ?? 0),
  } satisfies UtmVehicleCountRow;
}

function mapCachedRow(raw: unknown): UtmVehicleCountRow | null {
  const record = raw as Partial<UtmVehicleCountRow> & Record<string, unknown>;
  const day = String(record.day ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsedDay = parseISO(day);
  if (Number.isNaN(parsedDay.getTime())) return null;
  return {
    day,
    year: Number.isFinite(Number(record.year)) ? Number(record.year) : parsedDay.getFullYear(),
    dayDate: parsedDay,
    totalRequests: Number(record.totalRequests ?? 0),
    totalVehicleNo: Number(record.totalVehicleNo ?? 0),
    totalSales: Number(record.totalSales ?? 0),
  } satisfies UtmVehicleCountRow;
}

export function useUtmVehicleCountData() {
  return useDailyTableData<UtmVehicleCountRow>({
    tableName: TABLE_NAME,
    dateColumn: "request_date",
    selectColumns: "request_date,total_requests,total_vehicle_no,total_sales",
    cacheKey: "utm-vehicle-count-dashboard-cache-v1",
    queryKeyPrefix: "utm-vehicle-count-dashboard",
    mapSupabaseRow,
    mapCachedRow,
  });
}
