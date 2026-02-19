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
                <TableHead>Document Ref.</TableHead>
                <TableHead className="max-w-[200px]">Extracted text</TableHead>
                <TableHead>Source filename</TableHead>
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
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.document_reference ?? "—"}</TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={row.extracted_text ?? undefined}
                    >
                      {row.extracted_text
                        ? row.extracted_text.length > 80
                          ? `${row.extracted_text.slice(0, 80)}…`
                          : row.extracted_text
                        : "—"}
                    </TableCell>
                    <TableCell>{row.source_filename ?? "—"}</TableCell>
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
