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

/** Normalize date to YYYY-MM-DD for consistent matching across different formats (Issue Date, Date issue, etc.). */
function toDateKey(value: string | null | undefined): string {
  const s = value != null ? String(value).trim() : "";
  return toISODateOnly(s || null) ?? "";
}

export type TabKind = "issuance" | "insurer_billing" | "ocr" | "errors";
export type InsurerBillingRow = IntTables<"insurer_billing_data">;
export type OcrRow = Tables<"ocr_data_table">;
export type IssuanceRow = IntTables<"imotorbike_billing_normalised"> & {
  insurer_billing_data: { insurer: string } | null;
};
export type UploadErrorRow = IntTables<"upload_errors">;

function parseNumeric(s: string | null): number | null {
  if (s == null || String(s).trim() === "") return null;
  const n = parseFloat(String(s).replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

const PAGE_SIZE = 50;

function getCompleteDataCount(rows: IssuanceRow[], verificationStatuses: Record<string, string>): number {
  return rows.filter((r) => {
    const isCompleteAmount = r.total_amount_payable != null && String(r.total_amount_payable).trim() !== "";
    const isVerifiedStatus = verificationStatuses[r.id] === "cancelled_billed";
    return isCompleteAmount || isVerifiedStatus;
  }).length;
}

function getIncompleteDataCount(rows: IssuanceRow[], verificationStatuses: Record<string, string>): number {
  return rows.filter((r) => {
    const isEmptyAmount = r.total_amount_payable == null || String(r.total_amount_payable).trim() === "";
    const isPendingStatus = !verificationStatuses[r.id] || verificationStatuses[r.id] === "pending";
    return isEmptyAmount && isPendingStatus;
  }).length;
}

function getCancelledDataCount(rows: IssuanceRow[], verificationStatuses: Record<string, string>): number {
  return rows.filter((r) => verificationStatuses[r.id] === "cancelled_not_billed").length;
}

const PROJECT_COMPANY_NAMES: Record<string, string> = {
  imotorbike: "iMotorbike",
  carsome: "Carsome",
};

async function fetchCompanyForProject(projectId: string): Promise<{ id: string; name: string } | null> {
  const companyName = PROJECT_COMPANY_NAMES[projectId];
  if (!companyName) return null;
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .ilike("name", companyName)
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchIssuancesForProject(
  companyId: string,
  projectId: string
): Promise<IssuanceRow[]> {
  try {
    const filter =
      projectId === "imotorbike"
        ? "project.eq.imotorbike,project.is.null"
        : `project.eq.${projectId}`;
    const { data, error } = await supabase
      .from("imotorbike_billing_normalised" as any)
      .select(`
        *,
        insurer_billing_data(insurer)
      `)
      .eq("company_id", companyId)
      .or(filter)
      .order("issue_date", { ascending: false });
    if (error) return [];
    return (data ?? []) as any as IssuanceRow[];
  } catch {
    return [];
  }
}

async function fetchInsurerBillingForProject(
  companyId: string,
  projectId: string
): Promise<InsurerBillingRow[]> {
  try {
    const filter =
      projectId === "imotorbike"
        ? "project.eq.imotorbike,project.is.null"
        : `project.eq.${projectId}`;
    const { data, error } = await supabase
      .from("insurer_billing_data" as any)
      .select("*")
      .eq("company_id", companyId)
      .or(filter)
      .order("issue_date", { ascending: true, nullsFirst: false });
    if (error) return [];
    return (data ?? []) as any as InsurerBillingRow[];
  } catch {
    return [];
  }
}

async function fetchOcrForProject(
  companyId: string,
  projectId: string
): Promise<OcrRow[]> {
  try {
    const projectFilter =
      projectId === "imotorbike"
        ? "project.eq.imotorbike,project.is.null"
        : `project.eq.${projectId}`;
    const { data, error } = await supabase
      .from("ocr_data_table")
      .select("*")
      .eq("company_id", companyId)
      .or(projectFilter)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as OcrRow[];
  } catch {
    return [];
  }
}

async function fetchUploadErrorsForProject(
  companyId: string,
  projectId: string
): Promise<UploadErrorRow[]> {
  try {
    const { data, error } = await supabase
      .from("upload_errors" as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("workflow", projectId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data as any as UploadErrorRow[];
  } catch {
    return [];
  }
}

export function useIMotorbikeProjectView() {
  const { workflowId, projectId } = useParams<{ workflowId: string; projectId: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKind>("issuance");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [issuanceFilter, setIssuanceFilter] = useState<"all" | "incomplete" | "cancelled" | "complete">("complete");

  const [filterPreset, setFilterPreset] = useState<FilterPreset>("all_time");

  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInsurerBilling, setSelectedInsurerBilling] = useState<string | null>(null);
  const [billingSearchQuery, setBillingSearchQuery] = useState("");
  const [ocrSearchQuery, setOcrSearchQuery] = useState("");
  const [ocrSortBy, setOcrSortBy] = useState<"date_issue" | "created_at">("date_issue");
  const [ocrSortAsc, setOcrSortAsc] = useState(true);
  const [errorsSearchQuery, setErrorsSearchQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [billingUploadError, setBillingUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const billingFileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const billingUploadInsurerRef = useRef<string | null>(null);

  const { data: projectCompany } = useQuery({
    queryKey: ["company-project", projectId],
    queryFn: () => fetchCompanyForProject(projectId!),
    enabled: !!projectId,
  });
  const companyId = projectCompany?.id ?? null;

  const { data: rows = [], isLoading: isLoadingIssuance } = useQuery({
    queryKey: ["issuances", companyId, projectId],
    queryFn: () => fetchIssuancesForProject(companyId!, projectId!),
    enabled: activeTab === "issuance" && !!companyId && !!projectId,
  });

  // Seed from DB rows, then allow local overrides for instant UI feedback
  const [verificationStatusOverrides, setVerificationStatusOverrides] = useState<Record<string, string>>({});

  const verificationStatuses = useMemo<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    rows.forEach((r) => {
      base[r.id] = (r as any).verification_status || "pending";
    });
    return { ...base, ...verificationStatusOverrides };
  }, [rows, verificationStatusOverrides]);

  const handleVerificationStatusChange = (id: string, status: string) => {
    setVerificationStatusOverrides((prev) => ({ ...prev, [id]: status }));
    supabase
      .from("imotorbike_billing_normalised" as any)
      .update({ verification_status: status })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to save verification status:", error);
      });
  };

  const { data: insurerBillingRows = [], isLoading: isLoadingBilling, error: errorBilling } = useQuery({
    queryKey: ["insurer-billing", companyId, projectId],
    queryFn: () => fetchInsurerBillingForProject(companyId!, projectId!),
    enabled: activeTab === "insurer_billing" && !!companyId && !!projectId,
  });

  const { data: ocrRows = [], isLoading: isLoadingOcr, error: errorOcr } = useQuery({
    queryKey: ["ocr", companyId, projectId],
    queryFn: () => fetchOcrForProject(companyId!, projectId!),
    enabled: activeTab === "ocr" && !!companyId && !!projectId,
  });

  const { data: uploadErrorRows = [], isLoading: isLoadingErrors, error: errorErrors } = useQuery({
    queryKey: ["upload-errors", companyId, projectId],
    queryFn: () => fetchUploadErrorsForProject(companyId!, projectId!),
    enabled: activeTab === "errors" && !!companyId && !!projectId,
  });

  useEffect(() => setCurrentPage(1), [activeTab]);
  useEffect(() => setCurrentPage(1), [searchQuery, billingSearchQuery, ocrSearchQuery, errorsSearchQuery]);

  const dateFilteredRows = useMemo(
    () => filterByDateRange(rows, filterPreset, customRange, (r) => r.issue_date ? new Date(r.issue_date) : null),
    [rows, filterPreset, customRange]
  );

  const insurerOptions = useMemo(() => {
    const set = new Set(dateFilteredRows.map((r) => r.insurer_billing_data?.insurer).filter(Boolean));
    return Array.from(set).sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  }, [dateFilteredRows]);

  useEffect(() => {
    if (selectedInsurer && insurerOptions.length > 0 && !insurerOptions.includes(selectedInsurer)) {
      setSelectedInsurer(null);
    }
  }, [selectedInsurer, insurerOptions]);

  const filteredRows = useMemo(() => {
    let filtered = dateFilteredRows;
    if (selectedInsurer) filtered = filtered.filter((r) => r.insurer_billing_data?.insurer === selectedInsurer);
    return [...filtered].sort((a, b) => {
      const da = a.issue_date ? new Date(a.issue_date).getTime() : 0;
      const db = b.issue_date ? new Date(b.issue_date).getTime() : 0;
      return sortAsc ? da - db : db - da;
    });
  }, [dateFilteredRows, selectedInsurer, sortAsc]);

  const searchFilteredRows = useMemo(() => {
    let base = filteredRows;
    if (issuanceFilter === "incomplete") {
      base = base.filter((r) => {
        const isEmptyAmount = r.total_amount_payable == null || String(r.total_amount_payable).trim() === "";
        const isPendingStatus = !verificationStatuses[r.id] || verificationStatuses[r.id] === "pending";
        return isEmptyAmount && isPendingStatus;
      });
    } else if (issuanceFilter === "cancelled") {
      base = base.filter((r) => verificationStatuses[r.id] === "cancelled_not_billed");
    } else if (issuanceFilter === "complete") {
      base = base.filter((r) => {
        const isCompleteAmount = r.total_amount_payable != null && String(r.total_amount_payable).trim() !== "";
        const isVerifiedStatus = verificationStatuses[r.id] === "cancelled_billed";
        return isCompleteAmount || isVerifiedStatus;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        (r.client_name ?? "").toLowerCase().includes(q) ||
        (r.vehicle_no ?? "").toLowerCase().includes(q) ||
        (r.insurer_billing_data?.insurer ?? "").toLowerCase().includes(q)
    );
  }, [filteredRows, searchQuery, issuanceFilter, verificationStatuses]);

  const totalPages = Math.max(1, Math.ceil(searchFilteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return searchFilteredRows.slice(start, start + PAGE_SIZE);
  }, [searchFilteredRows, currentPage]);

  const completeData = useMemo(() => getCompleteDataCount(filteredRows, verificationStatuses), [filteredRows, verificationStatuses]);
  const incompleteData = useMemo(() => getIncompleteDataCount(filteredRows, verificationStatuses), [filteredRows, verificationStatuses]);
  const cancelledData = useMemo(() => getCancelledDataCount(filteredRows, verificationStatuses), [filteredRows, verificationStatuses]);
  const totalIssuances = filteredRows.length;

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

  const ocrSorted = useMemo(() => {
    return [...ocrRows].sort((a, b) => {
      let cmp = 0;
      if (ocrSortBy === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        const da = parseBillingDate(a.date_issue)?.getTime() ?? 0;
        const db = parseBillingDate(b.date_issue)?.getTime() ?? 0;
        cmp = da - db;
      }
      return ocrSortAsc ? cmp : -cmp;
    });
  }, [ocrRows, ocrSortBy, ocrSortAsc]);
  const ocrSearchFiltered = useMemo(() => {
    const q = ocrSearchQuery.trim().toLowerCase();
    if (!q) return ocrSorted;
    return ocrSorted.filter((r) => {
      const vals = [
        r.date_issue,
        r.vehicle_no,
        r.insured_name,
        r.insured_ic_no,
        r.insured_email,
        r.vehicle_make_model,
        r.type_of_cover,
        r.insurer,
        r.file_name,
      ];
      return vals.some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [ocrSorted, ocrSearchQuery]);
  const ocrLastUpdated = useMemo(() => {
    if (ocrRows.length === 0) return null;
    const max = ocrRows.reduce(
      (acc, r) => {
        const t = new Date(r.created_at).getTime();
        return t > acc ? t : acc;
      },
      0
    );
    return max > 0 ? new Date(max) : null;
  }, [ocrRows]);

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
        (r.file_name ?? "").toLowerCase().includes(q) ||
        (r.workflow ?? "").toLowerCase().includes(q)
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
    toast({ title: "Issuance Table", description: "Issuance data flows automatically from Supabase.", variant: "default" });
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
      const getInsurer = (raw: Record<string, string>) => get(raw, "insurer");
      const isValidDate = (raw: Record<string, string>) => {
        const dateVal = getDateForIssue(raw);
        return dateVal !== null && toISODateOnly(dateVal) !== null;
      };
      const hasInsurer = (raw: Record<string, string>) => {
        const v = getInsurer(raw);
        return v != null && String(v).trim() !== "";
      };
      const validRows = dataRows.filter((raw) => isValidDate(raw) && hasInsurer(raw));
      const rejectedRows = dataRows.filter((raw) => !isValidDate(raw) || !hasInsurer(raw));
      const getRejectionReason = (raw: Record<string, string>) => {
        const noDate = !isValidDate(raw);
        const noInsurer = !hasInsurer(raw);
        if (noDate && noInsurer) return "No valid date; Missing insurer";
        if (noDate) return "No valid date";
        return "Missing insurer";
      };
      const toInsert: IntTablesInsert<"insurer_billing_data">[] = validRows
        .map((raw) => ({
          company_id: companyId,
          project: projectId ?? null,
          insurer: getInsurer(raw)!,
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
      let importedCount = 0;
      if (toInsert.length > 0) {
        const rows = toInsert
          .filter((row) => row.insurer != null && String(row.insurer).trim() !== "")
          .map((row) =>
            Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined))
          ) as IntTablesInsert<"insurer_billing_data">[];
        if (rows.length > 0) {
          const { error: err } = await supabase.from("insurer_billing_data").insert(rows);
          if (err) throw err;
          importedCount = rows.length;

          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("audit_logs").insert({
            user_name: user?.email || "Unknown User",
            event_type: "Workflow",
            change: "CSV uploaded (Insurer Billing)",
            item_affected: `${projectId || 'General'} - ${importedCount} rows`,
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["insurer-billing", companyId, projectId] });
      }
      if (rejectedRows.length > 0 && companyId) {
        const errorInserts = rejectedRows.map((raw) => ({
          company_id: companyId,
          source: "insurer_billing",
          workflow: projectId ?? null,
          raw_data: raw as IntTables<"upload_errors">["raw_data"],
          rejection_reason: getRejectionReason(raw),
          file_name: file.name,
        }));
        await supabase.from("upload_errors" as any).insert(errorInserts);
        await queryClient.invalidateQueries({ queryKey: ["upload-errors", companyId, projectId] });
      }
      const skippedCount = rejectedRows.length;
      if (importedCount > 0 || skippedCount > 0) {
        const desc =
          skippedCount > 0
            ? `${importedCount} billing row(s) imported. ${skippedCount} row(s) skipped (see Errors tab).`
            : `${importedCount} billing row(s) imported.`;
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
    if (!file || !companyId || !projectId) return;
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const csvToDb: Record<string, any> = {
        "date issue": "date_issue",
        date_issue: "date_issue",
        "vehicle no": "vehicle_no",
        vehicle_no: "vehicle_no",
        "insured name": "insured_name",
        "insured ic no": "insured_ic_no",
        "insurer contact no": "insurer_contact_no",
        "insured email": "insured_email",
        "vehicle make/model": "vehicle_make_model",
        "type of cover": "type_of_cover",
        "sum insured": "sum_insured",
        premium: "premium",
        ncd: "ncd",
        "total base premium": "total_base_premium",
        "total extra coverage": "total_extra_coverage",
        "gross premium": "gross_premium",
        "service tax": "service_tax",
        "stamp duty": "stamp_duty",
        "total amount payable (rounded)": "total_amount_payable_rounded",
        insurer: "insurer",
        file_name: "file_name",
        "created timestamp": "created_timestamp",
        "formatted timestamp": "formatted_timestamp",
        "process duration": "process_duration",
      };
      const norm = (s: string) => String(s).toLowerCase().trim().replace(/\s+/g, " ");
      const ocrDataRows = (parsed.data ?? []).filter(
        (raw) => Object.values(raw).some((v) => v != null && String(v).trim() !== "")
      );
      const built = ocrDataRows.map((raw) => {
        const row: any = {
          company_id: companyId,
          project: projectId,
        };
        for (const [csvKey, val] of Object.entries(raw)) {
          if (val == null || String(val).trim() === "") continue;
          const dbCol = csvToDb[norm(csvKey)];
          if (dbCol && dbCol !== "company_id" && dbCol !== "project") {
            (row as Record<string, string | null>)[dbCol] = String(val).trim();
          }
        }
        return { raw, row };
      });
      const hasInsurer = ({ row }: { row: any }) =>
        (row as Record<string, unknown>).insurer != null &&
        String((row as Record<string, unknown>).insurer).trim() !== "";
      const normalizeDedupPart = (s: string) =>
        String(s)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
      const getVal = (obj: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) {
          const val = obj[k];
          if (val != null && String(val).trim() !== "") return String(val).trim();
        }
        return "";
      };
      const getDedupKey = (item: { row: any; raw: Record<string, string> }) => {
        const r = item.row as Record<string, unknown>;
        const rawNorm = Object.fromEntries(
          Object.entries(item.raw).map(([k, v]) => [norm(k), v])
        ) as Record<string, string>;
        const v = normalizeDedupPart(
          getVal(r, "vehicle_no") || getVal(rawNorm, "vehicle no", "vehicle_no", "vehicleno")
        );
        const d = normalizeDedupPart(
          getVal(r, "date_issue") || getVal(rawNorm, "date issue", "date_issue", "dateissue")
        );
        return `${v}|${d}`;
      };

      const existingKeys = new Set<string>();
      const { data: existingOcr } = await supabase
        .from("ocr_data_table")
        .select("vehicle_no, date_issue")
        .eq("company_id", companyId)
        .eq("project", projectId);
      for (const r of existingOcr ?? []) {
        const v = normalizeDedupPart(String((r as { vehicle_no?: string }).vehicle_no ?? ""));
        const d = normalizeDedupPart(String((r as { date_issue?: string }).date_issue ?? ""));
        existingKeys.add(`${v}|${d}`);
      }

      const rejectedRows: { raw: Record<string, string>; reason: string }[] = [];
      const validRows: typeof built = [];
      const seenInBatch = new Set<string>();

      for (const item of built) {
        if (!hasInsurer(item)) {
          rejectedRows.push({ raw: item.raw, reason: "Missing insurer" });
          continue;
        }
        const key = getDedupKey(item);
        if (existingKeys.has(key) || seenInBatch.has(key)) {
          rejectedRows.push({ raw: item.raw, reason: "Duplicate" });
          continue;
        }
        seenInBatch.add(key);
        existingKeys.add(key);
        validRows.push(item);
      }

      let importedCount = 0;
      if (validRows.length > 0) {
        const toInsert = validRows.map(({ row }) => row);
        const { error: err } = await supabase.from("ocr_data_table").insert(toInsert);
        if (err) throw err;
        importedCount = toInsert.length;
      }
      if (rejectedRows.length > 0 && companyId) {
        const errorInserts = rejectedRows.map(({ raw, reason }) => ({
          company_id: companyId,
          source: "ocr",
          workflow: projectId,
          raw_data: raw as IntTables<"upload_errors">["raw_data"],
          rejection_reason: reason,
          file_name: file.name,
        }));
        await supabase.from("upload_errors" as any).insert(errorInserts);
      }
      await queryClient.invalidateQueries({ queryKey: ["ocr", companyId, projectId] });
      if (rejectedRows.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ["upload-errors", companyId, projectId] });
      }
      if (importedCount > 0 || rejectedRows.length > 0) {
        const desc =
          rejectedRows.length > 0
            ? `${importedCount} OCR row(s) imported. ${rejectedRows.length} row(s) skipped (see Errors tab).`
            : `${importedCount} OCR row(s) imported.`;
        toast({ title: "Upload successful", description: desc });
      }
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ?? (err instanceof Error ? err.message : "Upload failed");
      toast({ title: "OCR upload failed", description: msg, variant: "destructive" });
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
    issuanceFilter,
    setIssuanceFilter,
    verificationStatuses,
    handleVerificationStatusChange,
    // Issuance tab
    rows,
    isLoadingIssuance,
    lastUpdated,
    insurerOptions,
    searchQuery,
    setSearchQuery,
    paginatedRows,
    searchFilteredRows,
    totalPages,
    completeData,
    incompleteData,
    cancelledData,
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
    ocrLastUpdated,
    ocrSortBy,
    ocrSortAsc,
    setOcrSortBy,
    setOcrSortAsc,
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
