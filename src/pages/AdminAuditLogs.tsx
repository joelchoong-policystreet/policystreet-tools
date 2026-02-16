import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ClipboardList, Search, Download, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type AuditLogEntry = {
  id: string;
  time: Date;
  user: string;
  eventType: string;
  change: string;
  itemAffected: string;
};

const PAGE_SIZE = 10;
const TIME_FILTERS = ["all", "7d", "30d", "90d"] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

// Mock audit log data for PolicyStreet Tools
const MOCK_LOGS: AuditLogEntry[] = [
  { id: "1", time: new Date("2026-02-16T10:07:50"), user: "Jane Smith", eventType: "User", change: "User added", itemAffected: "alice.wong@policystreet.com" },
  { id: "2", time: new Date("2026-02-16T09:45:22"), user: "John Doe", eventType: "User", change: "Status changed to deactivated", itemAffected: "Bob Chen" },
  { id: "3", time: new Date("2026-02-16T09:12:00"), user: "Jane Smith", eventType: "Report", change: "Report generated", itemAffected: "Report: Q1 Summary" },
  { id: "4", time: new Date("2026-02-15T16:30:00"), user: "Alice Wong", eventType: "Workflow", change: "CSV uploaded", itemAffected: "iMotorbike – 42 rows" },
  { id: "5", time: new Date("2026-02-15T14:20:00"), user: "John Doe", eventType: "User", change: "User added", itemAffected: "carol.lee@policystreet.com" },
  { id: "6", time: new Date("2026-02-15T11:00:00"), user: "Jane Smith", eventType: "User", change: "Status changed to active", itemAffected: "Bob Chen" },
  { id: "7", time: new Date("2026-02-14T17:45:00"), user: "Bob Chen", eventType: "Login", change: "Signed in", itemAffected: "—" },
  { id: "8", time: new Date("2026-02-14T10:00:00"), user: "Jane Smith", eventType: "Report", change: "Report generated", itemAffected: "Report: Affiliates Feb" },
  { id: "9", time: new Date("2026-02-13T15:30:00"), user: "John Doe", eventType: "Workflow", change: "Filter applied", itemAffected: "iMotorbike – This month" },
  { id: "10", time: new Date("2026-02-12T09:00:00"), user: "Alice Wong", eventType: "Login", change: "Signed in", itemAffected: "—" },
  { id: "11", time: new Date("2026-02-11T14:22:00"), user: "Jane Smith", eventType: "User", change: "User added", itemAffected: "bob.chen@policystreet.com" },
  { id: "12", time: new Date("2026-02-10T08:51:00"), user: "John Doe", eventType: "Report", change: "Report exported as PDF", itemAffected: "Report: Annual Summary" },
];

function filterByTime(entries: AuditLogEntry[], filter: TimeFilter): AuditLogEntry[] {
  if (filter === "all") return entries;
  const now = new Date();
  let from: Date;
  if (filter === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (filter === "30d") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return entries.filter((e) => e.time >= from);
}

export default function AdminAuditLogs() {
  const [keyword, setKeyword] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = useMemo(() => {
    let list = filterByTime(MOCK_LOGS, timeFilter);
    if (keyword.trim()) {
      const k = keyword.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.user.toLowerCase().includes(k) ||
          e.eventType.toLowerCase().includes(k) ||
          e.change.toLowerCase().includes(k) ||
          e.itemAffected.toLowerCase().includes(k)
      );
    }
    return list.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [keyword, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              History of changes across PolicyStreet Tools. Use it to track user actions, report generation, workflow updates, and logins.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-4">
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
              ))}
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

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event type</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Item affected</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No audit log entries match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(entry.time, "d MMM, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <span className="text-primary font-medium">{entry.user}</span>
                      </TableCell>
                      <TableCell>{entry.eventType}</TableCell>
                      <TableCell>{entry.change}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.itemAffected}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline"
                        >
                          Show more
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
