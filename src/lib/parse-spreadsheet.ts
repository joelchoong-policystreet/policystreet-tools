import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Parse a spreadsheet file (CSV, XLS, or XLSX) into an array of row objects.
 * Each row is Record<string, string> with header names as keys.
 */
export async function parseSpreadsheetToRows(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const headers = (parsed.meta.fields ?? []).filter(
      (h) => h != null && String(h).trim() !== ""
    );
    const rows = (parsed.data ?? []).filter(
      (raw) => Object.values(raw).some((v) => v != null && String(v).trim() !== "")
    );
    return { headers, rows };
  }

  if (ext === "xls" || ext === "xlsx") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { headers: [], rows: [] };
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      raw: false,
    });
    if (rows.length === 0) return { headers: [], rows: [] };
    const headers = Object.keys(rows[0] ?? {});
    const stringRows: Record<string, string>[] = rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = v == null ? "" : String(v).trim();
      }
      return out;
    });
    const filtered = stringRows.filter((raw) =>
      Object.values(raw).some((v) => v !== "")
    );
    return { headers, rows: filtered };
  }

  throw new Error(`Unsupported file type: ${ext}. Use CSV, XLS, or XLSX.`);
}
