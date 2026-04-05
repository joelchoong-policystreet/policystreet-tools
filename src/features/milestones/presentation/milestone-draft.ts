import { format, parseISO } from "date-fns";

import type {
  Milestone,
  MilestoneChecklistItem,
  MilestoneStatus,
  MilestoneTask,
} from "./milestoneTypes";

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export type DraftChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  completedOn?: string;
};

export type DraftTask = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  checklist: DraftChecklistItem[];
};

export type MilestoneDraft = {
  title: string;
  description: string;
  status: MilestoneStatus;
  tier: "major" | "minor";
  dueDate: string;
  year: number;
  /** Empty until user picks (new milestones); saved as Q1 if still unset */
  quarter: Quarter | "";
  driver: string;
  department: string;
  tags: string;
  externalUrl: string;
  tasks: DraftTask[];
};

export function newId() {
  return crypto.randomUUID();
}

function taskDueLabel(iso: string) {
  if (!iso?.trim()) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function milestoneToDraft(m: Milestone): MilestoneDraft {
  return {
    title: m.title,
    description: m.description,
    status: m.status,
    tier: m.tier,
    dueDate: m.dueDate,
    year: m.year,
    quarter: m.quarter,
    driver: m.driver,
    department: m.department,
    tags: m.tags.join(", "),
    externalUrl: m.externalUrl ?? "",
    tasks: m.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      owner: t.owner,
      dueDate: t.dueDate,
      checklist: t.checklist.map((c) => ({
        id: c.id,
        label: c.label,
        completed: c.completed,
        completedOn: c.completedOn,
      })),
    })),
  };
}

function draftChecklistToMilestone(items: DraftChecklistItem[]): MilestoneChecklistItem[] {
  return items.map((c) => ({
    id: c.id,
    label: c.label,
    completed: c.completed,
    completedOn: c.completedOn,
  }));
}

function draftTasksToMilestone(tasks: DraftTask[]): MilestoneTask[] {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    owner: t.owner.trim(),
    dueDate: t.dueDate,
    dueLabel: taskDueLabel(t.dueDate),
    checklist: draftChecklistToMilestone(t.checklist),
  }));
}

export function draftToMilestone(d: MilestoneDraft, id: string): Milestone {
  const desc = d.description.trim();
  const preview =
    desc.length <= 140 ? desc || "No description" : `${desc.slice(0, 137)}…`;
  return {
    id,
    title: d.title.trim() || "Untitled milestone",
    description: desc,
    listPreview: preview,
    tier: d.tier,
    quarter: (d.quarter || "Q1") as Milestone["quarter"],
    year: d.year,
    status: d.status,
    dueDate: d.dueDate,
    driver: d.driver.trim() || "—",
    department: d.department.trim() || "—",
    tags: d.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    externalUrl: d.externalUrl.trim() || undefined,
    tasks: draftTasksToMilestone(d.tasks),
  };
}

export function emptyDraft(year: number, quarterFilter: string): MilestoneDraft {
  const quarter: Quarter | "" =
    quarterFilter !== "all" && ["Q1", "Q2", "Q3", "Q4"].includes(quarterFilter)
      ? (quarterFilter as Quarter)
      : "";
  return {
    title: "",
    description: "",
    status: "not_started",
    tier: "major",
    dueDate: "",
    year,
    quarter,
    driver: "",
    department: "",
    tags: "",
    externalUrl: "",
    tasks: [],
  };
}
