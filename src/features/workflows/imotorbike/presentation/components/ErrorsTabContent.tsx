import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { TablePagination } from "@/shared/components/TablePagination";
import { TableSearch } from "./TableSearch";
import type { UploadErrorRow } from "../hooks/useIMotorbikeProjectView";

type ErrorsTabContentProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  rows: UploadErrorRow[];
  isLoading: boolean;
  error: Error | null;
  totalItems: number;
  emptyMessage: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

function getDisplayValue(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const n = k.toLowerCase().replace(/\s+/g, " ");
    const v = Object.entries(raw).find(
      ([key]) => key.toLowerCase().replace(/\s+/g, " ") === n
    )?.[1];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  for (const [key, val] of Object.entries(raw)) {
    if (keys.some((k) => key.toLowerCase().includes(k.toLowerCase())) && val != null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return "—";
}

export function ErrorsTabContent({
  searchQuery,
  onSearchChange,
  rows,
  isLoading,
  error,
  totalItems,
  emptyMessage,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}: ErrorsTabContentProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <TableSearch
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search rejected data…"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
              What are errors?
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[280px] text-xs">
            <p className="font-medium mb-1">Rejected rows from CSV uploads</p>
            <p>Rows are skipped during import and appear here when they have a <strong>missing or invalid issue date</strong>, a <strong>missing insurer name</strong>, or a <strong>duplicate vehicle plate + date</strong> already in the database. Review and correct the source CSV before re-uploading.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Card>
        {error && (
          <div className="p-4 text-sm text-destructive border-b">
            Failed to load: {error.message}
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Client / Name</TableHead>
                <TableHead>Vehicle no</TableHead>
                <TableHead>Policy no</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Rejected at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const raw = (row.raw_data ?? {}) as Record<string, unknown>;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="capitalize">
                        {row.source?.replace(/_/g, " ") ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-destructive/10 px-2.5 py-0.5 text-sm font-medium text-destructive">
                          {row.rejection_reason ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getDisplayValue(raw, "name of insured", "client", "client_name")}
                      </TableCell>
                      <TableCell>
                        {getDisplayValue(raw, "vehicle no", "vehicle no.", "vehicle_no")}
                      </TableCell>
                      <TableCell>
                        {getDisplayValue(raw, "policy no.", "policy no", "policy_no")}
                      </TableCell>
                      <TableCell>{row.file_name ?? "—"}</TableCell>
                      <TableCell>
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </Card>
    </>
  );
}
