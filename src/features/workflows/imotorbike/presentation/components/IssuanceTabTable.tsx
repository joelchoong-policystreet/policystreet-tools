import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TablePagination } from "@/shared/components/TablePagination";
import type { IssuanceRow } from "../hooks/useIMotorbikeProjectView";

type IssuanceTabTableProps = {
  rows: IssuanceRow[];
  emptyMessage: string;
  sortAsc: boolean;
  onSortToggle: () => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  verificationStatuses: Record<string, string>;
  onVerificationStatusChange: (id: string, status: string) => void;
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
  verificationStatuses,
  onVerificationStatusChange,
}: IssuanceTabTableProps) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-20 w-[180px] shadow-[1px_0_0_hsl(var(--border))]">
                Action
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-1 font-medium hover:text-foreground"
                  onClick={onSortToggle}
                >
                  Issue Date
                  {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </button>
              </TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>Vehicle No</TableHead>
              <TableHead className="text-right min-w-[120px]">Sum Insured (RM)</TableHead>
              <TableHead className="text-right min-w-[100px]">Premium</TableHead>
              <TableHead className="text-right min-w-[80px]">NCD</TableHead>
              <TableHead className="text-right min-w-[150px]">Total Base Premium</TableHead>
              <TableHead className="text-right min-w-[170px]">Total Extra Coverage</TableHead>
              <TableHead className="text-right min-w-[130px]">Gross Premium</TableHead>
              <TableHead className="text-right min-w-[110px]">Service Tax</TableHead>
              <TableHead className="text-right min-w-[110px]">Stamp Duty</TableHead>
              <TableHead className="text-right min-w-[180px]">Total Amount Payable (RM)</TableHead>
              <TableHead>Insurer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-12">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isComplete = row.total_amount_payable != null && String(row.total_amount_payable).trim() !== "";
                const currentStatus = verificationStatuses[row.id] || "pending";

                return (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 bg-background z-10 shadow-[1px_0_0_hsl(var(--border))]">
                      {isComplete ? (
                        <div className="inline-flex h-8 items-center justify-center rounded-md bg-blue-100 px-3 text-xs font-medium text-blue-700 w-full cursor-default">
                          Completed
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {currentStatus === "cancelled_billed" ? (
                              <Button variant="outline" size="sm" className="h-8 w-full justify-between px-2 text-[11px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800">
                                Verified
                                <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1 shrink-0" />
                              </Button>
                            ) : currentStatus === "cancelled_not_billed" ? (
                              <Button variant="outline" size="sm" className="h-8 w-full justify-between px-2 text-[11px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800">
                                Issuance Cancelled
                                <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1 shrink-0" />
                              </Button>
                            ) : (
                              <Button variant="destructive" size="sm" className="h-8 w-full justify-between px-2 text-[11px]">
                                Verification Required
                                <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1 shrink-0" />
                              </Button>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[300px]">
                            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground leading-snug">
                              This data is considered incomplete due to incomplete OCR data.
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              onClick={() => onVerificationStatusChange(row.id, "pending")}
                            >
                              Pending verification (default)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs text-amber-600 focus:text-amber-700 cursor-pointer"
                              onClick={() => onVerificationStatusChange(row.id, "cancelled_not_billed")}
                            >
                              Issuance cancelled and not to be billed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs text-blue-600 focus:text-blue-700 cursor-pointer"
                              onClick={() => onVerificationStatusChange(row.id, "cancelled_billed")}
                            >
                              Issuance cancelled but still billed
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                    <TableCell>{row.issue_date || "-"}</TableCell>
                    <TableCell>{row.client_name || "-"}</TableCell>
                    <TableCell>{row.vehicle_no || "-"}</TableCell>
                    <TableCell className="text-right">
                      {row.sum_insured != null ? Number(row.sum_insured).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.premium != null ? Number(row.premium).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.ncd != null ? Number(row.ncd).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.total_base_premium != null ? Number(row.total_base_premium).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.total_extra_coverage != null ? Number(row.total_extra_coverage).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.gross_premium != null ? Number(row.gross_premium).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.service_tax != null ? Number(row.service_tax).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.stamp_duty != null ? Number(row.stamp_duty).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.total_amount_payable != null ? Number(row.total_amount_payable).toFixed(2) : "-"}
                    </TableCell>
                    <TableCell>{row.insurer_billing_data?.insurer || "-"}</TableCell>
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
  );
}
