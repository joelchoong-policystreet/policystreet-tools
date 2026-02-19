import { Check, Clock, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type IssuanceStatsCardsProps = {
  before6PM: number;
  after6PM: number;
  totalCount: number;
  tableLabel: string;
};

export function IssuanceStatsCards({
  before6PM,
  after6PM,
  totalCount,
  tableLabel,
}: IssuanceStatsCardsProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Card className="flex-1 min-w-[120px]">
        <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums">{before6PM}</p>
            <p className="text-xs text-muted-foreground">Before 6PM</p>
          </div>
          <div className="rounded-full bg-green-500/15 p-1.5 shrink-0">
            <Check className="h-3.5 w-3.5 text-green-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="flex-1 min-w-[120px]">
        <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums">{after6PM}</p>
            <p className="text-xs text-muted-foreground">After 6PM</p>
          </div>
          <div className="rounded-full bg-amber-500/15 p-1.5 shrink-0">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="flex-1 min-w-[120px] bg-primary text-primary-foreground">
        <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums">{totalCount}</p>
            <p className="text-xs text-primary-foreground/80">Total {tableLabel}s</p>
          </div>
          <div className="rounded-full bg-white/20 p-1.5 shrink-0">
            <ClipboardList className="h-3.5 w-3.5 text-white" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
