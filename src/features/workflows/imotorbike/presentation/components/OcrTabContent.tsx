import { Upload, ArrowUp, ArrowDown } from "lucide-react";
import { TableSearch } from "./TableSearch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/shared/components/TablePagination";
import type { OcrRow } from "../hooks/useIMotorbikeProjectView";

type OcrTabContentProps = {
  companyId: string | null;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  rows: OcrRow[];
  isLoading: boolean;
  error: Error | null;
  totalItems: number;
  emptyMessage: string;
  sortAsc: boolean;
  onSortToggle: () => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function OcrTabContent({
  companyId,
  uploading,
  fileInputRef,
  onFileChange,
  searchQuery,
  onSearchChange,
  rows,
  isLoading,
  error,
  totalItems,
  emptyMessage,
  sortAsc,
  onSortToggle,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}: OcrTabContentProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <TableSearch
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search document, text, filename…"
        />
        {!companyId ? (
          <p className="text-sm text-muted-foreground">Loading company…</p>
        ) : (
          <>
            <input
              ref={fileInputRef as React.RefObject<HTMLInputElement>}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading…" : "Upload CSV"}
            </Button>
          </>
        )}
      </div>
      <Card>
        {error && (
          <div className="p-4 text-sm text-destructive border-b">Failed to load: {error.message}</div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Issue</TableHead>
                <TableHead>Vehicle No</TableHead>
                <TableHead>Insured Name</TableHead>
                <TableHead>Insured IC No</TableHead>
                <TableHead>Insurer Contact No</TableHead>
                <TableHead>Insured Email</TableHead>
                <TableHead>Vehicle Make/Model</TableHead>
                <TableHead>Type of Cover</TableHead>
                <TableHead>Sum Insured</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>NCD</TableHead>
                <TableHead>Total Base Premium</TableHead>
                <TableHead>Total Extra Coverage</TableHead>
                <TableHead>Gross Premium</TableHead>
                <TableHead>Service Tax</TableHead>
                <TableHead>Stamp Duty</TableHead>
                <TableHead>Total Amount Payable</TableHead>
                <TableHead>Insurer</TableHead>
                <TableHead>file_name</TableHead>
                <TableHead>Created Timestamp</TableHead>
                <TableHead>Formatted Timestamp</TableHead>
                <TableHead>Process Duration</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium hover:text-foreground"
                    onClick={onSortToggle}
                  >
                    Created {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={23} className="text-center text-muted-foreground py-12">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={23} className="text-center text-muted-foreground py-12">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {[
                      row.date_issue,
                      row.vehicle_no,
                      row.insured_name,
                      row.insured_ic_no,
                      row.insurer_contact_no,
                      row.insured_email,
                      row.vehicle_make_model,
                      row.type_of_cover,
                      row.sum_insured,
                      row.premium,
                      row.ncd,
                      row.total_base_premium,
                      row.total_extra_coverage,
                      row.gross_premium,
                      row.service_tax,
                      row.stamp_duty,
                      row.total_amount_payable_rounded,
                      row.insurer,
                      row.file_name,
                      row.created_timestamp,
                      row.formatted_timestamp,
                      row.process_duration,
                    ].map((val, i) => {
                      const str = val != null && String(val).trim() !== "" ? String(val) : "";
                      return (
                        <TableCell
                          key={i}
                          className="max-w-[200px] truncate"
                          title={str}
                        >
                          {str ? (str.length > 50 ? `${str.slice(0, 50)}…` : str) : "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
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
