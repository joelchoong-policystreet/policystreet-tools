export type ConsumerRow = {
  day: string;
  year: number;
  dayDate: Date;
  newLeadsCnt: number;
  requestCnt: number;
  policyCnt: number;
  newPolicyCnt: number;
  returningPolicyCnt: number;
  totalAmount: number;
  newCustomerAmount: number;
  returningCustomerAmount: number;
};

export type Granularity = "day" | "week" | "month" | "year";
export type PeriodMode = "full_year" | "this_month" | "custom_range";
export type CountSeriesKey = "requestCnt" | "newLeadsCnt" | "policyCnt";
export type CountLegendSeriesKey = CountSeriesKey | "conversionRatePct";
export type RevenueSeriesKey = "newCustomerAmount" | "returningCustomerAmount" | "totalAmount";
export type CustomerSeriesKey = "newPolicyCnt" | "returningPolicyCnt";

export type SeriesPoint = {
  label: string;
  sortKey: string;
  newLeadsCnt: number;
  requestCnt: number;
  policyCnt: number;
  conversionRatePct: number;
  newPolicyCnt: number;
  returningPolicyCnt: number;
  totalCustomerCnt: number;
  totalAmount: number;
  newCustomerAmount: number;
  returningCustomerAmount: number;
};

export type ConsumerDataFingerprint = { count: number; maxUpdatedAt: string | null };

export type QuotationConversionRow = {
  day: string;
  year: number;
  dayDate: Date;
  convertedRequests: number;
  notConvertedRequests: number;
  totalRequests: number;
  avgInsurersConverted: number;
  avgInsurersNotConverted: number;
};

export type InsurerSeriesKey = "avgInsurersConverted" | "avgInsurersNotConverted";

export type QuotationConversionSeriesPoint = {
  label: string;
  sortKey: string;
  convertedRequests: number;
  notConvertedRequests: number;
  totalRequests: number;
  avgInsurersConverted: number;
  avgInsurersNotConverted: number;
};

export type UtmVehicleCountRow = {
  day: string;
  year: number;
  dayDate: Date;
  totalRequests: number;
  totalVehicleNo: number;
  totalSales: number;
};

export type UtmVehicleCountSeriesKey = "totalRequests" | "totalVehicleNo" | "totalSales";
export type UtmVehicleCountLegendSeriesKey = UtmVehicleCountSeriesKey | "conversionPct";

export type UtmVehicleCountSeriesPoint = {
  label: string;
  sortKey: string;
  totalRequests: number;
  totalVehicleNo: number;
  totalSales: number;
  conversionPct: number;
};
