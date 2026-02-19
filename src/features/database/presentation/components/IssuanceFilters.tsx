import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "@/features/database/lib/issuance-date-utils";
import type { FilterPreset } from "@/features/database/lib/issuance-date-utils";

type IssuanceFiltersProps = {
  filterLabel: string;
  filterPreset: FilterPreset;
  onFilterPresetChange: (preset: FilterPreset) => void;
  customRange: DateRange | null;
  onCustomRangeChange: (range: DateRange | null) => void;
  selectedInsurer: string | null;
  onInsurerChange: (insurer: string | null) => void;
  insurerOptions: (string | null)[];
  selectedPartner: string | null;
  onPartnerChange: (partner: string | null) => void;
  partnerOptions: (string | null)[];
};

export function IssuanceFilters({
  filterLabel,
  filterPreset,
  onFilterPresetChange,
  customRange,
  onCustomRangeChange,
  selectedInsurer,
  onInsurerChange,
  insurerOptions,
  selectedPartner,
  onPartnerChange,
  partnerOptions,
}: IssuanceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              {filterLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onFilterPresetChange("this_month")}>
              This month
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterPresetChange("last_month")}>
              Last month
            </DropdownMenuItem>
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
            <Button variant="outline" size="sm">
              Insurer: {selectedInsurer ?? "All"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onInsurerChange(null)}>All</DropdownMenuItem>
            {insurerOptions.map((ins) => (
              <DropdownMenuItem key={ins ?? ""} onClick={() => onInsurerChange(ins ?? null)}>
                {ins}
              </DropdownMenuItem>
            ))}
            {insurerOptions.length === 0 && (
              <DropdownMenuItem disabled>No insurers in data</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Partner: {selectedPartner ?? "All"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onPartnerChange(null)}>All</DropdownMenuItem>
            {partnerOptions.map((p) => (
              <DropdownMenuItem key={p ?? ""} onClick={() => onPartnerChange(p ?? null)}>
                {p}
              </DropdownMenuItem>
            ))}
            {partnerOptions.length === 0 && (
              <DropdownMenuItem disabled>No partners in data</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
