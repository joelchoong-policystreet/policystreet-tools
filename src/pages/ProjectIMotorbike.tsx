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
import { Upload, Filter, Check, Clock, ClipboardList, ArrowUp, ArrowDown } from "lucide-react";
import { WORKFLOWS } from "@/components/ProjectPanel";
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

const PAGE_SIZE = 50;

type FilterPreset = "this_month" | "last_month" | "custom";

function parsePurchasedDateTime(value: string): Date | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  // Try ISO first
  let d = parseISO(s);
  if (isValid(d)) return d;
  // Try "DD/MM/YYYY HH:mm" or "DD/MM/YYYY"
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

const ProjectIMotorbike = () => {
  const { workflowId, projectId } = useParams<{ workflowId: string; projectId: string }>();
  const workflow = workflowId ? WORKFLOWS[workflowId] : null;
  const project = workflow?.projects.find((p) => p.id === projectId);
  const Icon = project?.icon;
  const label = project?.label ?? projectId ?? "Project";

  const [rows, setRows] = useState<IMotorbikeRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const before6PM = useMemo(() => getBefore6PMCount(filteredRows), [filteredRows]);
  const after6PM = useMemo(() => getAfter6PMCount(filteredRows), [filteredRows]);
  const totalIssuances = filteredRows.length;

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

        {/* Issuance tab */}
        <div className="border-b border-border mb-4">
          <span className="inline-block px-1 pb-2 text-sm font-medium border-b-2 border-primary text-primary">
            Issuance
          </span>
        </div>

        {/* Summary + Upload + Filters */}
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

        {/* Quick overview - compact */}
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

        {/* Table */}
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
      </main>
    </div>
  );
};

export default ProjectIMotorbike;
