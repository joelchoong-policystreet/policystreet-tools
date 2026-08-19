import type {
  CountSeriesKey,
  RevenueSeriesKey,
  CustomerSeriesKey,
  InsurerSeriesKey,
  UtmVehicleCountSeriesKey,
} from "../types";

export const COUNT_SERIES_KEYS: readonly CountSeriesKey[] = ["requestCnt", "newLeadsCnt", "policyCnt"] as const;
export const LEADS_POLICY_SERIES_KEYS: readonly CountSeriesKey[] = ["newLeadsCnt", "policyCnt"] as const;
export const REVENUE_SERIES_KEYS: readonly RevenueSeriesKey[] = [
  "newCustomerAmount",
  "returningCustomerAmount",
  "totalAmount",
] as const;
export const CUSTOMER_SERIES_KEYS: readonly CustomerSeriesKey[] = ["newPolicyCnt", "returningPolicyCnt"] as const;
export const INSURER_SERIES_KEYS: readonly InsurerSeriesKey[] = [
  "avgInsurersConverted",
  "avgInsurersNotConverted",
] as const;
export const UTM_VEHICLE_COUNT_SERIES_KEYS: readonly UtmVehicleCountSeriesKey[] = [
  "totalRequests",
  "totalVehicleNo",
  "totalSales",
] as const;
