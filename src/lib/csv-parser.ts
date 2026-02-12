import Papa from "papaparse";
import type { ReportRow } from "./sample-data";

const HEADER_MAP: Record<string, string> = {
  "report id": "reportId",
  "reportid": "reportId",
  "id": "reportId",
  "date": "date",
  "item name": "itemName",
  "itemname": "itemName",
  "item": "itemName",
  "name": "itemName",
  "quantity": "quantity",
  "qty": "quantity",
  "amount": "amount",
  "price": "amount",
  "status": "status",
};

function processResults(results: Papa.ParseResult<Record<string, string>>): ReportRow[] {
  return results.data.map((row) => ({
    reportId: row.reportId || "",
    date: row.date || "",
    itemName: row.itemName || "",
    quantity: Number(row.quantity) || 0,
    amount: Number(row.amount) || 0,
    status: row.status || "",
  }));
}

export function parseCSV(input: string | File): Promise<ReportRow[]> {
  return new Promise((resolve, reject) => {
    const common = {
      header: true as const,
      skipEmptyLines: true as const,
      transformHeader: (header: string) => HEADER_MAP[header.toLowerCase().trim()] || header,
    };

    if (typeof input === "string") {
      const results = Papa.parse<Record<string, string>>(input, common);
      if (results.errors.length) return reject(results.errors[0]);
      resolve(processResults(results));
    } else {
      Papa.parse<Record<string, string>>(input, {
        ...common,
        complete: (results) => resolve(processResults(results)),
        error: (err) => reject(err),
      });
    }
  });
}
