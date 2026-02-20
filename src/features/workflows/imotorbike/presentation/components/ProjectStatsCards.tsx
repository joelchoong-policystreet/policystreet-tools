import { Check, AlertCircle, ClipboardList, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProjectStatsCardsProps = {
  completeCount: number;
  incompleteCount: number;
  cancelledCount: number;
  total: number;
  totalLabel?: string;
  onFilterChange?: (filter: "all" | "incomplete" | "cancelled" | "complete") => void;
  activeFilter?: "all" | "incomplete" | "cancelled" | "complete";
};

export function ProjectStatsCards({
  completeCount,
  incompleteCount,
  cancelledCount,
  total,
  totalLabel = "Total Issuances",
  onFilterChange,
  activeFilter,
}: ProjectStatsCardsProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Complete */}
      <Card
        className={`flex-1 min-w-[120px] transition-colors ${onFilterChange ? "cursor-pointer hover:bg-muted/50" : ""
          } ${activeFilter === "complete" ? "ring-2 ring-primary" : ""}`}
        onClick={() => onFilterChange?.(activeFilter === "complete" ? "all" : "complete")}
      >
        <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums">{completeCount}</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
          <div className={`rounded-full p-1.5 shrink-0 ${activeFilter === "complete" ? "bg-primary text-primary-foreground" : "bg-green-500/15"}`}>
            <Check className={`h-3.5 w-3.5 ${activeFilter === "complete" ? "text-primary-foreground" : "text-green-600"}`} />
          </div>
        </CardContent>
      </Card>

      {/* Incomplete */}
      <Card
        className={`flex-1 min-w-[120px] transition-colors ${onFilterChange ? "cursor-pointer hover:bg-muted/50" : ""
          } ${activeFilter === "incomplete" ? "ring-2 ring-primary" : ""}`}
        onClick={() => onFilterChange?.(activeFilter === "incomplete" ? "all" : "incomplete")}
      >
        <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-1.5">
            <div>
              <p className="text-lg font-semibold tabular-nums">{incompleteCount}</p>
              <p className="text-xs text-muted-foreground">Incomplete</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground shrink-0 mt-0.5 cursor-help"
                  onClick={(e) => e.stopPropagation()}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                <p className="font-medium mb-1">Incomplete issuances</p>
                <p>Records where the <strong>Total Amount Payable</strong> is missing <em>and</em> the verification status is still <strong>Pending</strong>. These require action before billing.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={`rounded-full p-1.5 shrink-0 ${activeFilter === "incomplete" ? "bg-primary text-primary-foreground" : "bg-amber-500/15"}`}>
            <AlertCircle className={`h-3.5 w-3.5 ${activeFilter === "incomplete" ? "text-primary-foreground" : "text-amber-600"}`} />
          </div>
        </CardContent>
      </Card>

      {/* Cancelled */}
      <Card
        className={`flex-1 min-w-[120px] transition-colors ${onFilterChange ? "cursor-pointer hover:bg-muted/50" : ""
          } ${activeFilter === "cancelled" ? "ring-2 ring-primary" : ""}`}
        onClick={() => onFilterChange?.(activeFilter === "cancelled" ? "all" : "cancelled")}
      >
        <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-1.5">
            <div>
              <p className="text-lg font-semibold tabular-nums">{cancelledCount}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground shrink-0 mt-0.5 cursor-help"
                  onClick={(e) => e.stopPropagation()}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                <p className="font-medium mb-1">Cancelled issuances</p>
                <p>Records manually marked as <strong>"Issuance cancelled and not to be billed"</strong> via the Action column. These are excluded from billing but kept for audit purposes.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={`rounded-full p-1.5 shrink-0 ${activeFilter === "cancelled" ? "bg-primary text-primary-foreground" : "bg-red-500/15"}`}>
            <AlertCircle className={`h-3.5 w-3.5 ${activeFilter === "cancelled" ? "text-primary-foreground" : "text-red-600"}`} />
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="flex-1 min-w-[120px] bg-primary text-primary-foreground">
        <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums">{total}</p>
            <p className="text-xs text-primary-foreground/80">{totalLabel}</p>
          </div>
          <div className="rounded-full bg-white/20 p-1.5 shrink-0">
            <ClipboardList className="h-3.5 w-3.5 text-white" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
