import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ClipboardList, Search, Download, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase/client";
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

type AuditDetails = {
  before?: string | null;
  after?: string | null;
};

type AuditLogEntry = {
  id: string;
  time: Date;
  user: string;
  eventType: string;
  change: string;
  itemAffected: string;
  details: AuditDetails | null;
};

const PAGE_SIZE = 10;
const TIME_FILTERS = ["all", "7d", "30d", "90d"] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

function filterByTime(entries: AuditLogEntry[], filter: TimeFilter): AuditLogEntry[] {
  if (filter === "all") return entries;
  const now = new Date();
  let from: Date;
  if (filter === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (filter === "30d") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return entries.filter((e) => e.time >= from);
}

function DetailsContent({ entry }: { entry: AuditLogEntry }) {
  const d = entry.details;
  const issuanceMatch = entry.itemAffected.match(/^imotorbike_billing_normalised\/([a-f0-9-]+)$/);
  const normalisedId = issuanceMatch?.[1];

  const { data: fieldHistory = [], isLoading } = useQuery({
    queryKey: ["imotorbike-field-history", normalisedId],
    queryFn: async () => {
      if (!normalisedId) return [];
      const { data, error } = await supabase
        .from("imotorbike_billing_field_history")
        .select("field_name, old_value, new_value, changed_by, changed_at")
        .eq("normalised_id", normalisedId)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!normalisedId,
  });

  if (d && (d.before !== undefined || d.after !== undefined)) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Before</p>
            <p className="mt-0.5 rounded bg-muted px-2 py-1 font-mono">
              {d.before ?? <span className="text-muted-foreground">—</span>}
            </p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">After</p>
            <p className="mt-0.5 rounded bg-muted px-2 py-1 font-mono">
              {d.after ?? <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (normalisedId) {
    if (isLoading) return <p className="text-sm text-muted-foreground">Loading change history…</p>;
    if (fieldHistory.length === 0) return <p className="text-sm text-muted-foreground">No field history for this row.</p>;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Field change history</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {fieldHistory.map((h, i) => (
            <div key={i} className="rounded border bg-muted/30 p-3 text-sm">
              <p className="mb-1.5 font-medium">{h.field_name}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Before:</span>{" "}
                  <span className="font-mono">{h.old_value ?? "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">After:</span>{" "}
                  <span className="font-mono">{h.new_value ?? "—"}</span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {format(new Date(h.changed_at), "d MMM, HH:mm")} · {h.changed_by}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">No additional details.</p>;
}

export default function AdminAuditLogsPage() {
  const [keyword, setKeyword] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsEntry, setDetailsEntry] = useState<AuditLogEntry | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("time", { ascending: false });
      if (error) throw error;

      return data.map((d) => ({
        id: d.id,
        time: new Date(d.time),
        user: d.user_name,
        eventType: d.event_type,
        change: d.change,
        itemAffected: d.item_affected,
        details: null,
      }));
    },
  });

  const filteredLogs = useMemo(() => {
    let list = filterByTime(logs, timeFilter);
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
  }, [logs, keyword, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <PageHeader
          icon={ClipboardList}
          title="Audit Log"
          description="History of changes across PolicyStreet Tools. Use it to track user actions, report generation, workflow updates, and logins."
        />

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
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading audit logs…</div>
            ) : (
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
                            onClick={() => setDetailsEntry(entry)}
                          >
                            Show more
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!detailsEntry} onOpenChange={(open) => !open && setDetailsEntry(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change details</DialogTitle>
            </DialogHeader>
            {detailsEntry && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">{detailsEntry.change}</span>
                  </p>
                  <p className="mt-1">{detailsEntry.itemAffected}</p>
                  <p className="mt-1">{format(detailsEntry.time, "d MMM, yyyy HH:mm:ss")} · {detailsEntry.user}</p>
                </div>
                <DetailsContent entry={detailsEntry} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
