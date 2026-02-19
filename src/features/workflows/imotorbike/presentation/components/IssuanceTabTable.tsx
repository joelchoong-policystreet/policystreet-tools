import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { TablePagination } from "@/shared/components/TablePagination";
import type { IMotorbikeRow } from "@/lib/imotorbike-csv";

type IssuanceTabTableProps = {
  rows: IMotorbikeRow[];
  emptyMessage: string;
  sortAsc: boolean;
  onSortToggle: () => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function IssuanceTabTable({
  rows,
  emptyMessage,
  sortAsc,
  onSortToggle,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: IssuanceTabTableProps) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-1 font-medium hover:text-foreground"
                  onClick={onSortToggle}
                >
                  Purchased Date
                  {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
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
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </Card>
  );
}
