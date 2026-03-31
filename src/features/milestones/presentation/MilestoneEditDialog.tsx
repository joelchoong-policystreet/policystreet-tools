import { useEffect, useState } from "react";
import { ChevronDown, FileText, Flag, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { DemoMilestone, DemoMilestoneStatus } from "./milestone-demo-data";
import {
  demoToDraft,
  draftToDemo,
  emptyDraft,
  newId,
  type MilestoneDraft,
  type Quarter,
} from "./milestone-draft";

/** Muted “filled block” look for sidebar fields */
const SOFT_FIELD =
  "border-0 bg-[hsl(250_26%_96%)] shadow-none ring-1 ring-border/45 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/25";
const SOFT_LABEL = "text-xs font-medium text-muted-foreground";

const STATUS_OPTIONS: { value: DemoMilestoneStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "at_risk", label: "At risk" },
  { value: "dropped", label: "Dropped" },
  { value: "postponed", label: "Postponed" },
  { value: "merged", label: "Merged" },
  { value: "completed", label: "Completed" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** When editing, the milestone to clone into the form */
  milestone: DemoMilestone | null;
  filterYear: number;
  filterQuarter: string;
  onSave: (milestone: DemoMilestone) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
};

export function MilestoneEditDialog({
  open,
  onOpenChange,
  mode,
  milestone,
  filterYear,
  filterQuarter,
  onSave,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState<MilestoneDraft>(() =>
    milestone ? demoToDraft(milestone) : emptyDraft(filterYear, filterQuarter),
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      milestone ? demoToDraft(milestone) : emptyDraft(filterYear, filterQuarter),
    );
  }, [open, milestone, filterYear, filterQuarter]);

  const update = (patch: Partial<MilestoneDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    const id = milestone?.id ?? newId();
    try {
      await Promise.resolve(onSave(draftToDemo(draft, id)));
      toast.success(mode === "create" ? "Milestone created." : "Milestone saved.");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(mode === "create" ? "Could not create milestone." : "Could not save milestone.");
    }
  };

  const handleDelete = async () => {
    if (milestone && onDelete) {
      try {
        await Promise.resolve(onDelete(milestone.id));
        toast.success("Milestone deleted.");
        setDeleteOpen(false);
        onOpenChange(false);
      } catch (e) {
        console.error(e);
        toast.error("Could not delete milestone.");
      }
    }
  };

  const addTask = () => {
    setDraft((d) => ({
      ...d,
      tasks: [
        ...d.tasks,
        {
          id: newId(),
          title: "",
          dueDate: "",
          checklist: [],
        },
      ],
    }));
  };

  const updateTask = (taskId: string, patch: Partial<MilestoneDraft["tasks"][0]>) => {
    setDraft((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
  };

  const removeTask = (taskId: string) => {
    setDraft((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== taskId) }));
  };

  const addChecklistItem = (taskId: string) => {
    setDraft((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklist: [
                ...t.checklist,
                { id: newId(), label: "", completed: false },
              ],
            }
          : t,
      ),
    }));
  };

  const updateChecklistItem = (
    taskId: string,
    itemId: string,
    patch: Partial<MilestoneDraft["tasks"][0]["checklist"][0]>,
  ) => {
    setDraft((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklist: t.checklist.map((c) =>
                c.id === itemId
                  ? {
                      ...c,
                      ...patch,
                      ...(patch.completed === false ? { completedOn: undefined } : {}),
                    }
                  : c,
              ),
            }
          : t,
      ),
    }));
  };

  const removeChecklistItem = (taskId: string, itemId: string) => {
    setDraft((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId
          ? { ...t, checklist: t.checklist.filter((c) => c.id !== itemId) }
          : t,
      ),
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex min-h-0 max-h-[92vh] w-[min(100vw-1rem,52rem)] max-w-none flex-col gap-0 overflow-hidden p-0",
            "sm:max-h-[92vh] lg:max-w-[56rem]",
          )}
        >
          <DialogTitle className="sr-only">
            {draft.title.trim()
              ? `${mode === "create" ? "New milestone" : "Edit"}: ${draft.title.trim()}`
              : mode === "create"
                ? "New milestone"
                : "Edit milestone"}
          </DialogTitle>

          <header className="shrink-0 border-b border-border bg-muted/30 px-6 py-3 pr-12">
            <p className="text-xs text-muted-foreground">
              Milestones <span className="text-muted-foreground/70">&gt;</span>{" "}
              <span className="inline-flex items-center gap-1">
                <Flag className="h-3 w-3" aria-hidden />
                {mode === "create" ? "New" : "Edit"}
              </span>
            </p>
          </header>

          {/* Body: both columns scroll independently; min-h-0 + basis-0 lets flex children shrink and scroll */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:min-h-[calc(92vh-10.5rem)] md:max-h-[calc(92vh-10.5rem)] md:flex-row">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:min-h-0 md:basis-0 md:flex-1">
              <div
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-[hsl(250_22%_99%)] px-6 py-6 pr-4 sm:px-8 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]"
                tabIndex={-1}
              >
                <div className="flex w-full max-w-full flex-col gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="ms-title" className={SOFT_LABEL}>
                      Milestone name
                    </Label>
                    <div className={cn("rounded-xl px-4 py-3", SOFT_FIELD)}>
                      <Input
                        id="ms-title"
                        value={draft.title}
                        onChange={(e) => update({ title: e.target.value })}
                        placeholder="Enter a name for this milestone"
                        className={cn(
                          "h-auto border-0 bg-transparent p-0 shadow-none",
                          "text-[22px] font-semibold leading-snug tracking-tight sm:text-[24px]",
                          "text-foreground placeholder:text-muted-foreground/55",
                          "focus-visible:ring-0 focus-visible:ring-offset-0",
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ms-desc" className={SOFT_LABEL}>
                      Description
                    </Label>
                    <div
                      className={cn(
                        "flex w-full gap-3 rounded-[12px] border border-border/40 p-4",
                        "bg-[hsl(250_26%_96%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                      )}
                    >
                      <FileText
                        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/55"
                        aria-hidden
                      />
                      <Textarea
                        id="ms-desc"
                        value={draft.description}
                        onChange={(e) => update({ description: e.target.value })}
                        placeholder="Add description"
                        className={cn(
                          "min-h-[80px] max-h-[min(220px,32vh)] w-full flex-1 resize-y overflow-y-auto border-0 bg-transparent p-0 text-base leading-relaxed shadow-none",
                          "text-foreground/90 placeholder:text-muted-foreground/65",
                          "focus-visible:ring-0 focus-visible:ring-offset-0",
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2 border-t border-border/45 pt-10">
                  <Collapsible defaultOpen className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left text-base font-semibold text-foreground/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&[data-state=open]>svg]:rotate-180">
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                      <span>Subtasks</span>
                      <span className="rounded-full bg-muted/90 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {draft.tasks.length}
                      </span>
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0 gap-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-100/60 hover:text-indigo-700"
                      onClick={(e) => {
                        e.preventDefault();
                        addTask();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add subtask
                    </Button>
                  </div>
                  <CollapsibleContent className="space-y-3">
                    {draft.tasks.length === 0 ? (
                      <div
                        className={cn(
                          "flex w-full min-h-[100px] items-center justify-center rounded-2xl border border-dashed border-border/55 px-4 py-6 text-center",
                          "bg-[hsl(250_26%_96%)] text-sm text-muted-foreground/80",
                        )}
                      >
                        No subtasks yet — add one
                      </div>
                    ) : (
                      draft.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-border/50 bg-[hsl(250_28%_98%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Input
                              value={task.title}
                              onChange={(e) => updateTask(task.id, { title: e.target.value })}
                              placeholder="Subtask title"
                              className="min-w-[10rem] flex-1 rounded-full border-indigo-100/90 bg-[hsl(252_45%_99%)] px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground/65 focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                            />
                            <Input
                              type="date"
                              value={task.dueDate || ""}
                              onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                              className="h-10 w-[min(100%,11rem)] shrink-0 rounded-full border border-indigo-100/90 bg-white px-3 text-sm shadow-sm [color-scheme:light] focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 rounded-full text-muted-foreground hover:bg-red-50 hover:text-destructive"
                              aria-label="Remove subtask"
                              onClick={() => removeTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-4 space-y-3 border-t border-indigo-100/60 pt-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Checklist
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                onClick={() => addChecklistItem(task.id)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Item
                              </Button>
                            </div>
                            <ul className="space-y-2.5" role="list">
                              {task.checklist.map((item) => (
                                <li
                                  key={item.id}
                                  className="rounded-2xl border border-indigo-100/70 bg-[hsl(252_45%_99%)] p-3.5 shadow-[0_1px_2px_rgba(99,102,241,0.06)]"
                                >
                                  {/* Row: status + pill label + delete */}
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      className={cn(
                                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                                        item.completed
                                          ? "border-indigo-500 bg-indigo-500 text-white shadow-sm shadow-indigo-500/25"
                                          : "border-indigo-400/80 bg-white",
                                      )}
                                      aria-pressed={item.completed}
                                      onClick={() =>
                                        updateChecklistItem(task.id, item.id, {
                                          completed: !item.completed,
                                        })
                                      }
                                    >
                                      {item.completed && (
                                        <svg
                                          className="h-3.5 w-3.5"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                          strokeWidth={2.5}
                                          aria-hidden
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                    </button>
                                    <Input
                                      value={item.label}
                                      onChange={(e) =>
                                        updateChecklistItem(task.id, item.id, {
                                          label: e.target.value,
                                        })
                                      }
                                      placeholder="Describe this step…"
                                      className={cn(
                                        "h-10 min-w-0 flex-1 rounded-full border border-indigo-100/90 bg-white px-4 text-sm shadow-sm",
                                        "placeholder:text-muted-foreground/65",
                                        "focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20",
                                      )}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-red-50 hover:text-destructive"
                                      aria-label="Remove checklist item"
                                      onClick={() => removeChecklistItem(task.id, item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  {/* Completed on — second row, aligned with pill text */}
                                  {item.completed && (
                                    <div className="mt-3 flex flex-col gap-1.5 pl-9 sm:flex-row sm:items-center sm:gap-3">
                                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        Completed on
                                      </span>
                                      <div className="min-w-0 flex-1 sm:max-w-[220px]">
                                        <Input
                                          type="date"
                                          value={item.completedOn ?? ""}
                                          onChange={(e) =>
                                            updateChecklistItem(task.id, item.id, {
                                              completedOn: e.target.value || undefined,
                                            })
                                          }
                                          className={cn(
                                            "h-9 w-full rounded-full border border-indigo-100/90 bg-white px-3 text-sm shadow-sm",
                                            "[color-scheme:light]",
                                            "focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20",
                                          )}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
                </div>
              </div>
            </div>

            <aside className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/60 bg-[hsl(250_24%_98%)] md:max-w-[min(280px,36%)] md:min-h-0 md:flex-none md:basis-[min(280px,36%)] md:border-l md:border-t-0">
              <div className="shrink-0 border-b border-border/50 bg-[hsl(250_22%_96%)] px-5 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Properties
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Plan dates, ownership, and labels.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 pb-6 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                  <Label htmlFor="ms-status" className={SOFT_LABEL}>
                    Status
                  </Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => update({ status: v as DemoMilestoneStatus })}
                  >
                    <SelectTrigger id="ms-status" className={cn("h-10 rounded-lg", SOFT_FIELD)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-tier" className={SOFT_LABEL}>
                    Tier
                  </Label>
                  <Select
                    value={draft.tier}
                    onValueChange={(v) => update({ tier: v as "major" | "minor" })}
                  >
                    <SelectTrigger id="ms-tier" className={cn("h-10 rounded-lg", SOFT_FIELD)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-due" className={SOFT_LABEL}>
                    Due date
                  </Label>
                  <Input
                    id="ms-due"
                    type="date"
                    value={draft.dueDate || ""}
                    onChange={(e) => update({ dueDate: e.target.value })}
                    className={cn("h-10 rounded-lg [color-scheme:light]", SOFT_FIELD)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-year" className={SOFT_LABEL}>
                    Year
                  </Label>
                  <Input
                    id="ms-year"
                    type="number"
                    value={draft.year}
                    onChange={(e) => update({ year: Number.parseInt(e.target.value, 10) || draft.year })}
                    className={cn("h-10 rounded-lg", SOFT_FIELD)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-quarter" className={SOFT_LABEL}>
                    Quarter
                  </Label>
                  <Select
                    value={draft.quarter === "" ? undefined : draft.quarter}
                    onValueChange={(v) => update({ quarter: v as Quarter })}
                  >
                    <SelectTrigger id="ms-quarter" className={cn("h-10 rounded-lg", SOFT_FIELD)}>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-driver" className={SOFT_LABEL}>
                    Driver
                  </Label>
                  <Input
                    id="ms-driver"
                    value={draft.driver}
                    onChange={(e) => update({ driver: e.target.value })}
                    placeholder="Owner or driver"
                    className={cn("h-10 rounded-lg placeholder:text-muted-foreground/55", SOFT_FIELD)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-dept" className={SOFT_LABEL}>
                    Department
                  </Label>
                  <Input
                    id="ms-dept"
                    value={draft.department}
                    onChange={(e) => update({ department: e.target.value })}
                    placeholder="Department"
                    className={cn("h-10 rounded-lg placeholder:text-muted-foreground/55", SOFT_FIELD)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-tags" className={SOFT_LABEL}>
                    Tags (comma-separated)
                  </Label>
                  <Input
                    id="ms-tags"
                    value={draft.tags}
                    onChange={(e) => update({ tags: e.target.value })}
                    placeholder="Product, Growth"
                    className={cn("h-10 rounded-lg placeholder:text-muted-foreground/55", SOFT_FIELD)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-link" className={SOFT_LABEL}>
                    External link
                  </Label>
                  <Input
                    id="ms-link"
                    type="url"
                    value={draft.externalUrl}
                    onChange={(e) => update({ externalUrl: e.target.value })}
                    placeholder="https://…"
                    className={cn("h-10 rounded-lg placeholder:text-muted-foreground/55", SOFT_FIELD)}
                  />
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="shrink-0 border-t border-border/80 bg-[hsl(250_24%_98%)] px-6 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {mode === "edit" && milestone && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete
                  </Button>
                )}
                <Button
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleSave}
                >
                  Save
                </Button>
              </div>
            </div>
          </footer>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The milestone and its subtasks will be removed from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
