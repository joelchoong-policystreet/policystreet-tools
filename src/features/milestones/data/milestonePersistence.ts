import { supabase } from "@/data/supabase/client";

import type { Milestone, MilestoneStatus } from "../presentation/milestoneTypes";

function dueOrNull(iso: string): string | null {
  const t = iso?.trim();
  return t ? t : null;
}

async function existingTaskIdsForMilestone(milestoneId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("milestone_tasks")
    .select("id")
    .eq("milestone_id", milestoneId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.id));
}

async function existingChecklistIdsForTask(taskId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("milestone_task_checklist_items")
    .select("id")
    .eq("task_id", taskId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.id));
}

function milestoneRowBase(m: Milestone) {
  const completed_at = m.status === "completed" ? new Date().toISOString() : null;
  return {
    title: m.title,
    description: m.description,
    status: m.status,
    tier: m.tier,
    year: m.year,
    quarter: m.quarter,
    due_date: dueOrNull(m.dueDate),
    tags: m.tags ?? [],
    driver: m.driver,
    department: m.department,
    link: m.externalUrl?.trim() || null,
    completed_at,
  };
}

export async function persistMilestone(
  m: Milestone,
  mode: "create" | "edit",
  userId: string,
  boardId: string,
): Promise<void> {
  const base = milestoneRowBase(m);

  if (mode === "create") {
    const { error } = await supabase.from("milestones").insert({
      id: m.id,
      user_id: userId,
      board_id: boardId,
      ...base,
    });
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("milestones")
      .update(base)
      .eq("id", m.id)
      .eq("board_id", boardId)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      throw new Error(
        "No milestone row was updated. It may not exist, or create was mistaken for edit.",
      );
    }
  }

  const draftTaskIds = new Set(m.tasks.map((t) => t.id));
  const existingTasks = await existingTaskIdsForMilestone(m.id);
  const tasksToRemove = [...existingTasks].filter((id) => !draftTaskIds.has(id));

  if (tasksToRemove.length > 0) {
    const { error: delCh } = await supabase
      .from("milestone_task_checklist_items")
      .delete()
      .in("task_id", tasksToRemove);
    if (delCh) throw delCh;
    const { error: delT } = await supabase.from("milestone_tasks").delete().in("id", tasksToRemove);
    if (delT) throw delT;
  }

  for (const task of m.tasks) {
    const title = task.title.trim() || "Untitled task";
    const due_date = dueOrNull(task.dueDate);
    if (existingTasks.has(task.id)) {
      const { error } = await supabase
        .from("milestone_tasks")
        .update({ title, due_date })
        .eq("id", task.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("milestone_tasks").insert({
        id: task.id,
        milestone_id: m.id,
        title,
        due_date,
      });
      if (error) throw error;
    }

    const itemIds = new Set(task.checklist.map((c) => c.id));
    const existingItems = await existingChecklistIdsForTask(task.id);
    const itemsToRemove = [...existingItems].filter((id) => !itemIds.has(id));
    if (itemsToRemove.length > 0) {
      const { error } = await supabase
        .from("milestone_task_checklist_items")
        .delete()
        .in("id", itemsToRemove);
      if (error) throw error;
    }

    for (const item of task.checklist) {
      const completed_at = item.completed ? (item.completedOn ?? new Date().toISOString()) : null;
      if (existingItems.has(item.id)) {
        const { error } = await supabase
          .from("milestone_task_checklist_items")
          .update({
            label: item.label,
            completed: item.completed,
            completed_at,
          })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("milestone_task_checklist_items").insert({
          id: item.id,
          task_id: task.id,
          label: item.label,
          completed: item.completed,
          completed_at,
        });
        if (error) throw error;
      }
    }
  }
}

export async function deleteMilestoneById(milestoneId: string): Promise<void> {
  const { data: tasks, error: tErr } = await supabase
    .from("milestone_tasks")
    .select("id")
    .eq("milestone_id", milestoneId);
  if (tErr) throw tErr;
  const taskIds = (tasks ?? []).map((t) => t.id);

  if (taskIds.length > 0) {
    const { error: cErr } = await supabase
      .from("milestone_task_checklist_items")
      .delete()
      .in("task_id", taskIds);
    if (cErr) throw cErr;
  }

  const { error: mtErr } = await supabase.from("milestone_tasks").delete().eq("milestone_id", milestoneId);
  if (mtErr) throw mtErr;

  const { error: uErr } = await supabase.from("milestone_updates").delete().eq("milestone_id", milestoneId);
  if (uErr) throw uErr;

  const { error: mErr } = await supabase.from("milestones").delete().eq("id", milestoneId);
  if (mErr) throw mErr;
}

export async function updateMilestoneStatus(
  id: string,
  status: MilestoneStatus,
): Promise<void> {
  const completed_at = status === "completed" ? new Date().toISOString() : null;
  const { error } = await supabase.from("milestones").update({ status, completed_at }).eq("id", id);
  if (error) throw error;
}

export async function setChecklistItemCompleted(itemId: string, completed: boolean): Promise<void> {
  const completed_at = completed ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("milestone_task_checklist_items")
    .update({ completed, completed_at })
    .eq("id", itemId);
  if (error) throw error;
}

export async function insertChecklistItem(taskId: string, label: string): Promise<string> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required");
  const id = crypto.randomUUID();
  const { error } = await supabase.from("milestone_task_checklist_items").insert({
    id,
    task_id: taskId,
    label: trimmed,
    completed: false,
    completed_at: null,
  });
  if (error) throw error;
  return id;
}

export type MilestoneUpdateRow = {
  id: string;
  milestoneId: string;
  message: string;
  author: string;
  createdAt: string;
};

export async function fetchMilestoneUpdates(milestoneId: string): Promise<MilestoneUpdateRow[]> {
  const { data, error } = await supabase
    .from("milestone_updates")
    .select("id,milestone_id,message,author_name,created_at")
    .eq("milestone_id", milestoneId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    milestoneId: r.milestone_id,
    message: r.message,
    author: r.author_name,
    createdAt: r.created_at,
  }));
}

export async function insertMilestoneUpdate(params: {
  milestoneId: string;
  message: string;
  authorName: string;
}): Promise<void> {
  const { error } = await supabase.from("milestone_updates").insert({
    id: crypto.randomUUID(),
    milestone_id: params.milestoneId,
    message: params.message,
    author_name: params.authorName,
  });
  if (error) throw error;
}
