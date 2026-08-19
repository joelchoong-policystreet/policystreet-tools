import { parseISO } from "date-fns";
import type { QuotationConversionRow } from "../types";
import { useDailyTableData } from "./useDailyTableData";

const TABLE_NAME = "quotation_conversion_daily";

function mapSupabaseRow(r: any): QuotationConversionRow | null {
  const day = String(r.request_date ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsedDay = parseISO(day);
  if (Number.isNaN(parsedDay.getTime())) return null;
  return {
    day,
    year: parsedDay.getFullYear(),
    dayDate: parsedDay,
    convertedRequests: Number(r.converted_requests ?? 0),
    notConvertedRequests: Number(r.not_converted_requests ?? 0),
    totalRequests: Number(r.total_requests ?? 0),
    avgInsurersConverted: Number(r.avg_insurers_converted ?? 0),
    avgInsurersNotConverted: Number(r.avg_insurers_not_converted ?? 0),
  } satisfies QuotationConversionRow;
}

function mapCachedRow(raw: unknown): QuotationConversionRow | null {
  const record = raw as Partial<QuotationConversionRow> & Record<string, unknown>;
  const day = String(record.day ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsedDay = parseISO(day);
  if (Number.isNaN(parsedDay.getTime())) return null;
  return {
    day,
    year: Number.isFinite(Number(record.year)) ? Number(record.year) : parsedDay.getFullYear(),
    dayDate: parsedDay,
    convertedRequests: Number(record.convertedRequests ?? 0),
    notConvertedRequests: Number(record.notConvertedRequests ?? 0),
    totalRequests: Number(record.totalRequests ?? 0),
    avgInsurersConverted: Number(record.avgInsurersConverted ?? 0),
    avgInsurersNotConverted: Number(record.avgInsurersNotConverted ?? 0),
  } satisfies QuotationConversionRow;
}

export function useQuotationConversionData() {
  return useDailyTableData<QuotationConversionRow>({
    tableName: TABLE_NAME,
    dateColumn: "request_date",
    selectColumns:
      "request_date,converted_requests,not_converted_requests,total_requests,avg_insurers_converted,avg_insurers_not_converted",
    cacheKey: "quotation-conversion-dashboard-cache-v1",
    queryKeyPrefix: "quotation-conversion-dashboard",
    mapSupabaseRow,
    mapCachedRow,
  });
}
