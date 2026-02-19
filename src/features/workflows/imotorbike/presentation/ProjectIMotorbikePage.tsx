import { useMemo, useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  parseISO,
  parse,
  isValid,
  type Interval,
} from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Filter, Check, Clock, ClipboardList, ArrowUp, ArrowDown, BadgeCheck, DollarSign, ScanLine } from "lucide-react";
import { WORKFLOWS } from "@/features/layout/presentation/ProjectPanel";
import { supabase } from "@/data/supabase/client";
import type { Tables, TablesInsert } from "@/data/supabase/types";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { parseIMotorbikeCSV, type IMotorbikeRow } from "@/lib/imotorbike-csv";

type InsurerBillingRow = Tables<"insurer_billing_data">;
type OcrRow = Tables<"ocr_data">;

const PAGE_SIZE = 50;
type TabKind = "issuance" | "insurer_billing" | "ocr";

type FilterPreset = "this_month" | "last_month" | "custom";

function parsePurchasedDateTime(value: string): Date | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  let d = parseISO(s);
  if (isValid(d)) return d;
  d = parse(s, "dd/MM/yyyy HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd HH:mm", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd", new Date());
  if (isValid(d)) return d;
  return null;
}

function isBefore6PM(date: Date): boolean {
  return date.getHours() < 18;
}

function getBefore6PMCount(rows: IMotorbikeRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDateTime(r.purchasedDate);
    if (!d) return false;
    return isBefore6PM(d);
  }).length;
}

function getAfter6PMCount(rows: IMotorbikeRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDateTime(r.purchasedDate);
    if (!d) return false;
    return !isBefore6PM(d);
  }).length;
}

function filterByDateRange(
  rows: IMotorbikeRow[],
  preset: FilterPreset,
  customRange: DateRange | null
): IMotorbikeRow[] {
  if (rows.length === 0) return rows;
  if (preset === "custom" && customRange?.from) {
    const from = customRange.from;
    const to = customRange.to ?? from;
    return rows.filter((r) => {
      const d = parsePurchasedDateTime(r.purchasedDate);
      if (!d) return false;
      return isWithinInterval(d, { start: from, end: to });
    });
  }
  const now = new Date();
  let interval: Interval;
  if (preset === "last_month") {
    const start = startOfMonth(subMonths(now, 1));
    const end = endOfMonth(subMonths(now, 1));
    interval = { start, end };
  } else {
    interval = { start: startOfMonth(now), end: endOfMonth(now) };
  }
  return rows.filter((r) => {
    const d = parsePurchasedDateTime(r.purchasedDate);
    if (!d) return false;
    return isWithinInterval(d, interval);
  });
}

type DateRange = { from: Date; to?: Date };

function parseBillingDate(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  let d = parseISO(s);
  if (isValid(d)) return d;
  d = parse(s, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  d = parse(s, "yyyy-MM-dd", new Date());
  if (isValid(d)) return d;
  return null;
}

function filterBillingByDateRange(
  rows: InsurerBillingRow[],
  preset: FilterPreset,
  customRange: DateRange | null
): InsurerBillingRow[] {
  if (rows.length === 0) return rows;
  if (preset === "custom" && customRange?.from) {
    const from = customRange.from;
    const to = customRange.to ?? from;
    return rows.filter((r) => {
      const d = parseBillingDate(r.billing_date);
      if (!d) return false;
      return isWithinInterval(d, { start: from, end: to });
    });
  }
  const now = new Date();
  let interval: Interval;
  if (preset === "last_month") {
    interval = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
  } else {
    interval = { start: startOfMonth(now), end: endOfMonth(now) };
  }
  return rows.filter((r) => {
    const d = parseBillingDate(r.billing_date);
    if (!d) return false;
    return isWithinInterval(d, interval);
  });
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
      .order("billing_date", { ascending: true, nullsFirst: false });
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

export default function ProjectIMotorbikePage() {
  const { workflowId, projectId } = useParams<{ workflowId: string; projectId: string }>();
  const workflow = workflowId ? WORKFLOWS[workflowId] : null;
  const project = workflow?.projects.find((p) => p.id === projectId);
  const Icon = project?.icon;
  const label = project?.label ?? projectId ?? "Project";

  if (!workflowId || !projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Select a project.</p>
      </div>
    );
  }

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKind>("issuance");
  const [rows, setRows] = useState<IMotorbikeRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string | null>(null);
  const [selectedInsurerBilling, setSelectedInsurerBilling] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const billingFileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

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

  const dateFilteredRows = useMemo(
    () => filterByDateRange(rows, filterPreset, customRange),
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
    if (selectedInsurer) {
      filtered = filtered.filter((r) => r.insurer === selectedInsurer);
    }
    return [...filtered].sort((a, b) => {
      const da = parsePurchasedDateTime(a.purchasedDate)?.getTime() ?? 0;
      const db = parsePurchasedDateTime(b.purchasedDate)?.getTime() ?? 0;
      return sortAsc ? da - db : db - da;
    });
  }, [dateFilteredRows, selectedInsurer, sortAsc]);

  useEffect(() => setCurrentPage(1), [activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const before6PM = useMemo(() => getBefore6PMCount(filteredRows), [filteredRows]);
  const after6PM = useMemo(() => getAfter6PMCount(filteredRows), [filteredRows]);
  const totalIssuances = filteredRows.length;

  const billingDateFiltered = useMemo(
    () => filterBillingByDateRange(insurerBillingRows, filterPreset, customRange),
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
      const da = parseBillingDate(a.billing_date)?.getTime() ?? 0;
      const db = parseBillingDate(b.billing_date)?.getTime() ?? 0;
      return sortAsc ? da - db : db - da;
    });
  }, [billingDateFiltered, selectedInsurerBilling, sortAsc]);
  const billingTotalPages = Math.max(1, Math.ceil(billingFiltered.length / PAGE_SIZE));
  const billingPaginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return billingFiltered.slice(start, start + PAGE_SIZE);
  }, [billingFiltered, currentPage]);

  const ocrSorted = useMemo(
    () => [...ocrRows].sort((a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * (sortAsc ? 1 : -1)),
    [ocrRows, sortAsc]
  );
  const ocrTotalPages = Math.max(1, Math.ceil(ocrSorted.length / PAGE_SIZE));
  const ocrPaginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return ocrSorted.slice(start, start + PAGE_SIZE);
  }, [ocrSorted, currentPage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseIMotorbikeCSV(file);
      setRows(data);
      setLastUpdated(new Date());
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    }
    e.target.value = "";
  };

  const filterLabel =
    filterPreset === "this_month"
      ? "This month"
      : filterPreset === "last_month"
        ? "Last month"
        : customRange?.from
          ? `Custom (${customRange.from.toLocaleDateString()}${customRange.to ? ` – ${customRange.to.toLocaleDateString()}` : ""})`
          : "Custom";

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="flex items-center gap-3 mb-4">
          {Icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
            <p className="text-sm text-muted-foreground">Project workspace</p>
          </div>
        </div>

        <div className="border-b border-border mb-4 flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("issuance")}
            className={cn(
              "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "issuance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <BadgeCheck className="h-4 w-4" />
            Issuance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("insurer_billing")}
            className={cn(
              "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "insurer_billing" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <DollarSign className="h-4 w-4" />
            Insurer billing data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ocr")}
            className={cn(
              "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "ocr" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ScanLine className="h-4 w-4" />
            OCR data
          </button>
        </div>

        {activeTab === "issuance" && (
        <>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <p className="text-sm text-muted-foreground">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleString()}`
              : "No data uploaded yet."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setFilterPreset("this_month")}>
                  This month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPreset("last_month")}>
                  Last month
                </DropdownMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <span className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent">
                      Select date range...
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={customRange ?? undefined}
                      onSelect={(range) => {
                        setCustomRange(range ?? null);
                        if (range?.from) setFilterPreset("custom");
                      }}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Insurer: {selectedInsurer ?? "All"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSelectedInsurer(null)}>
                  All
                </DropdownMenuItem>
                {insurerOptions.map((ins) => (
                  <DropdownMenuItem
                    key={ins}
                    onClick={() => setSelectedInsurer(ins)}
                  >
                    {ins}
                  </DropdownMenuItem>
                ))}
                {insurerOptions.length === 0 && (
                  <DropdownMenuItem disabled>No insurers in data</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Card className="flex-1 min-w-[120px]">
            <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-semibold tabular-nums">{before6PM}</p>
                <p className="text-xs text-muted-foreground">Before 6PM</p>
              </div>
              <div className="rounded-full bg-green-500/15 p-1.5 shrink-0">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[120px]">
            <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-semibold tabular-nums">{after6PM}</p>
                <p className="text-xs text-muted-foreground">After 6PM</p>
              </div>
              <div className="rounded-full bg-amber-500/15 p-1.5 shrink-0">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[120px] bg-primary text-primary-foreground">
            <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-semibold tabular-nums">{totalIssuances}</p>
                <p className="text-xs text-primary-foreground/80">Total Issuances</p>
              </div>
              <div className="rounded-full bg-white/20 p-1.5 shrink-0">
                <ClipboardList className="h-3.5 w-3.5 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => setSortAsc((a) => !a)}
                    >
                      Purchased Date
                      {sortAsc ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Plate No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Instant Quotation</TableHead>
                  <TableHead>Insurer</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Time Lapsed</TableHead>
                  <TableHead>Partner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      {rows.length === 0
                        ? "Upload a CSV to see data."
                        : "No rows match the current filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row, i) => (
                    <TableRow key={`${row.purchasedDate}-${row.plateNo}-${i}`}>
                      <TableCell>{row.purchasedDate}</TableCell>
                      <TableCell>{row.plateNo}</TableCell>
                      <TableCell>{row.customer}</TableCell>
                      <TableCell>{row.instantQuotation}</TableCell>
                      <TableCell>{row.insurer}</TableCell>
                      <TableCell>{row.coverage}</TableCell>
                      <TableCell>{row.timeLapsed}</TableCell>
                      <TableCell>{row.partner}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of{" "}
                {filteredRows.length}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage((p) => p - 1);
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {(() => {
                    const pages: (number | "ellipsis")[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 3) pages.push("ellipsis");
                      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (currentPage < totalPages - 2) pages.push("ellipsis");
                      if (totalPages > 1) pages.push(totalPages);
                    }
                    return pages.map((p, idx) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`e-${idx}`}>
                          <span className="px-2 text-muted-foreground">…</span>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(p);
                            }}
                            isActive={currentPage === p}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    );
                  })()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage((p) => p + 1);
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
        </>
        )}

        {activeTab === "insurer_billing" && (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {!companyId ? (
                <p className="text-sm text-muted-foreground">Loading company…</p>
              ) : (
                <>
                  <input
                    ref={billingFileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !companyId) return;
                      setUploading(true);
                      try {
                        const text = await file.text();
                        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
                        const normalize = (h: string) => h?.toLowerCase().replace(/\s+/g, "_").trim() ?? "";
                        const toInsert = (parsed.data ?? []).map((raw) => {
                          const get = (keys: string[]) => keys.map((k) => raw[normalize(k)] ?? raw[k]).find(Boolean);
                          return {
                            company_id: companyId,
                            billing_date: get(["billing_date", "date", "billing date"]) ?? null,
                            reference_number: get(["reference_number", "reference", "ref"]) ?? null,
                            insurer: get(["insurer"]) ?? null,
                            amount: get(["amount"]) ?? null,
                            policy_number: get(["policy_number", "policy number"]) ?? null,
                            description: get(["description", "notes"]) ?? null,
                          } as TablesInsert<"insurer_billing_data">;
                        });
                        if (toInsert.length > 0) {
                          const { error: err } = await supabase.from("insurer_billing_data").insert(toInsert);
                          if (err) throw err;
                          await queryClient.invalidateQueries({ queryKey: ["imotorbike-insurer-billing", companyId] });
                        }
                      } finally {
                        setUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => billingFileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload CSV"}
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {filterLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setFilterPreset("this_month")}>This month</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterPreset("last_month")}>Last month</DropdownMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <span className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent">Select date range...</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={customRange ?? undefined}
                        onSelect={(range) => { setCustomRange(range ?? null); if (range?.from) setFilterPreset("custom"); }}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">Insurer: {selectedInsurerBilling ?? "All"}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSelectedInsurerBilling(null)}>All</DropdownMenuItem>
                  {billingInsurerOptions.map((ins) => (
                    <DropdownMenuItem key={ins ?? ""} onClick={() => setSelectedInsurerBilling(ins ?? null)}>{ins}</DropdownMenuItem>
                  ))}
                  {billingInsurerOptions.length === 0 && <DropdownMenuItem disabled>No insurers</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Card>
              {errorBilling && (
                <div className="p-4 text-sm text-destructive border-b">Failed to load: {(errorBilling as Error).message}</div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button type="button" className="flex items-center gap-1 font-medium hover:text-foreground" onClick={() => setSortAsc((a) => !a)}>
                          Billing Date {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        </button>
                      </TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Insurer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Policy No.</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBilling ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">Loading…</TableCell>
                      </TableRow>
                    ) : billingPaginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          {insurerBillingRows.length === 0 ? "No insurer billing data. Upload a CSV." : "No rows match the filter."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      billingPaginated.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.billing_date ?? "—"}</TableCell>
                          <TableCell>{row.reference_number ?? "—"}</TableCell>
                          <TableCell>{row.insurer ?? "—"}</TableCell>
                          <TableCell>{row.amount ?? "—"}</TableCell>
                          <TableCell>{row.policy_number ?? "—"}</TableCell>
                          <TableCell>{row.description ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {billingTotalPages > 1 && (
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, billingFiltered.length)} of {billingFiltered.length}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage((p) => p - 1); }} className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""} />
                      </PaginationItem>
                      {Array.from({ length: Math.min(7, billingTotalPages) }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p); }} isActive={currentPage === p}>{p}</PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < billingTotalPages) setCurrentPage((p) => p + 1); }} className={currentPage >= billingTotalPages ? "pointer-events-none opacity-50" : ""} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </Card>
          </>
        )}

        {activeTab === "ocr" && (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {!companyId ? (
                <p className="text-sm text-muted-foreground">Loading company…</p>
              ) : (
                <>
                  <input
                    ref={ocrFileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !companyId) return;
                      setUploading(true);
                      try {
                        const text = await file.text();
                        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
                        const normalize = (h: string) => h?.toLowerCase().replace(/\s+/g, "_").trim() ?? "";
                        const toInsert = (parsed.data ?? []).map((raw) => {
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
                        }
                      } finally {
                        setUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => ocrFileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload CSV"}
                  </Button>
                </>
              )}
            </div>
            <Card>
              {errorOcr && (
                <div className="p-4 text-sm text-destructive border-b">Failed to load: {(errorOcr as Error).message}</div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Ref.</TableHead>
                      <TableHead className="max-w-[200px]">Extracted text</TableHead>
                      <TableHead>Source filename</TableHead>
                      <TableHead>
                        <button type="button" className="flex items-center gap-1 font-medium hover:text-foreground" onClick={() => setSortAsc((a) => !a)}>
                          Created {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingOcr ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-12">Loading…</TableCell>
                      </TableRow>
                    ) : ocrPaginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                          {ocrRows.length === 0 ? "No OCR data. Upload a CSV." : "No rows."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      ocrPaginated.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.document_reference ?? "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.extracted_text ?? undefined}>
                            {row.extracted_text ? (row.extracted_text.length > 80 ? `${row.extracted_text.slice(0, 80)}…` : row.extracted_text) : "—"}
                          </TableCell>
                          <TableCell>{row.source_filename ?? "—"}</TableCell>
                          <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {ocrTotalPages > 1 && (
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, ocrSorted.length)} of {ocrSorted.length}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage((p) => p - 1); }} className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""} />
                      </PaginationItem>
                      {Array.from({ length: Math.min(7, ocrTotalPages) }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p); }} isActive={currentPage === p}>{p}</PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < ocrTotalPages) setCurrentPage((p) => p + 1); }} className={currentPage >= ocrTotalPages ? "pointer-events-none opacity-50" : ""} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
