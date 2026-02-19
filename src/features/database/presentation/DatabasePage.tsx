import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { useQuery } from "@tanstack/react-query";
import { Database as DatabaseIcon, Receipt, BadgeCheck, Filter, Check, Clock, ClipboardList, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/data/supabase/client";
import type { Tables } from "@/data/supabase/types";
import { PageHeader } from "@/shared/components/PageHeader";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IssuanceRow = Tables<"issuances">;

const PAGE_SIZE = 50;
type ViewMode = "quotation" | "issuance";
type FilterPreset = "this_month" | "last_month" | "custom";
type DateRange = { from: Date; to?: Date };

function parsePurchasedDate(value: string | null): Date | null {
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

function getBefore6PMCount(rows: IssuanceRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDate(r.purchased_date);
    if (!d) return false;
    return isBefore6PM(d);
  }).length;
}

function getAfter6PMCount(rows: IssuanceRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDate(r.purchased_date);
    if (!d) return false;
    return !isBefore6PM(d);
  }).length;
}

function filterByDateRange(
  rows: IssuanceRow[],
  preset: FilterPreset,
  customRange: DateRange | null
): IssuanceRow[] {
  if (rows.length === 0) return rows;
  if (preset === "custom" && customRange?.from) {
    const from = customRange.from;
    const to = customRange.to ?? from;
    return rows.filter((r) => {
      const d = parsePurchasedDate(r.purchased_date);
      if (!d) return false;
      return isWithinInterval(d, { start: from, end: to });
    });
  }
  const now = new Date();
  let interval: Interval;
  if (preset === "last_month") {
    interval = {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
    };
  } else {
    interval = { start: startOfMonth(now), end: endOfMonth(now) };
  }
  return rows.filter((r) => {
    const d = parsePurchasedDate(r.purchased_date);
    if (!d) return false;
    return isWithinInterval(d, interval);
  });
}

async function fetchIssuances(): Promise<IssuanceRow[]> {
  const { data, error } = await supabase
    .from("issuances")
    .select("*")
    .order("purchased_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}

export default function DatabasePage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const viewMode: ViewMode =
    viewParam === "quotation" ? "quotation" : "issuance";

  const [filterPreset, setFilterPreset] = useState<FilterPreset>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: issuanceRows = [], isLoading, error } = useQuery({
    queryKey: ["database-issuances"],
    queryFn: fetchIssuances,
    enabled: viewMode === "issuance",
  });

  const rows = viewMode === "quotation" ? [] : issuanceRows;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPreset, customRange, selectedInsurer, selectedPartner]);

  const dateFilteredRows = useMemo(
    () => filterByDateRange(rows, filterPreset, customRange),
    [rows, filterPreset, customRange]
  );

  const insurerOptions = useMemo(() => {
    const set = new Set(dateFilteredRows.map((r) => r.insurer).filter(Boolean));
    return Array.from(set).sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  }, [dateFilteredRows]);

  const partnerOptions = useMemo(() => {
    const set = new Set(dateFilteredRows.map((r) => r.partner).filter(Boolean));
    return Array.from(set).sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  }, [dateFilteredRows]);

  useEffect(() => {
    if (selectedPartner && partnerOptions.length > 0 && !partnerOptions.includes(selectedPartner)) {
      setSelectedPartner(null);
    }
  }, [selectedPartner, partnerOptions]);

  const filteredRows = useMemo(() => {
    let filtered = dateFilteredRows;
    if (selectedInsurer) {
      filtered = filtered.filter((r) => r.insurer === selectedInsurer);
    }
    if (selectedPartner) {
      filtered = filtered.filter((r) => r.partner === selectedPartner);
    }
    return [...filtered].sort((a, b) => {
      const da = parsePurchasedDate(a.purchased_date)?.getTime() ?? 0;
      const db = parsePurchasedDate(b.purchased_date)?.getTime() ?? 0;
      return sortAsc ? da - db : db - da;
    });
  }, [dateFilteredRows, selectedInsurer, selectedPartner, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const before6PM = useMemo(() => getBefore6PMCount(filteredRows), [filteredRows]);
  const after6PM = useMemo(() => getAfter6PMCount(filteredRows), [filteredRows]);
  const totalCount = filteredRows.length;

  const filterLabel =
    filterPreset === "this_month"
      ? "This month"
      : filterPreset === "last_month"
        ? "Last month"
        : customRange?.from
          ? `Custom (${customRange.from.toLocaleDateString()}${customRange.to ? ` – ${customRange.to.toLocaleDateString()}` : ""})`
          : "Custom";

  const tableLabel = viewMode === "quotation" ? "Quotation" : "Issuance";
  const emptyMessage =
    viewMode === "quotation"
      ? "No quotation data."
      : rows.length === 0
        ? (isLoading ? "Loading…" : "No issuance data in the database.")
        : "No rows match the current filter.";

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="mb-6">
          <PageHeader
            icon={DatabaseIcon}
            title="Database"
            description="View quotation and issuance data"
          />
        </div>

        <div className="border-b border-border mb-4 flex gap-6">
          <Link
            to="/database?view=quotation"
            className={cn(
              "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
              viewMode === "quotation"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Receipt className="h-4 w-4" />
            Quotation
          </Link>
          <Link
            to="/database?view=issuance"
            className={cn(
              "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
              viewMode === "issuance"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <BadgeCheck className="h-4 w-4" />
            Issuance
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex flex-wrap gap-2">
            {viewMode === "issuance" && (
              <>
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
                      key={ins ?? ""}
                      onClick={() => setSelectedInsurer(ins ?? null)}
                    >
                      {ins}
                    </DropdownMenuItem>
                  ))}
                  {insurerOptions.length === 0 && (
                    <DropdownMenuItem disabled>No insurers in data</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Partner: {selectedPartner ?? "All"}
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setSelectedPartner(null)}>
                      All
                    </DropdownMenuItem>
                    {partnerOptions.map((p) => (
                      <DropdownMenuItem
                        key={p ?? ""}
                        onClick={() => setSelectedPartner(p ?? null)}
                      >
                        {p}
                      </DropdownMenuItem>
                    ))}
                    {partnerOptions.length === 0 && (
                      <DropdownMenuItem disabled>No partners in data</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
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
                <p className="text-lg font-semibold tabular-nums">{totalCount}</p>
                <p className="text-xs text-primary-foreground/80">Total {tableLabel}s</p>
              </div>
              <div className="rounded-full bg-white/20 p-1.5 shrink-0">
                <ClipboardList className="h-3.5 w-3.5 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          {error && viewMode === "issuance" && (
            <div className="p-4 text-sm text-destructive border-b">
              Failed to load issuances: {(error as Error).message}
            </div>
          )}
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
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.purchased_date ?? "—"}</TableCell>
                      <TableCell>{row.plate_no ?? "—"}</TableCell>
                      <TableCell>{row.customer ?? "—"}</TableCell>
                      <TableCell>{row.instant_quotation ?? "—"}</TableCell>
                      <TableCell>{row.insurer ?? "—"}</TableCell>
                      <TableCell>{row.coverage ?? "—"}</TableCell>
                      <TableCell>{row.time_lapsed ?? "—"}</TableCell>
                      <TableCell>{row.partner ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
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
      </main>
    </div>
  );
}
