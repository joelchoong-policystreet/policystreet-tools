import { Link } from "react-router-dom";
import { Receipt, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "../hooks/useDatabaseIssuanceView";

type DatabaseViewTabsProps = {
  viewMode: ViewMode;
};

export function DatabaseViewTabs({ viewMode }: DatabaseViewTabsProps) {
  return (
    <div className="border-b border-border mb-4 flex gap-6">
      <Link
        to="/database?view=quotation"
        className={cn(
          "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
          viewMode === "quotation"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <Receipt className="h-4 w-4" />
        Quotation
      </Link>
      <Link
        to="/database?view=issuance"
        className={cn(
          "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
          viewMode === "issuance"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <BadgeCheck className="h-4 w-4" />
        Issuance
      </Link>
    </div>
  );
}
