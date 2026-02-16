import Papa from "papaparse";

export type IMotorbikeRow = {
  purchasedDate: string;
  plateNo: string;
  customer: string;
  instantQuotation: string;
  insurer: string;
  coverage: string;
  timeLapsed: string;
  partner: string;
};

const HEADER_MAP: Record<string, keyof IMotorbikeRow> = {
  "purchased date": "purchasedDate",
  "purchaseddate": "purchasedDate",
  "date": "purchasedDate",
  "plate no": "plateNo",
  "plate no.": "plateNo",
  "plateno": "plateNo",
  "plate": "plateNo",
  "customer": "customer",
  "instant quotation": "instantQuotation",
  "instantquotation": "instantQuotation",
  "quotation": "instantQuotation",
  "insurer": "insurer",
  "coverage": "coverage",
  "time lapsed": "timeLapsed",
  "timelapsed": "timeLapsed",
  "time": "timeLapsed",
  "partner": "partner",
};

const DEFAULT_ROW: IMotorbikeRow = {
  purchasedDate: "",
  plateNo: "",
  customer: "",
  instantQuotation: "",
  insurer: "",
  coverage: "",
  timeLapsed: "",
  partner: "",
};

function normalizeHeader(header: string): keyof IMotorbikeRow | null {
  const key = header.toLowerCase().trim().replace(/\s+/g, " ");
  return HEADER_MAP[key] ?? null;
}

function mapRow(raw: Record<string, string>): IMotorbikeRow {
  const row = { ...DEFAULT_ROW };
  for (const [header, value] of Object.entries(raw)) {
    const field = normalizeHeader(header);
    if (field) row[field] = value?.trim() ?? "";
  }
  return row;
}

export function parseIMotorbikeCSV(file: File): Promise<IMotorbikeRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          reject(results.errors[0]);
          return;
        }
        resolve(results.data.map(mapRow));
      },
      error: (err) => reject(err),
    });
  });
}
