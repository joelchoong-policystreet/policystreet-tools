import { useState } from "react";
import { Upload, Filter, ArrowUp, ArrowDown } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TablePagination } from "@/shared/components/TablePagination";
import type { InsurerBillingRow } from "../hooks/useIMotorbikeProjectView";
import type { DateRange, FilterPreset } from "@/features/workflows/imotorbike/lib/date-utils";

const BILLING_UPLOAD_INSURERS = ["Allianz", "Generali"] as const;

type InsurerBillingTabContentProps = {
  companyId: string | null;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmInsurerAndOpenFilePicker: (insurer: string) => void;
  filterLabel: string;
  filterPreset: FilterPreset;
  onFilterPresetChange: (preset: FilterPreset) => void;
  customRange: DateRange | null;
  onCustomRangeChange: (range: DateRange | null) => void;
  selectedInsurer: string | null;
  onInsurerChange: (insurer: string | null) => void;
  insurerOptions: (string | null)[];
  rows: InsurerBillingRow[];
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

export function InsurerBillingTabContent({
  companyId,
  uploading,
  fileInputRef,
  onFileChange,
  onConfirmInsurerAndOpenFilePicker,
  filterLabel,
  filterPreset,
  onFilterPresetChange,
  customRange,
  onCustomRangeChange,
  selectedInsurer,
  onInsurerChange,
  insurerOptions,
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
}: InsurerBillingTabContentProps) {
  const [insurerDialogOpen, setInsurerDialogOpen] = useState(false);
  const [selectedInsurerForUpload, setSelectedInsurerForUpload] = useState<string | null>(null);

  const handleUploadClick = () => {
    setSelectedInsurerForUpload(null);
    setInsurerDialogOpen(true);
  };

  const handleConfirmInsurer = () => {
    if (!selectedInsurerForUpload) return;
    onConfirmInsurerAndOpenFilePicker(selectedInsurerForUpload);
    setInsurerDialogOpen(false);
  };

  return (
    <>
      <Dialog open={insurerDialogOpen} onOpenChange={setInsurerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select insurer for this upload</DialogTitle>
            <DialogDescription>
              Choose which insurer this billing data is for. All rows in the CSV will be tagged with this insurer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="flex flex-wrap gap-2">
              {BILLING_UPLOAD_INSURERS.map((insurer) => (
                <Button
                  key={insurer}
                  type="button"
                  variant={selectedInsurerForUpload === insurer ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInsurerForUpload(insurer)}
                >
                  {insurer}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInsurerDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmInsurer}
              disabled={!selectedInsurerForUpload}
            >
              Select file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-4 mb-4">
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
              onClick={handleUploadClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading…" : "Upload CSV"}
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              {filterLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onFilterPresetChange("this_month")}>This month</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterPresetChange("last_month")}>Last month</DropdownMenuItem>
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
                    onCustomRangeChange(range ?? null);
                    if (range?.from) onFilterPresetChange("custom");
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Insurer: {selectedInsurer ?? "All"}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onInsurerChange(null)}>All</DropdownMenuItem>
            {insurerOptions.map((ins) => (
              <DropdownMenuItem key={ins ?? ""} onClick={() => onInsurerChange(ins ?? null)}>
                {ins}
              </DropdownMenuItem>
            ))}
            {insurerOptions.length === 0 && <DropdownMenuItem disabled>No insurers</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Card>
        {error && (
          <div className="p-4 text-sm text-destructive border-b">Failed to load: {error.message}</div>
        )}
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
                    Billing Date {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </button>
                </TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Insurer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Policy No.</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.billing_date ?? "—"}</TableCell>
                    <TableCell>{row.reference_number ?? "—"}</TableCell>
                    <TableCell>{row.insurer ?? "—"}</TableCell>
                    <TableCell>{row.amount ?? "—"}</TableCell>
                    <TableCell>{row.policy_number ?? "—"}</TableCell>
                    <TableCell>{row.description ?? "—"}</TableCell>
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
