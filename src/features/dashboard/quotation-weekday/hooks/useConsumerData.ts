import { parseISO } from "date-fns";
import type { ConsumerRow } from "../types";
import { useDailyTableData } from "./useDailyTableData";

const TABLE_NAME = "consumer_data_daily";

function mapSupabaseRow(r: any): ConsumerRow | null {
  const day = String(r.date ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsedDay = parseISO(day);
  if (Number.isNaN(parsedDay.getTime())) return null;
  return {
    day,
    year: parsedDay.getFullYear(),
    dayDate: parsedDay,
    newLeadsCnt: Number(r.leads_cnt ?? 0),
    requestCnt: Number(r.request_cnt ?? 0),
    policyCnt: Number(r.policy_cnt ?? 0),
    newPolicyCnt: Number(r.new_policy ?? 0),
    returningPolicyCnt: Number(r.returning_policy ?? 0),
    totalAmount: Number(r.total_amount ?? 0),
    newCustomerAmount: Number(r.new_customer_amount ?? 0),
    returningCustomerAmount: Number(r.returning_customer_amount ?? 0),
  } satisfies ConsumerRow;
}

function mapCachedRow(raw: unknown): ConsumerRow | null {
  const record = raw as Partial<ConsumerRow> & Record<string, unknown>;
  const day = String(record.day ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsedDay = parseISO(day);
  if (Number.isNaN(parsedDay.getTime())) return null;
  return {
    day,
    year: Number.isFinite(Number(record.year)) ? Number(record.year) : parsedDay.getFullYear(),
    dayDate: parsedDay,
    newLeadsCnt: Number(record.newLeadsCnt ?? 0),
    requestCnt: Number(record.requestCnt ?? 0),
    policyCnt: Number(record.policyCnt ?? 0),
    newPolicyCnt: Number(record.newPolicyCnt ?? 0),
    returningPolicyCnt: Number(record.returningPolicyCnt ?? 0),
    totalAmount: Number(record.totalAmount ?? 0),
    newCustomerAmount: Number(record.newCustomerAmount ?? 0),
    returningCustomerAmount: Number(record.returningCustomerAmount ?? 0),
  } satisfies ConsumerRow;
}

export function useConsumerData() {
  return useDailyTableData<ConsumerRow>({
    tableName: TABLE_NAME,
    dateColumn: "date",
    selectColumns:
      "date,leads_cnt,request_cnt,policy_cnt,new_policy,returning_policy,total_amount,new_customer_amount,returning_customer_amount",
    cacheKey: "consumer-data-dashboard-cache-v3",
    queryKeyPrefix: "consumer-data-dashboard",
    mapSupabaseRow,
    mapCachedRow,
  });
}
