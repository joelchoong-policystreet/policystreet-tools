import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, getQuarter, getYear, parseISO } from "date-fns";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  ListChecks,
  Pin,
  Share2,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { DemoMilestone, DemoMilestoneStatus, DemoTask } from "./milestone-demo-data";
import { MilestoneEditDialog } from "./MilestoneEditDialog";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/data/supabase/client";
import Papa from "papaparse";
import {
  deleteMilestoneById,
  fetchMilestoneTagsByMilestoneIds,
  fetchMilestoneUpdates,
  insertMilestoneUpdate,
  persistMilestone,
  setChecklistItemCompleted,
  syncMilestoneTags,
  updateMilestoneStatus,
} from "../data/milestonePersistence";

const ACCENT = {
  text: "text-[#3b5bfd]",
  bg: "bg-[#3b5bfd]",
  bgSoft: "bg-[#eef0ff]",
  border: "border-[#d2d7ff]",
  ring: "ring-[#3b5bfd]/25",
  borderStrong: "border-[#3b5bfd]",
  muted: "text-[#2c3fb3]",
};

function formatShortDate(iso: string) {
  if (!iso?.trim()) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return "—";
  }
}

function statusLabel(s: DemoMilestoneStatus) {
  const map: Record<DemoMilestoneStatus, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    at_risk: "At risk",
    dropped: "Dropped",
    postponed: "Postponed",
    merged: "Merged",
    completed: "Completed",
  };
  return map[s];
}

function StatusBadge({ status }: { status: DemoMilestoneStatus }) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize";
  if (status === "in_progress") {
    return (
      <span className={cn(base, "border-indigo-500 bg-white text-indigo-800")}>{statusLabel(status)}</span>
    );
  }
  if (status === "completed") {
    return (
      <span className={cn(base, "border-emerald-300 bg-emerald-50 text-emerald-800")}>
        {statusLabel(status)}
      </span>
    );
  }
  if (status === "at_risk" || status === "dropped") {
    return (
      <span className={cn(base, "border-amber-400 bg-amber-50 text-amber-900")}>{statusLabel(status)}</span>
    );
  }
  if (status === "postponed" || status === "merged") {
    return (
      <span className={cn(base, "border-border bg-muted/60 text-muted-foreground")}>{statusLabel(status)}</span>
    );
  }
  return <span className={cn(base, "border-border bg-muted/50 text-muted-foreground")}>{statusLabel(status)}</span>;
}

function formatUpdateTimestamp(iso: string) {
  if (!iso?.trim()) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function formatTaskDueLabel(iso: string | null): string {
  if (!iso?.trim()) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

type ViewMode = "list" | "roadmap" | "table";

const PIN_STORAGE_KEY = "milestones:pinned-view";

type PinnedView = {
  year: number;
  quarter: string;
  driverFilter: string;
  deptFilter: string;
};

type DbMilestone = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: DemoMilestoneStatus;
  tier: "major" | "minor";
  year: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  due_date: string | null;
  driver: string;
  department: string;
  created_at: string;
  link: string | null;
};

type DbTask = {
  id: string;
  milestone_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

type DbChecklistItem = {
  id: string;
  task_id: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

async function fetchMilestones(): Promise<DbMilestone[]> {
  const { data, error } = await (supabase as any)
    .from("milestones")
    .select(
      [
        "id",
        "user_id",
        "title",
        "description",
        "status",
        "tier",
        "year",
        "quarter",
        "due_date",
        "driver",
        "department",
        "created_at",
        "link",
      ].join(","),
    )
    .order("year", { ascending: true })
    .order("quarter", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbMilestone[];
}

async function fetchTasks(milestoneIds: string[]): Promise<DbTask[]> {
  if (milestoneIds.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from("milestone_tasks")
    .select("id,milestone_id,title,due_date,completed_at,created_at")
    .in("milestone_id", milestoneIds);

  if (error) throw error;
  return (data ?? []) as DbTask[];
}

async function fetchChecklist(taskIds: string[]): Promise<DbChecklistItem[]> {
  if (taskIds.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from("milestone_task_checklist_items")
    .select("id,task_id,label,completed,completed_at,created_at")
    .in("task_id", taskIds);

  if (error) throw error;
  return (data ?? []) as DbChecklistItem[];
}

function mapDbToDemo(m: DbMilestone, tasks: DemoTask[], tags: string[]): DemoMilestone {
  const desc = m.description ?? "";
  const preview =
    desc.length <= 140 ? (desc || "No description") : `${desc.slice(0, 137)}…`;

  return {
    id: m.id,
    title: m.title,
    description: desc,
    listPreview: preview,
    tier: m.tier,
    quarter: m.quarter,
    year: m.year,
    status: m.status,
    dueDate: m.due_date ?? "",
    driver: m.driver,
    department: m.department,
    tags,
    externalUrl: m.link ?? undefined,
    tasks,
  };
}

function normaliseStatus(raw: string | undefined): DemoMilestoneStatus {
  const base = (raw ?? "").toLowerCase().replace(/\s+/g, "_");
  const allowed: DemoMilestoneStatus[] = [
    "not_started",
    "in_progress",
    "at_risk",
    "dropped",
    "postponed",
    "merged",
    "completed",
  ];
  if (allowed.includes(base as DemoMilestoneStatus)) return base as DemoMilestoneStatus;
  if (base === "inprogress") return "in_progress";
  if (base === "notstarted") return "not_started";
  return "not_started";
}

function normaliseTier(raw: string | undefined): "major" | "minor" {
  const base = (raw ?? "").toLowerCase().trim();
  return base === "minor" ? "minor" : "major";
}

function normaliseQuarter(raw: string | undefined): DbMilestone["quarter"] {
  const base = (raw ?? "").toUpperCase().trim();
  if (base === "Q1" || base === "Q2" || base === "Q3" || base === "Q4") return base;
  const today = new Date();
  return `Q${getQuarter(today)}` as DbMilestone["quarter"];
}

export default function MilestonesPage() {
  const queryClient = useQueryClient();
  const { data: dbMilestones = [], isLoading, refetch } = useQuery({
    queryKey: ["milestones"],
    queryFn: fetchMilestones,
  });

  const milestoneIds = useMemo(() => dbMilestones.map((m) => m.id), [dbMilestones]);

  const { data: tagsByMilestoneId = {} } = useQuery({
    queryKey: ["milestone-tags", milestoneIds],
    queryFn: () => fetchMilestoneTagsByMilestoneIds(milestoneIds),
    enabled: milestoneIds.length > 0,
  });

  const { data: dbTasks = [] } = useQuery({
    queryKey: ["milestone-tasks", milestoneIds],
    queryFn: () => fetchTasks(milestoneIds),
    enabled: milestoneIds.length > 0,
  });
  const [searchParams] = useSearchParams();
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState<string>("Q1");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [pinned, setPinned] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<DemoMilestone | null>(null);

  const taskIds = useMemo(() => dbTasks.map((t) => t.id), [dbTasks]);

  const { data: dbChecklist = [] } = useQuery({
    queryKey: ["milestone-task-checklist", taskIds],
    queryFn: () => fetchChecklist(taskIds),
    enabled: taskIds.length > 0,
  });

  const checklistByTask = useMemo(() => {
    const map: Record<string, { id: string; label: string; completed: boolean; completedOn?: string }[]> = {};
    for (const c of dbChecklist) {
      const list = map[c.task_id] ?? [];
      list.push({
        id: c.id,
        label: c.label,
        completed: c.completed,
        completedOn: c.completed_at ?? undefined,
      });
      map[c.task_id] = list;
    }
    return map;
  }, [dbChecklist]);

  const tasksByMilestone = useMemo(() => {
    const map: Record<string, DemoTask[]> = {};
    for (const t of dbTasks) {
      const list = map[t.milestone_id] ?? [];
      list.push({
        id: t.id,
        title: t.title,
        dueDate: t.due_date ?? "",
        dueLabel: formatTaskDueLabel(t.due_date),
        checklist: checklistByTask[t.id] ?? [],
      });
      map[t.milestone_id] = list;
    }
    return map;
  }, [dbTasks, checklistByTask]);

  const milestones = useMemo(
    () =>
      dbMilestones.map((m) =>
        mapDbToDemo(m, tasksByMilestone[m.id] ?? [], tagsByMilestoneId[m.id] ?? []),
      ),
    [dbMilestones, tasksByMilestone, tagsByMilestoneId],
  );

  const drivers = useMemo(() => {
    const s = new Set(milestones.map((m) => m.driver));
    return ["all", ...Array.from(s)];
  }, [milestones]);
  const departments = useMemo(() => {
    const s = new Set(milestones.map((m) => m.department));
    return ["all", ...Array.from(s)];
  }, [milestones]);

  const filtered = useMemo(() => {
    return milestones.filter((m) => {
      if (m.year !== year) return false;
      if (quarter !== "all" && m.quarter !== quarter) return false;
      if (driverFilter !== "all" && m.driver !== driverFilter) return false;
      if (deptFilter !== "all" && m.department !== deptFilter) return false;
      return true;
    });
  }, [milestones, year, quarter, driverFilter, deptFilter]);

  const [selectedId, setSelectedId] = useState<string | null>(filtered[0]?.id ?? null);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((m) => m.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((m) => m.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const { data: milestoneUpdates = [] } = useQuery({
    queryKey: ["milestone-updates", selectedId],
    queryFn: () => fetchMilestoneUpdates(selectedId!),
    enabled: selectedId != null,
  });

  const editMilestoneLive =
    editMode === "edit" && editTarget
      ? (milestones.find((m) => m.id === editTarget.id) ?? editTarget)
      : null;

  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [newUpdateMessage, setNewUpdateMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setChecklistState({});
  }, [selectedId]);

  const toggleChecklist = useCallback(
    async (taskId: string, itemId: string, completed: boolean) => {
      const key = `${taskId}:${itemId}`;
      const next = !completed;
      setChecklistState((prev) => ({ ...prev, [key]: next }));
      try {
        await setChecklistItemCompleted(itemId, next);
        await queryClient.invalidateQueries({ queryKey: ["milestone-task-checklist"] });
        setChecklistState((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      } catch (e) {
        console.error(e);
        setChecklistState((prev) => ({ ...prev, [key]: completed }));
        toast.error("Could not update checklist.");
      }
    },
    [queryClient],
  );

  const isItemDone = useCallback(
    (taskId: string, itemId: string, defaultCompleted: boolean) => {
      const key = `${taskId}:${itemId}`;
      if (key in checklistState) return checklistState[key];
      return defaultCompleted;
    },
    [checklistState],
  );

  // Initialise filters based on URL, pinned view, or today's date/quarter
  useEffect(() => {
    const params = searchParams;
    const yParam = params.get("y");
    const qParam = params.get("q");
    const dParam = params.get("d");
    const deptParam = params.get("dept");

    if (yParam || qParam || dParam || deptParam) {
      if (yParam && !Number.isNaN(Number.parseInt(yParam, 10))) {
        setYear(Number.parseInt(yParam, 10));
      } else {
        setYear(getYear(new Date()));
      }
      if (qParam && ["all", "Q1", "Q2", "Q3", "Q4"].includes(qParam)) {
        setQuarter(qParam);
      } else {
        const today = new Date();
        setQuarter(`Q${getQuarter(today)}` as string);
      }
      if (dParam) setDriverFilter(dParam);
      if (deptParam) setDeptFilter(deptParam);
      setPinned(false);
      return;
    }

    try {
      const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as PinnedView;
        if (stored.year) setYear(stored.year);
        if (stored.quarter) setQuarter(stored.quarter);
        if (stored.driverFilter) setDriverFilter(stored.driverFilter);
        if (stored.deptFilter) setDeptFilter(stored.deptFilter);
        setPinned(true);
        return;
      }
    } catch {
      // ignore storage errors
    }

    const today = new Date();
    setYear(getYear(today));
    setQuarter(`Q${getQuarter(today)}` as string);
  }, [searchParams]);

  // Persist pinned view whenever filters change while pinned
  useEffect(() => {
    if (!pinned) return;
    const payload: PinnedView = {
      year,
      quarter,
      driverFilter,
      deptFilter,
    };
    try {
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [pinned, year, quarter, driverFilter, deptFilter]);

  const handleTogglePinned = () => {
    setPinned((prev) => {
      const next = !prev;
      if (!next) {
        try {
          window.localStorage.removeItem(PIN_STORAGE_KEY);
        } catch {
          // ignore
        }
      } else {
        const payload: PinnedView = {
          year,
          quarter,
          driverFilter,
          deptFilter,
        };
        try {
          window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleAddUpdate = async () => {
    if (!selectedId) return;
    const trimmed = newUpdateMessage.trim();
    if (!trimmed) return;
    const { data: auth } = await supabase.auth.getUser();
    const authorName =
      (auth.user?.user_metadata?.full_name as string | undefined)?.trim() ||
      auth.user?.email?.trim() ||
      "You";
    try {
      await insertMilestoneUpdate({
        milestoneId: selectedId,
        message: trimmed,
        authorName,
      });
      setNewUpdateMessage("");
      await queryClient.invalidateQueries({ queryKey: ["milestone-updates", selectedId] });
    } catch (e) {
      console.error(e);
      toast.error("Could not post update.");
    }
  };

  const handleUploadCsvClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        toast.error("Could not parse CSV. Please check the file format.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error("You must be signed in to upload milestones.");
        return;
      }

      const rows = (parsed.data ?? [])
        .map((row) => {
          const tagsRaw = row.tags ?? row.Tags ?? "";
          const tags =
            typeof tagsRaw === "string"
              ? tagsRaw
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              : [];

          const yearRaw = row.year ?? row.Year;
          const yearParsed = Number.parseInt(
            yearRaw && yearRaw.trim() !== "" ? yearRaw : String(getYear(new Date())),
            10,
          );

          const due =
            (row.due_date ?? row.dueDate ?? row.DueDate)?.trim() || null;

          return {
            user_id: authData.user.id,
            title: row.title ?? row.Title ?? "",
            description: row.description ?? row.Description ?? "",
            status: normaliseStatus(row.status ?? row.Status),
            tier: normaliseTier(row.tier ?? row.Tier),
            year: Number.isNaN(yearParsed) ? getYear(new Date()) : yearParsed,
            quarter: normaliseQuarter(row.quarter ?? row.Quarter),
            due_date: due,
            tags,
            driver: (row.driver ?? row.Driver ?? "").trim() || "—",
            department: (row.department ?? row.Department ?? "").trim() || "—",
            link: (row.link ?? row.Link ?? "").trim() || null,
          };
        })
        .filter((r) => r.title.trim().length > 0);

      if (rows.length === 0) {
        toast.error("No valid rows found in CSV.");
        return;
      }

      const milestonesPayload = rows.map(({ tags: _tags, ...rest }) => rest);
      const { data: inserted, error } = await supabase.from("milestones").insert(milestonesPayload).select("id");
      if (error) {
        console.error("Milestones CSV upload error", error);
        toast.error(`Upload failed: ${error.message}`);
        return;
      }

      const insertedRows = inserted ?? [];
      for (let i = 0; i < insertedRows.length; i++) {
        await syncMilestoneTags(insertedRows[i].id, rows[i]?.tags ?? []);
      }

      toast.success(`Uploaded ${rows.length} milestone(s).`);
      void refetch();
      await queryClient.invalidateQueries({ queryKey: ["milestone-tags"] });
    } catch {
      toast.error("Unexpected error while uploading CSV.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const openCreateMilestone = () => {
    setEditMode("create");
    setEditTarget(null);
    setEditOpen(true);
  };

  const openEditMilestone = (m: DemoMilestone) => {
    setSelectedId(m.id);
    setEditMode("edit");
    setEditTarget(m);
    setEditOpen(true);
  };

  const handleSaveMilestone = async (m: DemoMilestone, saveMode: "create" | "edit") => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      toast.error("You must be signed in to save milestones.");
      throw new Error("Not authenticated");
    }
    await persistMilestone(m, saveMode, auth.user.id);
    setSelectedId(m.id);
    await queryClient.invalidateQueries({ queryKey: ["milestones"] });
    await queryClient.invalidateQueries({ queryKey: ["milestone-tags"] });
    await queryClient.invalidateQueries({ queryKey: ["milestone-tasks"] });
    await queryClient.invalidateQueries({ queryKey: ["milestone-task-checklist"] });
  };

  const handleDeleteMilestone = async (id: string) => {
    await deleteMilestoneById(id);
    setSelectedId((cur) => (cur === id ? null : cur));
    await queryClient.invalidateQueries({ queryKey: ["milestones"] });
    await queryClient.invalidateQueries({ queryKey: ["milestone-tags"] });
    await queryClient.invalidateQueries({ queryKey: ["milestone-tasks"] });
    await queryClient.invalidateQueries({ queryKey: ["milestone-task-checklist"] });
    await queryClient.invalidateQueries({ queryKey: ["milestone-updates"] });
  };

  const handleShareView = () => {
    const params = new URLSearchParams({
      y: String(year),
      q: quarter,
      d: driverFilter,
      dept: deptFilter,
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("View link copied to clipboard."),
      () => toast.error("Could not copy link."),
    );
  };

  return (
    <div className="min-h-screen bg-[hsl(250_20%_98%)]">
      <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Your milestones
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Period, driver, and department filters — pick a milestone for full detail.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-lg border-indigo-200 bg-white px-3"
              onClick={handleShareView}
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share view
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2 rounded-lg border-indigo-200 bg-white px-3",
                pinned && "border-indigo-400 bg-indigo-50 text-indigo-900",
              )}
              onClick={handleTogglePinned}
              aria-pressed={pinned}
            >
              <Pin className={cn("h-4 w-4", pinned && "fill-current")} aria-hidden />
              Pin this view
            </Button>
          </div>
        </header>

        {/* Filters */}
        <section
          aria-label="Filters and actions"
          className="mb-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex h-10 items-center gap-1 rounded-lg border border-border bg-white px-1 py-0.5 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setYear((y) => y - 1)}
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4rem] text-center text-sm font-medium tabular-nums">{year}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setYear((y) => y + 1)}
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <ToggleGroup
              type="single"
              value={quarter}
              onValueChange={(v) => v && setQuarter(v)}
              className="flex h-10 flex-wrap items-center justify-start gap-1 rounded-lg border border-border bg-white px-1.5 py-1 shadow-sm"
              aria-label="Quarter"
            >
              {(["all", "Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                <ToggleGroupItem
                  key={q}
                  value={q}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-[#3b5bfd] data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=on]:shadow-[#3b5bfd]/25",
                  )}
                >
                  {q === "all" ? "All" : q}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="h-10 w-[160px] rounded-lg border-border bg-white shadow-sm">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                {drivers
                  .filter((d) => d !== "all")
                  .map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-10 w-[180px] rounded-lg border-border bg-white shadow-sm">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments
                  .filter((d) => d !== "all")
                  .map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="flex h-10 items-center rounded-lg border border-border bg-white px-1.5 py-1 shadow-sm"
              aria-label="View mode"
            >
              <ToggleGroupItem
                value="list"
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-[#3b5bfd] data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=on]:shadow-[#3b5bfd]/25"
              >
                List
              </ToggleGroupItem>
              <ToggleGroupItem
                value="roadmap"
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-[#3b5bfd] data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=on]:shadow-[#3b5bfd]/25"
              >
                Roadmap
              </ToggleGroupItem>
              <ToggleGroupItem
                value="table"
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-[#3b5bfd] data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=on]:shadow-[#3b5bfd]/25"
              >
                Table
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              type="button"
              className={cn("h-10 rounded-lg shadow-sm", ACCENT.bg, "hover:bg-indigo-700")}
              onClick={openCreateMilestone}
            >
              + New milestone
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="h-10 rounded-lg border-dashed"
              onClick={handleUploadCsvClick}
            >
              {uploading ? "Uploading…" : "Upload CSV"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
          </div>
        </section>

        {/* Main content */}
        {viewMode === "list" && (
          <div className="grid min-h-[560px] gap-4 lg:grid-cols-12">
            {/* List */}
            <div className="lg:col-span-5 xl:col-span-4">
              <ScrollArea className="h-[min(70vh,640px)] pr-3">
                <ul className="space-y-3 pb-4" aria-label="Milestones">
                  {filtered.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-border bg-white/80 p-8 text-center text-sm text-muted-foreground">
                      No milestones match these filters.
                    </li>
                  ) : (
                    filtered.map((m) => (
                      <MilestoneListCard
                        key={m.id}
                        milestone={m}
                        selected={m.id === selectedId}
                        onSelect={() => setSelectedId(m.id)}
                      />
                    ))
                  )}
                </ul>
              </ScrollArea>
            </div>

            {/* Detail */}
            <div className="lg:col-span-7 xl:col-span-8">
              {selected ? (
                <article
                  tabIndex={0}
                  role="region"
                  aria-label={`${selected.title}, edit milestone`}
                  className={cn(
                    "rounded-2xl border border-border bg-white p-6 shadow-sm outline-none transition-shadow",
                    "ring-1 ring-black/[0.04]",
                    "cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/20 hover:shadow-md",
                    "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                  )}
                  onClick={(e) => {
                    const el = e.target as HTMLElement;
                    if (el.closest("[data-stop-edit]")) return;
                    openEditMilestone(selected);
                  }}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    openEditMilestone(selected);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className={cn("text-xs font-medium capitalize", ACCENT.muted)}>
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 align-middle" />{" "}
                      {selected.tier === "major" ? "Major" : "Minor"} · {selected.quarter} {selected.year}
                    </p>
                    {selected.externalUrl ? (
                      <a
                        href={selected.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm font-medium",
                          ACCENT.text,
                          "underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                        )}
                      >
                        Link here
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    ) : null}
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-tight">{selected.title}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {selected.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      {selected.driver}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      {selected.department}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3" data-stop-edit>
                    <Select
                      value={selected.status}
                      onValueChange={async (v) => {
                        const nextStatus = v as DemoMilestoneStatus;
                        try {
                          await updateMilestoneStatus(selected.id, nextStatus);
                          await queryClient.invalidateQueries({ queryKey: ["milestones"] });
                        } catch (e) {
                          console.error(e);
                          toast.error("Could not update status.");
                        }
                      }}
                    >
                      <SelectTrigger className="inline-flex h-8 w-auto items-center gap-1 rounded-full bg-transparent px-0 text-xs font-medium text-[#3b5bfd] shadow-none ring-0 border-0 focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Status">
                          <StatusBadge status={selected.status} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not started</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="at_risk">At risk</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="postponed">Postponed</SelectItem>
                        <SelectItem value="merged">Merged</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" aria-hidden />
                      {formatShortDate(selected.dueDate)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>

                  <section
                    className="mt-8 border-y border-border/60 py-6"
                    aria-labelledby="tasks-heading"
                    data-stop-edit
                  >
                    <h3
                      id="tasks-heading"
                      className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"
                    >
                      <ListChecks className="h-4 w-4 text-indigo-600" aria-hidden />
                      Tasks
                    </h3>
                    {selected.tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tasks yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {selected.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="font-medium text-foreground">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {task.dueDate?.trim() ? `Due ${task.dueLabel}` : "No due date"}
                              </p>
                            </div>
                            <ul className="mt-3 space-y-2" role="list">
                              {task.checklist.map((item) => {
                                const done = isItemDone(task.id, item.id, item.completed);
                                return (
                                  <li key={item.id}>
                                    <button
                                      type="button"
                                      className={cn(
                                        "flex w-full items-start gap-3 rounded-lg text-left text-sm transition-colors",
                                        "hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
                                        done && "text-muted-foreground",
                                      )}
                                      onClick={() => toggleChecklist(task.id, item.id, done)}
                                      aria-pressed={done}
                                    >
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                                        {done ? (
                                          <span
                                            className={cn(
                                              "flex h-5 w-5 items-center justify-center rounded-full",
                                              ACCENT.bg,
                                              "text-white",
                                            )}
                                          >
                                            <svg
                                              className="h-3 w-3"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                              strokeWidth={3}
                                              aria-hidden
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          </span>
                                        ) : (
                                          <Circle
                                            className="h-5 w-5 text-indigo-500"
                                            strokeWidth={1.75}
                                            aria-hidden
                                          />
                                        )}
                                      </span>
                                      <span className={cn(done && "line-through decoration-muted-foreground/60")}>
                                        {item.label}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Updates / blockers stream */}
                  <section
                    className="mt-8 space-y-4"
                    aria-label="Milestone updates and blockers"
                    data-stop-edit
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Updates &amp; blockers</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Progress updates, blockers, or when you need support — newest posts appear at the bottom.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {milestoneUpdates.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No updates yet. Share the latest status or anything that might be blocking you.
                        </p>
                      ) : (
                        milestoneUpdates
                          .slice()
                          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                          .map((u) => (
                            <div
                              key={u.id}
                              className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm"
                            >
                              <p className="text-[13px] leading-snug text-foreground">{u.message}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {u.author} · {formatUpdateTimestamp(u.createdAt)}
                              </p>
                            </div>
                          ))
                      )}
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-muted/50 px-4 py-3">
                      <textarea
                        rows={2}
                        value={newUpdateMessage}
                        onChange={(e) => setNewUpdateMessage(e.target.value)}
                        placeholder="Share progress updates, blockers, or support needed…"
                        className="min-h-[56px] w-full resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0"
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          className={cn(
                            "h-9 rounded-full px-4 text-xs font-medium text-white",
                            ACCENT.bg,
                            "hover:bg-indigo-700",
                          )}
                          disabled={!newUpdateMessage.trim()}
                          onClick={handleAddUpdate}
                        >
                          Post update
                        </Button>
                      </div>
                    </div>
                  </section>
                </article>
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center text-sm text-muted-foreground">
                  Select a milestone to see details.
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "roadmap" && (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/70 p-8 text-center text-sm text-muted-foreground">
            Roadmap view will visualise milestones on a timeline grouped by quarter.
          </div>
        )}

        {viewMode === "table" && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white p-4 text-sm">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-3 py-1.5">Milestone</th>
                  <th className="px-3 py-1.5">Quarter</th>
                  <th className="px-3 py-1.5">Status</th>
                  <th className="px-3 py-1.5">Driver</th>
                  <th className="px-3 py-1.5">Department</th>
                  <th className="px-3 py-1.5">Due date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-sm text-muted-foreground"
                    >
                      No milestones match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr
                      key={m.id}
                      className="cursor-pointer rounded-xl border border-transparent bg-muted/40 hover:border-indigo-200 hover:bg-indigo-50/60"
                      onClick={() => openEditMilestone(m)}
                    >
                      <td className="px-3 py-2.5 text-sm font-medium text-foreground">{m.title}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {m.quarter} {m.year}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{m.driver}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{m.department}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {formatShortDate(m.dueDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <MilestoneEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode={editMode}
          milestone={editMilestoneLive}
          filterYear={year}
          filterQuarter={quarter}
          onSave={handleSaveMilestone}
          onDelete={editMode === "edit" ? handleDeleteMilestone : undefined}
        />
      </main>
    </div>
  );
}

function MilestoneListCard({
  milestone: m,
  selected,
  onSelect,
}: {
  milestone: DemoMilestone;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="px-0.5 py-0.5">
      <button
        type="button"
        onClick={onSelect}
        aria-selected={selected}
        className={cn(
          "w-full rounded-2xl border p-4 text-left transition-all",
          "focus:outline-none",
          selected
            ? "border-[#3b5bfd] bg-[#eef0ff] shadow-[0_0_0_2px_rgba(59,91,253,0.55)]"
            : "border-border bg-white hover:border-[#d2d7ff] hover:bg-[#f5f6ff]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-foreground">{m.title}</h3>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60" aria-hidden />
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.listPreview}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {formatShortDate(m.dueDate)}
          </span>
          {m.status === "completed" && (
            <span className="inline-flex items-center text-emerald-600" title="Completed">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" aria-hidden />
            {m.driver}
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {m.department}
          </span>
        </div>
      </button>
    </li>
  );
}
