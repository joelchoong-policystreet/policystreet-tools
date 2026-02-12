export interface ReportRow {
  reportId: string;
  date: string;
  itemName: string;
  quantity: number;
  amount: number;
  status: string;
}

export const COLUMNS = [
  { key: "reportId", label: "Report ID" },
  { key: "date", label: "Date" },
  { key: "itemName", label: "Item Name" },
  { key: "quantity", label: "Quantity" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
] as const;

export const SAMPLE_DATA: ReportRow[] = [
  { reportId: "RPT-001", date: "2026-01-15", itemName: "Office Chairs", quantity: 12, amount: 3600, status: "Delivered" },
  { reportId: "RPT-002", date: "2026-01-18", itemName: "Standing Desks", quantity: 8, amount: 6400, status: "Pending" },
  { reportId: "RPT-003", date: "2026-01-22", itemName: "Monitor Arms", quantity: 20, amount: 1800, status: "Delivered" },
  { reportId: "RPT-004", date: "2026-02-01", itemName: "Keyboards", quantity: 30, amount: 2100, status: "In Transit" },
  { reportId: "RPT-005", date: "2026-02-05", itemName: "Webcams", quantity: 15, amount: 1350, status: "Delivered" },
  { reportId: "RPT-006", date: "2026-02-08", itemName: "Headsets", quantity: 25, amount: 2250, status: "Pending" },
];
