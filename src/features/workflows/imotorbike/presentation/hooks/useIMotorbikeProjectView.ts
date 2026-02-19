import { useMemo, useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/data/supabase/client";
import type { Tables, TablesInsert } from "@/data/supabase/types";
import type { Tables as IntTables, TablesInsert as IntTablesInsert } from "@/integrations/supabase/types";
import { parseIMotorbikeCSV, type IMotorbikeRow } from "@/lib/imotorbike-csv";
import {
  parsePurchasedDateTime,
  parseBillingDate,
  toISODateOnly,
  filterByDateRange,
  getFilterLabel,
  type FilterPreset,
  type DateRange,
} from "@/features/workflows/imotorbike/lib/date-utils";

export type TabKind = "issuance" | "insurer_billing" | "ocr" | "errors";
export type InsurerBillingRow = IntTables<"insurer_billing_data">;
export type OcrRow = Tables<"ocr_data">;
export type UploadErrorRow = IntTables<"upload_errors">;

function parseNumeric(s: string | null): number | null {
  if (s == null || String(s).trim() === "") return null;
  const n = parseFloat(String(s).replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

const PAGE_SIZE = 50;

function getBefore6PMCount(rows: IMotorbikeRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDateTime(r.purchasedDate);
    return d ? d.getHours() < 18 : false;
  }).length;
}

function getAfter6PMCount(rows: IMotorbikeRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDateTime(r.purchasedDate);
    return d ? d.getHours() >= 18 : false;
  }).length;
}

async function fetchIMotorbikeCompany(): Promise<{ id: string; name: string } | null> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .ilike("name", "iMotorbike")
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchInsurerBillingForCompany(companyId: string): Promise<InsurerBillingRow[]> {
  try {
    const { data, error } = await supabase
      .from("insurer_billing_data")
      .select("*")
      .eq("company_id", companyId)
      .order("issue_date", { ascending: true, nullsFirst: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function fetchOcrForCompany(companyId: string): Promise<OcrRow[]> {
  try {
    const { data, error } = await supabase
      .from("ocr_data")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function fetchUploadErrorsForCompany(companyId: string): Promise<UploadErrorRow[]> {
  try {
    const { data, error } = await supabase
      .from("upload_errors")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export function useIMotorbikeProjectView() {
  const { workflowId, projectId } = useParams<{ workflowId: string; projectId: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKind>("issuance");
  const [rows, setRows] = useState<IMotorbikeRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("all_time");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInsurerBilling, setSelectedInsurerBilling] = useState<string | null>(null);
  const [billingSearchQuery, setBillingSearchQuery] = useState("");
  const [ocrSearchQuery, setOcrSearchQuery] = useState("");
  const [errorsSearchQuery, setErrorsSearchQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [billingUploadError, setBillingUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const billingFileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const billingUploadInsurerRef = useRef<string | null>(null);

  const { data: iMotorbikeCompany } = useQuery({
    queryKey: ["company-imotorbike"],
    queryFn: fetchIMotorbikeCompany,
    enabled: projectId === "imotorbike",
  });
  const companyId = iMotorbikeCompany?.id ?? null;

  const { data: insurerBillingRows = [], isLoading: isLoadingBilling, error: errorBilling } = useQuery({
    queryKey: ["imotorbike-insurer-billing", companyId],
    queryFn: () => fetchInsurerBillingForCompany(companyId!),
    enabled: activeTab === "insurer_billing" && !!companyId,
  });

  const { data: ocrRows = [], isLoading: isLoadingOcr, error: errorOcr } = useQuery({
    queryKey: ["imotorbike-ocr", companyId],
    queryFn: () => fetchOcrForCompany(companyId!),
    enabled: activeTab === "ocr" && !!companyId,
  });

  const { data: uploadErrorRows = [], isLoading: isLoadingErrors, error: errorErrors } = useQuery({
    queryKey: ["imotorbike-upload-errors", companyId],
    queryFn: () => fetchUploadErrorsForCompany(companyId!),
    enabled: activeTab === "errors" && !!companyId,
  });

  useEffect(() => setCurrentPage(1), [activeTab]);
  useEffect(() => setCurrentPage(1), [searchQuery, billingSearchQuery, ocrSearchQuery, errorsSearchQuery]);

  const dateFilteredRows = useMemo(
    () => filterByDateRange(rows, filterPreset, customRange, (r) => parsePurchasedDateTime(r.purchasedDate)),
    [rows, filterPreset, customRange]
  );

  const insurerOptions = useMemo(() => {
    const set = new Set(dateFilteredRows.map((r) => r.insurer).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dateFilteredRows]);

  useEffect(() => {
    if (selectedInsurer && insurerOptions.length > 0 && !insurerOptions.includes(selectedInsurer)) {
      setSelectedInsurer(null);
    }
  }, [selectedInsurer, insurerOptions]);

  const filteredRows = useMemo(() => {
    let filtered = dateFilteredRows;
    if (selectedInsurer) filtered = filtered.filter((r) => r.insurer === selectedInsurer);
    return [...filtered].sort((a, b) => {
      const da = parsePurchasedDateTime(a.purchasedDate)?.getTime() ?? 0;
      const db = parsePurchasedDateTime(b.purchasedDate)?.getTime() ?? 0;
      return sortAsc ? da - db : db - da;
    });
  }, [dateFilteredRows, selectedInsurer, sortAsc]);

  const searchFilteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter(
      (r) =>
        (r.customer ?? "").toLowerCase().includes(q) ||
        (r.plateNo ?? "").toLowerCase().includes(q) ||
        (r.instantQuotation ?? "").toLowerCase().includes(q) ||
        (r.insurer ?? "").toLowerCase().includes(q) ||
        (r.coverage ?? "").toLowerCase().includes(q) ||
        (r.partner ?? "").toLowerCase().includes(q)
    );
  }, [filteredRows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(searchFilteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return searchFilteredRows.slice(start, start + PAGE_SIZE);
  }, [searchFilteredRows, currentPage]);

  const before6PM = useMemo(() => getBefore6PMCount(searchFilteredRows), [searchFilteredRows]);
  const after6PM = useMemo(() => getAfter6PMCount(searchFilteredRows), [searchFilteredRows]);
  const totalIssuances = searchFilteredRows.length;

  const getBillingIssueDate = (r: InsurerBillingRow): Date | null => {
    const d = r.issue_date ?? r.transaction_date;
    return d ? new Date(d) : null;
  };

  const billingDateFiltered = useMemo(
    () => filterByDateRange(insurerBillingRows, filterPreset, customRange, getBillingIssueDate),
    [insurerBillingRows, filterPreset, customRange]
  );

  const billingInsurerOptions = useMemo(() => {
    const set = new Set(billingDateFiltered.map((r) => r.insurer).filter(Boolean));
    return Array.from(set).sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  }, [billingDateFiltered]);

  useEffect(() => {
    if (selectedInsurerBilling && billingInsurerOptions.length > 0 && !billingInsurerOptions.includes(selectedInsurerBilling)) {
      setSelectedInsurerBilling(null);
    }
  }, [selectedInsurerBilling, billingInsurerOptions]);

  const billingFiltered = useMemo(() => {
    let filtered = billingDateFiltered;
    if (selectedInsurerBilling) filtered = filtered.filter((r) => r.insurer === selectedInsurerBilling);
    return [...filtered].sort((a, b) => {
      const da = getBillingIssueDate(a)?.getTime() ?? 0;
      const db = getBillingIssueDate(b)?.getTime() ?? 0;
      return sortAsc ? da - db : db - da;
    });
  }, [billingDateFiltered, selectedInsurerBilling, sortAsc]);

  const billingSearchFiltered = useMemo(() => {
    const q = billingSearchQuery.trim().toLowerCase();
    if (!q) return billingFiltered;
    return billingFiltered.filter(
      (r) =>
        (r.client_name ?? "").toLowerCase().includes(q) ||
        (r.vehicle_no ?? "").toLowerCase().includes(q) ||
        (r.policy_no ?? "").toLowerCase().includes(q) ||
        (r.cn_no ?? "").toLowerCase().includes(q) ||
        (r.account_no ?? "").toLowerCase().includes(q) ||
        (r.quotation ?? "").toLowerCase().includes(q)
    );
  }, [billingFiltered, billingSearchQuery]);

  const billingTotalPages = Math.max(1, Math.ceil(billingSearchFiltered.length / PAGE_SIZE));
  const billingPaginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return billingSearchFiltered.slice(start, start + PAGE_SIZE);
  }, [billingSearchFiltered, currentPage]);

  const ocrSorted = useMemo(
    () =>
      [...ocrRows].sort(
        (a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * (sortAsc ? 1 : -1)
      ),
    [ocrRows, sortAsc]
  );
  const ocrSearchFiltered = useMemo(() => {
    const q = ocrSearchQuery.trim().toLowerCase();
    if (!q) return ocrSorted;
    return ocrSorted.filter(
      (r) =>
        (r.document_reference ?? "").toLowerCase().includes(q) ||
        (r.extracted_text ?? "").toLowerCase().includes(q) ||
        (r.source_filename ?? "").toLowerCase().includes(q)
    );
  }, [ocrSorted, ocrSearchQuery]);
  const ocrTotalPages = Math.max(1, Math.ceil(ocrSearchFiltered.length / PAGE_SIZE));
  const ocrPaginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return ocrSearchFiltered.slice(start, start + PAGE_SIZE);
  }, [ocrSearchFiltered, currentPage]);

  const errorsSearchFiltered = useMemo(() => {
    const q = errorsSearchQuery.trim().toLowerCase();
    if (!q) return uploadErrorRows;
    return uploadErrorRows.filter((r) => {
      const raw = r.raw_data as Record<string, unknown>;
      const str = typeof raw === "object" && raw
        ? JSON.stringify(Object.values(raw)).toLowerCase()
        : String(raw).toLowerCase();
      return (
        str.includes(q) ||
        (r.rejection_reason ?? "").toLowerCase().includes(q) ||
        (r.source ?? "").toLowerCase().includes(q) ||
        (r.file_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [uploadErrorRows, errorsSearchQuery]);
  const errorsTotalPages = Math.max(1, Math.ceil(errorsSearchFiltered.length / PAGE_SIZE));
  const errorsPaginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return errorsSearchFiltered.slice(start, start + PAGE_SIZE);
  }, [errorsSearchFiltered, currentPage]);

  const filterLabel = getFilterLabel(filterPreset, customRange);

  const handleIssuanceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseIMotorbikeCSV(file);
      setRows(data);
      setLastUpdated(new Date());
      setCurrentPage(1);
      toast({ title: "Upload successful", description: `${data.length} row(s) imported.` });
    } catch (err) {
      console.error(err);
    }
    e.target.value = "";
  };

  const prepareBillingUpload = (insurer: string) => {
    setBillingUploadError(null);
    billingUploadInsurerRef.current = insurer;
  };

  const handleBillingFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    const insurerForUpload = billingUploadInsurerRef.current;
    billingUploadInsurerRef.current = null;
    setBillingUploadError(null);
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const headers = (parsed.meta.fields ?? []).filter((h) => h != null && String(h).trim() !== "");
      const headerMap = new Map<string, string>();
      const norm = (s: string) => String(s).toLowerCase().trim().replace(/\s+/g, " ");
      headers.forEach((h) => headerMap.set(norm(h), String(h)));
      const get = (raw: Record<string, string>, ...keys: string[]) => {
        for (const k of keys) {
          const key = String(k).toLowerCase().trim().replace(/\s+/g, " ");
          const orig = headerMap.get(key);
          if (orig === undefined) continue;
          const val = raw[orig];
          if (val !== undefined && val !== null) return String(val).trim() || null;
        }
        return null;
      };
      const getSumInsured = (raw: Record<string, string>) => {
        const v = get(raw, "sum insured (rm)", "sum insured(rm)", "sum insured", "sum_insured");
        if (v !== null) return v;
        for (const h of headers) {
          const n = norm(h);
          const isSumInsured =
            (n.includes("sum") && n.includes("insured") && n !== "name of insured") ||
            n.includes("insured amount") ||
            n.includes("insured value") ||
            n === "si" ||
            /^si\s*\(?rm\)?$/i.test(n);
          if (isSumInsured) {
            const val = raw[h];
            if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
          }
        }
        return null;
      };
      const getDateForIssue = (raw: Record<string, string>) => {
        const v = get(
          raw,
          "issue date",
          "issue_date",
          "date",
          "transaction date",
          "transaction_date",
          "trans date",
          "date time",
          "datetime"
        );
        if (v !== null) return v;
        for (const h of headers) {
          const n = norm(h);
          if (
            n === "date" ||
            n === "transaction_date" ||
            (n.includes("issue") && n.includes("date")) ||
            (n.includes("transaction") && n.includes("date")) ||
            (n.includes("date") && n.includes("time"))
          ) {
            const val = raw[h];
            if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
          }
        }
        return null;
      };
      const dataRows = (parsed.data ?? []).filter(
        (raw) => Object.values(raw).some((v) => v != null && String(v).trim() !== "")
      );
      // Only insert rows that have a valid issue/transaction date (avoid null issue_date)
      const rowsWithDate = dataRows.filter((raw) => {
        const dateVal = getDateForIssue(raw);
        return dateVal !== null && toISODateOnly(dateVal) !== null;
      });
      const rejectedRows = dataRows.filter((raw) => {
        const dateVal = getDateForIssue(raw);
        return dateVal === null || toISODateOnly(dateVal) === null;
      });
      const skippedNoDate = rejectedRows.length;
      if (rejectedRows.length > 0 && companyId) {
        const errorInserts = rejectedRows.map((raw) => ({
          company_id: companyId,
          source: "insurer_billing",
          raw_data: raw as IntTables<"upload_errors">["raw_data"],
          rejection_reason: "No valid date",
          file_name: file.name,
        }));
        await supabase.from("upload_errors").insert(errorInserts);
      }
      const firstRow = dataRows[0];
      const detectedInsurer =
        insurerForUpload ??
        get(firstRow ?? {}, "insurer") ??
        (file.name.toLowerCase().includes("generali") ? "Generali" :
         file.name.toLowerCase().includes("allianz") ? "Allianz" : "Unknown");

      const toInsert: IntTablesInsert<"insurer_billing_data">[] = rowsWithDate.map((raw) => ({
        company_id: companyId,
        insurer: get(raw, "insurer") ?? detectedInsurer,
        row_number: get(raw, "no.", "no") ?? null,
        policy_no: get(raw, "policy no.", "policy no", "policy_no") ?? null,
        client_name: get(raw, "name of insured", "client", "client_name") ?? null,
        vehicle_no: get(raw, "vehicle no", "vehicle no.", "vehicle_no") ?? null,
        status: get(raw, "status", "trx status", "trx_status") ?? null,
        sum_insured: parseNumeric(getSumInsured(raw)),
        cn_no: get(raw, "c/n no.", "c/n no", "cn_no") ?? null,
        account_no: get(raw, "account no.", "account no", "account_no") ?? null,
        issue_date: toISODateOnly(getDateForIssue(raw)),
        issued_by: get(raw, "issued by", "issued_by") ?? null,
        type: get(raw, "type") ?? null,
        effective_date: toISODateOnly(get(raw, "effective date", "effective_date")),
        expiry_date: toISODateOnly(get(raw, "expiry date", "expiry_date")),
        vehicle_type: get(raw, "vehicle type", "vehicle_type") ?? null,
        coverage_type: get(raw, "coverage type", "coverage_type") ?? null,
        chassis: get(raw, "chassis") ?? null,
        jpj_status: get(raw, "jpj status", "jpj_status") ?? null,
        gross_premium: parseNumeric(get(raw, "gross premium (rm)", "gross premium", "gross_premium")),
        rebate: parseNumeric(get(raw, "rebate (rm)", "rebate")),
        gst: parseNumeric(get(raw, "gst (rm)", "gst")),
        service_tax: parseNumeric(get(raw, "serv. tax (rm)", "serv. tax", "service_tax")),
        stamp: parseNumeric(get(raw, "stamp (rm)", "stamp")),
        premium_due: parseNumeric(get(raw, "premium due (rm)", "premium due", "premium_due")),
        commission: parseNumeric(get(raw, "commission (rm)", "commission")),
        gst_commission: parseNumeric(get(raw, "gst commission (rm)", "gst commission", "gst_commission")),
        nett_premium: parseNumeric(get(raw, "nett premium (rm)", "nett premium", "nett_premium")),
        amount_payable: parseNumeric(get(raw, "amount payable (rounded) (rm)", "amount payable", "amount_payable")),
        ptv_amount: parseNumeric(get(raw, "ptv amount", "ptv_amount")),
        premium_due_after_ptv: parseNumeric(get(raw, "premium due after ptv", "premium_due_after_ptv")),
        agent_code: get(raw, "agent code", "agent_code") ?? null,
        user_id: get(raw, "userid", "user_id") ?? null,
        transaction_date: toISODateOnly(getDateForIssue(raw)),
        transaction_time: get(raw, "time") ?? null,
        class_product: get(raw, "class & product", "class_product") ?? null,
        quotation: get(raw, "quotation") ?? null,
        repl_prev_no: get(raw, "repl/prev no.", "repl/prev no", "repl_prev_no") ?? null,
        trx_status: get(raw, "trx status", "trx_status") ?? null,
        total_amount: parseNumeric(get(raw, "totalamt", "total_amount")),
      }));
      if (toInsert.length > 0) {
        const rows = toInsert.map((row) =>
          Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined))
        ) as IntTablesInsert<"insurer_billing_data">[];
        const { error: err } = await supabase.from("insurer_billing_data").insert(rows);
        if (err) throw err;
        await queryClient.invalidateQueries({ queryKey: ["imotorbike-insurer-billing", companyId] });
        if (rejectedRows.length > 0) {
          await queryClient.invalidateQueries({ queryKey: ["imotorbike-upload-errors", companyId] });
        }
        const desc =
          skippedNoDate > 0
            ? `${rows.length} billing row(s) imported. ${skippedNoDate} row(s) skipped (no valid date).`
            : `${rows.length} billing row(s) imported.`;
        toast({ title: "Upload successful", description: desc });
      }
    } catch (err) {
      const msg =
        (err as { message?: string; details?: string })?.message ??
        (err instanceof Error ? err.message : null);
      const details = (err as { details?: string })?.details;
      setBillingUploadError(
        [msg, details].filter(Boolean).join(details ? " — " : "") || "Upload failed"
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const ocrDataRows = (parsed.data ?? []).filter(
        (raw) => Object.values(raw).some((v) => v != null && String(v).trim() !== "")
      );
      const normalize = (h: string) => h?.toLowerCase().replace(/\s+/g, "_").trim() ?? "";
      const toInsert = ocrDataRows.map((raw) => {
        const get = (keys: string[]) => keys.map((k) => raw[normalize(k)] ?? raw[k]).find(Boolean);
        return {
          company_id: companyId,
          document_reference: get(["document_reference", "ref", "id"]) ?? null,
          extracted_text: get(["extracted_text", "extracted text", "text", "content"]) ?? null,
          source_filename: get(["source_filename", "filename", "file"]) ?? file.name ?? null,
        } as TablesInsert<"ocr_data">;
      });
      if (toInsert.length > 0) {
        const { error: err } = await supabase.from("ocr_data").insert(toInsert);
        if (err) throw err;
        await queryClient.invalidateQueries({ queryKey: ["imotorbike-ocr", companyId] });
        toast({ title: "Upload successful", description: `${toInsert.length} OCR row(s) imported.` });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return {
    workflowId,
    projectId,
    activeTab,
    setActiveTab,
    filterPreset,
    setFilterPreset,
    customRange,
    setCustomRange,
    selectedInsurer,
    setSelectedInsurer,
    selectedInsurerBilling,
    setSelectedInsurerBilling,
    sortAsc,
    setSortAsc,
    currentPage,
    setCurrentPage,
    uploading,
    fileInputRef,
    billingFileInputRef,
    ocrFileInputRef,
    companyId,
    filterLabel,
    pageSize: PAGE_SIZE,
    // Issuance tab
    rows,
    lastUpdated,
    insurerOptions,
    searchQuery,
    setSearchQuery,
    paginatedRows,
    searchFilteredRows,
    totalPages,
    before6PM,
    after6PM,
    totalIssuances,
    handleIssuanceFileChange,
    // Billing tab
    insurerBillingRows,
    isLoadingBilling,
    errorBilling,
    billingUploadError,
    billingInsurerOptions,
    billingSearchQuery,
    setBillingSearchQuery,
    billingSearchFiltered,
    billingPaginated,
    billingTotalPages,
    prepareBillingUpload,
    handleBillingFileChange,
    // OCR tab
    ocrRows,
    ocrSearchQuery,
    setOcrSearchQuery,
    ocrSearchFiltered,
    isLoadingOcr,
    errorOcr,
    ocrSorted,
    ocrPaginated,
    ocrTotalPages,
    handleOcrFileChange,
    // Errors tab
    uploadErrorRows,
    errorsSearchQuery,
    setErrorsSearchQuery,
    errorsSearchFiltered,
    errorsPaginated,
    errorsTotalPages,
    isLoadingErrors,
    errorErrors,
  };
}
