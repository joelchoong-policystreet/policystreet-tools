import { BadgeCheck, DollarSign, ScanLine, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabKind } from "../hooks/useIMotorbikeProjectView";

type ProjectTabsProps = {
  activeTab: TabKind;
  onTabChange: (tab: TabKind) => void;
};

export function ProjectTabs({ activeTab, onTabChange }: ProjectTabsProps) {
  return (
    <div className="border-b border-border mb-4 flex gap-6">
      <button
        type="button"
        onClick={() => onTabChange("issuance")}
        className={cn(
          "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
          activeTab === "issuance"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <BadgeCheck className="h-4 w-4" />
        Issuance
      </button>
      <button
        type="button"
        onClick={() => onTabChange("insurer_billing")}
        className={cn(
          "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
          activeTab === "insurer_billing"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <DollarSign className="h-4 w-4" />
        Insurer billing data
      </button>
      <button
        type="button"
        onClick={() => onTabChange("ocr")}
        className={cn(
          "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
          activeTab === "ocr"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <ScanLine className="h-4 w-4" />
        OCR data
      </button>
      <button
        type="button"
        onClick={() => onTabChange("errors")}
        className={cn(
          "inline-flex items-center gap-2 px-1 pb-2 text-sm font-medium border-b-2 transition-colors",
          activeTab === "errors"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <AlertCircle className="h-4 w-4" />
        Errors
      </button>
    </div>
  );
}
