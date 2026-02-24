import { useState, useEffect } from "react";
import { format } from "date-fns";
import { History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IssuanceRow } from "../hooks/useIMotorbikeProjectView";
import type { Tables } from "@/data/supabase/types";
import { supabase } from "@/data/supabase/client";

type FieldHistoryEntry = Tables<"imotorbike_billing_field_history">;

const EDITABLE_FIELDS: { key: keyof IssuanceRow; label: string; type?: "number" | "text" | "date" }[] = [
  { key: "client_name", label: "Client Name" },
  { key: "vehicle_no", label: "Vehicle No" },
  { key: "issue_date", label: "Issue Date", type: "date" },
  { key: "sum_insured", label: "Sum Insured (RM)", type: "number" },
  { key: "premium", label: "Premium" },
  { key: "ncd", label: "NCD" },
  { key: "total_base_premium", label: "Total Base Premium" },
  { key: "total_extra_coverage", label: "Total Extra Coverage" },
  { key: "gross_premium", label: "Gross Premium" },
  { key: "service_tax", label: "Service Tax" },
  { key: "stamp_duty", label: "Stamp Duty" },
  { key: "total_amount_payable", label: "Total Amount Payable (RM)" },
  { key: "ic", label: "IC" },
  { key: "contact_no", label: "Contact No" },
  { key: "email", label: "Email" },
  { key: "vehicle_make_model", label: "Vehicle Make/Model" },
  { key: "type_of_cover", label: "Type of Cover" },
];

function toInputValue(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "number") return String(val);
  return String(val).trim();
}

type IssuanceRowEditPanelProps = {
  row: IssuanceRow | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Record<string, string | number | null>>) => Promise<void>;
};

export function IssuanceRowEditPanel({
  row,
  onClose,
  onUpdate,
}: IssuanceRowEditPanelProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!row) return;
    const initial: Record<string, string> = {};
    for (const { key } of EDITABLE_FIELDS) {
      const val = row[key as keyof IssuanceRow];
      let v = toInputValue(val);
      if (key === "issue_date" && v) {
        v = v.split("T")[0];
      }
      initial[key] = v;
    }
    setFormValues(initial);
  }, [row?.id]);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["imotorbike-field-history", row?.id],
    queryFn: async () => {
      if (!row?.id) return [];
      const { data, error } = await supabase
        .from("imotorbike_billing_field_history")
        .select("*")
        .eq("normalised_id", row.id)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as FieldHistoryEntry[];
    },
    enabled: !!row?.id,
  });

  const hasChanges = row
    ? EDITABLE_FIELDS.some(({ key }) => {
        const current = toInputValue(row[key as keyof IssuanceRow]);
        const edited = formValues[key] ?? "";
        return current !== edited;
      })
    : false;

  const handleConfirm = async () => {
    if (!row || !hasChanges) return;
    const updates: Partial<Record<string, string | number | null>> = {};
    for (const { key, type } of EDITABLE_FIELDS) {
      const original = row[key as keyof IssuanceRow];
      const edited = formValues[key] ?? "";
      const origStr = toInputValue(original);
      if (origStr !== edited) {
        if (type === "number") {
          const num = edited === "" ? null : parseFloat(edited);
          updates[key] = Number.isNaN(num as number) ? null : num;
        } else {
          updates[key] = edited === "" ? null : edited;
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      await onUpdate(row.id, updates);
    }
  };

  if (!row) return null;

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-lg flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left">
          <SheetTitle className="text-base">Edit Row</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            <div className="w-full space-y-4">
              <div className="space-y-3">
                {EDITABLE_FIELDS.map(({ key, label, type }) => (
                  <div key={key} className="w-full space-y-1.5">
                    <Label htmlFor={key} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={key}
                      type={type ?? "text"}
                      value={formValues[key] ?? ""}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder="—"
                      className="h-9 w-full min-w-0 text-sm"
                    />
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleConfirm}
                disabled={!hasChanges}
              >
                Confirm Changes
              </Button>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Field history (latest)
                </div>
                <div className="rounded-md border p-2">
                  {historyLoading ? (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No field updates yet.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {history.map((h) => (
                        <li key={h.id} className="border-b border-border/50 pb-1.5 last:border-0">
                          <span className="font-medium">{h.field_name}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            {h.old_value ?? "—"} → {h.new_value ?? "—"}
                          </span>
                          <div className="mt-0.5 text-muted-foreground">
                            by {h.changed_by} · {format(new Date(h.changed_at), "d MMM, HH:mm")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
