import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/shared/components/TablePagination";
import type { Cluster, Subcluster, Submission } from "../types";
import { GROUPS, groupColor } from "../utils/colors";
import { dayLabel, timeLabel } from "../utils/dates";
import { InfoTip } from "./InfoTip";

const PAGE_SIZE = 20;

type View = "board" | "table";

function QuoteLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
      aria-label="Open quotation in a new tab"
    >
      <ExternalLink className="h-3 w-3" />
      Quote
    </a>
  );
}

export function SubmissionsCard({
  submissions,
  clusters,
  subclusters,
  prevCounts,
  compareShort,
}: {
  submissions: Submission[];
  clusters: Cluster[];
  subclusters: Subcluster[];
  prevCounts: Record<string, number> | null;
  compareShort: string | null;
}) {
  const [view, setView] = useState<View>("board");
  const [q, setQ] = useState("");
  const [fc, setFc] = useState("all");
  const [page, setPage] = useState(1);

  const clusterBy = useMemo(() => new Map(clusters.map((c) => [c.code, c])), [clusters]);
  const subBy = useMemo(() => new Map(subclusters.map((s) => [s.id, s.name])), [subclusters]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return submissions
      .filter(
        (s) =>
          (fc === "all" || s.clusterCode === fc) &&
          (!needle || s.feedback.toLowerCase().includes(needle) || (s.gloss ?? "").toLowerCase().includes(needle))
      )
      .slice()
      .reverse();
  }, [submissions, q, fc]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const s of submissions) t[s.clusterCode] = (t[s.clusterCode] ?? 0) + 1;
    return t;
  }, [submissions]);

  const columns = useMemo(() => {
    const present = clusters.filter((c) => (totals[c.code] ?? 0) > 0);
    const ordered = [
      ...present.filter((c) => c.isPriority),
      ...present.filter((c) => !c.isPriority && c.code !== "U").sort((a, b) => (totals[b.code] ?? 0) - (totals[a.code] ?? 0)),
      ...present.filter((c) => c.code === "U"),
    ];
    return ordered
      .filter((c) => fc === "all" || c.code === fc)
      .map((c) => ({ cluster: c, cards: filtered.filter((s) => s.clusterCode === c.code) }));
  }, [clusters, totals, filtered, fc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Card className="rounded-2xl border-2 border-border/80 shadow-sm overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>Every submission, sorted into its cluster. Contact details are never stored.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} variant="outline" size="sm">
              <ToggleGroupItem value="board">Board</ToggleGroupItem>
              <ToggleGroupItem value="table">Table</ToggleGroupItem>
            </ToggleGroup>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search feedback"
                placeholder="Search feedback…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="w-56 pl-8"
              />
            </div>
            <Select
              value={fc}
              onValueChange={(v) => {
                setFc(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-56" aria-label="Filter by cluster">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clusters</SelectItem>
                {clusters.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {submissions.length === 0 ? (
          <p className="border-t px-6 py-10 text-center text-sm text-muted-foreground">No submissions for this period.</p>
        ) : view === "board" ? (
          <div className="overflow-x-auto border-t bg-muted/30 p-4">
            <div className="flex items-start gap-3.5">
              {columns.map(({ cluster, cards }) => {
                const g = cluster.groupKey;
                const total = totals[cluster.code] ?? 0;
                return (
                  <div key={cluster.code} className="flex w-72 flex-none flex-col gap-2.5">
                    <div
                      className="rounded-lg border px-3.5 py-3"
                      style={{ backgroundColor: groupColor(g, 0.12), borderColor: groupColor(g, 0.35) }}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: groupColor(g) }} />
                        {GROUPS[g].tag}
                      </span>
                      <p className="mt-1 flex items-center gap-1 text-[15px] font-semibold">
                        <span>{cluster.name}</span>
                        {cluster.isPriority && <span className="text-xs text-primary">★</span>}
                        <InfoTip text={cluster.description} label={cluster.name} />
                      </p>
                      <p className="mt-1 font-mono text-[13px] tabular-nums text-muted-foreground">
                        {total} submission{total === 1 ? "" : "s"}
                        {prevCounts && compareShort ? ` · ${compareShort}: ${prevCounts[cluster.code] ?? 0}` : ""}
                        {q ? ` · ${cards.length} match` : ""}
                      </p>
                    </div>
                    <div className="flex max-h-[620px] flex-col gap-2 overflow-y-auto pr-0.5">
                      {cards.map((s) => (
                        <div key={s.key} className="rounded-lg border bg-background px-3 py-2.5 shadow-sm">
                          <p className="break-words text-sm leading-snug">{s.feedback}</p>
                          {s.gloss && <p className="mt-1 text-xs italic text-muted-foreground">{s.gloss}</p>}
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">{s.subclusterId ? subBy.get(s.subclusterId) : s.tagNote ?? ""}</span>
                            <span className="flex flex-none items-center gap-2">
                              <QuoteLink url={s.quotationUrl} />
                              <span className="font-mono tabular-nums">
                                {dayLabel(s.day)} · {timeLabel(s.submittedAt)}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                      {cards.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No matches</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/70 hover:bg-muted/70">
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wide">Submitted</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Feedback</TableHead>
                  <TableHead className="w-[220px] text-xs font-semibold uppercase tracking-wide">Cluster</TableHead>
                  <TableHead className="w-[230px] text-xs font-semibold uppercase tracking-wide">Sub-cluster</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wide">Customer picked</TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wide">Quote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((s) => {
                  const c = clusterBy.get(s.clusterCode);
                  return (
                    <TableRow key={s.key}>
                      <TableCell className="whitespace-nowrap align-top font-mono text-xs tabular-nums">
                        {dayLabel(s.day)} · {timeLabel(s.submittedAt)}
                      </TableCell>
                      <TableCell className="align-top">
                        {s.feedback}
                        {s.gloss && <span className="mt-1 block text-xs italic text-muted-foreground">{s.gloss}</span>}
                      </TableCell>
                      <TableCell className="align-top">
                        {c && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: groupColor(c.groupKey) }} />
                            {c.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {s.subclusterId ? subBy.get(s.subclusterId) : "—"}
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">{s.customerCategory ?? "—"}</TableCell>
                      <TableCell className="align-top text-xs">
                        <QuoteLink url={s.quotationUrl} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No submissions match
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="border-t px-6 py-3">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
