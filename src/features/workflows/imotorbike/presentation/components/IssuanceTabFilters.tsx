import { Filter, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSearch } from "./TableSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange, FilterPreset } from "@/features/workflows/imotorbike/lib/date-utils";

type IssuanceTabFiltersProps = {
  lastUpdated: Date | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterLabel: string;
  filterPreset: FilterPreset;
  onFilterPresetChange: (preset: FilterPreset) => void;
  customRange: DateRange | null;
  onCustomRangeChange: (range: DateRange | null) => void;
  selectedInsurer: string | null;
  onInsurerChange: (insurer: string | null) => void;
  insurerOptions: string[];
};

export function IssuanceTabFilters({
  lastUpdated,
  fileInputRef,
  onFileChange,
  onExport,
  searchQuery,
  onSearchChange,
  filterLabel,
  filterPreset,
  onFilterPresetChange,
  customRange,
  onCustomRangeChange,
  selectedInsurer,
  onInsurerChange,
  insurerOptions,
}: IssuanceTabFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <p className="text-sm text-muted-foreground">
        {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : "No data uploaded yet."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <TableSearch value={searchQuery} onChange={onSearchChange} placeholder="Search customer, plate, quotation…" />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <input
          ref={fileInputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              {filterLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onFilterPresetChange("all_time")}>All time</DropdownMenuItem>
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
              <DropdownMenuItem key={ins} onClick={() => onInsurerChange(ins)}>
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
  );
}
