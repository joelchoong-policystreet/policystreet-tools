import { useCallback, useMemo, useRef, useState, type UIEvent } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type {
  Milestone,
  MilestoneChecklistItem,
  MilestoneStatus,
  MilestoneTask,
} from "./milestoneTypes";

const LABEL_W = 220;
const DAY_MIN_PX = 10;
/** Height of the top horizontal scrollbar strip; left column uses the same for row alignment. */
const TIMELINE_SCROLLBAR_STRIP_H = "h-5";

function quarterStart(year: number, quarter: Milestone["quarter"]): Date {
  const month = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[quarter];
  return startOfDay(new Date(year, month, 1));
}

function quarterEndDate(year: number, quarter: Milestone["quarter"]): Date {
  const lastMonth = { Q1: 2, Q2: 5, Q3: 8, Q4: 11 }[quarter];
  return startOfDay(new Date(year, lastMonth + 1, 0));
}

function parseDue(iso: string | undefined): Date | null {
  if (!iso?.trim()) return null;
  try {
    return startOfDay(parseISO(iso));
  } catch {
    return null;
  }
}

function statusStyles(status: MilestoneStatus): { border: string; fill: string } {
  switch (status) {
    case "completed":
      return { border: "border-emerald-600", fill: "bg-emerald-500" };
    case "in_progress":
      return { border: "border-indigo-600", fill: "bg-indigo-500" };
    case "at_risk":
    case "dropped":
      return { border: "border-amber-600", fill: "bg-amber-500" };
    case "postponed":
    case "merged":
      return { border: "border-slate-500", fill: "bg-slate-400" };
    case "not_started":
    default:
      return { border: "border-violet-600", fill: "bg-violet-500" };
  }
}

/** Filled portion: through completion date if set, else through today, capped at due (full fill if completed with no date). */
function milestoneFillEnd(
  start: Date,
  dueEnd: Date,
  m: Milestone,
  today: Date,
): Date {
  const startD = startOfDay(start);
  const dueD = startOfDay(dueEnd);
  const t = startOfDay(today);
  if (m.completedAt?.trim()) {
    try {
      const c = startOfDay(parseISO(m.completedAt));
      return minDate([maxDate([c, startD]), dueD]);
    } catch {
      /* fall through */
    }
  }
  if (m.status === "completed") {
    return dueD;
  }
  return minDate([maxDate([t, startD]), dueD]);
}

function taskFillEnd(start: Date, dueEnd: Date, task: MilestoneTask, today: Date): Date {
  const startD = startOfDay(start);
  const dueD = startOfDay(dueEnd);
  const t = startOfDay(today);
  if (task.completedAt?.trim()) {
    try {
      const c = startOfDay(parseISO(task.completedAt));
      return minDate([maxDate([c, startD]), dueD]);
    } catch {
      /* fall through */
    }
  }
  return minDate([maxDate([t, startD]), dueD]);
}

function GanttSegmentBar({
  domainStart,
  totalDays,
  rangeStart,
  dueEnd,
  fillEnd,
  borderClass,
  fillClass,
  onClick,
  label,
  title: barTitle,
  compact,
}: {
  domainStart: Date;
  totalDays: number;
  rangeStart: Date;
  dueEnd: Date;
  fillEnd: Date;
  borderClass: string;
  fillClass: string;
  onClick: () => void;
  label: string;
  title: string;
  compact?: boolean;
}) {
  const leftPct = (differenceInCalendarDays(rangeStart, domainStart) / totalDays) * 100;
  const dueWidthPct = (differenceInCalendarDays(dueEnd, rangeStart) + 1) / totalDays * 100;
  const rawFillPct = (differenceInCalendarDays(fillEnd, rangeStart) + 1) / totalDays * 100;
  const fillWidthPct = Math.min(dueWidthPct, Math.max(0, rawFillPct));

  return (
    <div className={cn("relative w-full", compact ? "h-7" : "h-8")}>
      <div
        className={cn(
          "pointer-events-none absolute rounded-full border-2 bg-transparent",
          compact ? "top-0.5 h-6" : "top-1 h-7",
          borderClass,
        )}
        style={{ left: `${leftPct}%`, width: `${Math.max(dueWidthPct, 0.2)}%` }}
        aria-hidden
      />
      {fillWidthPct > 0 && (
        <div
          className={cn(
            "pointer-events-none absolute rounded-full",
            compact ? "top-0.5 h-6" : "top-1 h-7",
            fillClass,
          )}
          style={{
            left: `${leftPct}%`,
            width: `${fillWidthPct > 0 ? Math.max(fillWidthPct, 0.12) : 0}%`,
          }}
          aria-hidden
        />
      )}
      <button
        type="button"
        className={cn(
          "absolute z-10 flex cursor-pointer items-center overflow-hidden rounded-full px-2 text-left font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
          compact ? "top-0.5 h-6 text-[10px]" : "top-1 h-7 text-[11px]",
        )}
        style={{ left: `${leftPct}%`, width: `${Math.max(dueWidthPct, 0.2)}%` }}
        onClick={onClick}
        title={barTitle}
      >
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}

export type MilestoneBar = {
  milestone: Milestone;
  start: Date;
  end: Date;
};

type RoadmapRow =
  | { kind: "milestone"; key: string; milestone: Milestone; start: Date; end: Date }
  | {
      kind: "task";
      key: string;
      milestone: Milestone;
      task: MilestoneTask;
      ts: Date;
      te: Date;
    }
  | {
      kind: "checklist";
      key: string;
      milestone: Milestone;
      task: MilestoneTask;
      item: MilestoneChecklistItem;
      done: boolean;
    };

function computeBars(milestones: Milestone[]): MilestoneBar[] {
  return milestones.map((m) => {
    const start = quarterStart(m.year, m.quarter);
    let end = parseDue(m.dueDate) ?? quarterEndDate(m.year, m.quarter);
    if (end < start) {
      end = addDays(start, 1);
    }
    return { milestone: m, start, end };
  });
}

function taskBarRange(m: Milestone, task: MilestoneTask): { start: Date; end: Date } {
  const start = quarterStart(m.year, m.quarter);
  let end =
    parseDue(task.dueDate) ?? parseDue(m.dueDate) ?? quarterEndDate(m.year, m.quarter);
  if (end < start) {
    end = addDays(start, 1);
  }
  return { start, end };
}

type Props = {
  milestones: Milestone[];
  onMilestoneClick: (m: Milestone) => void;
  filterTaskChecklistForView: (task: MilestoneTask) => MilestoneChecklistItem[];
  isItemDone: (taskId: string, itemId: string, defaultCompleted: boolean) => boolean;
  onToggleChecklistItem: (taskId: string, itemId: string, completed: boolean) => void;
};

export function MilestoneRoadmapGantt({
  milestones,
  onMilestoneClick,
  filterTaskChecklistForView,
  isItemDone,
  onToggleChecklistItem,
}: Props) {
  const [collapsedMilestoneIds, setCollapsedMilestoneIds] = useState<Set<string>>(() => new Set());
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(() => new Set());

  const toggleMilestoneCollapsed = useCallback((milestoneId: string) => {
    setCollapsedMilestoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) next.delete(milestoneId);
      else next.add(milestoneId);
      return next;
    });
  }, []);

  const toggleTaskCollapsed = useCallback((taskId: string) => {
    setCollapsedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const expandAllMilestoneTasks = useCallback(() => {
    setCollapsedMilestoneIds(new Set());
  }, []);

  const collapseAllMilestoneTasks = useCallback(() => {
    const next = new Set<string>();
    for (const m of milestones) {
      if (m.tasks.length > 0) next.add(m.id);
    }
    setCollapsedMilestoneIds(next);
  }, [milestones]);

  const expandAllChecklists = useCallback(() => {
    setCollapsedTaskIds(new Set());
  }, []);

  const timelineTopScrollRef = useRef<HTMLDivElement>(null);
  const timelineDateScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const syncTimelineScrollLeft = useCallback((source: HTMLDivElement) => {
    const x = source.scrollLeft;
    for (const r of [timelineTopScrollRef, timelineDateScrollRef, timelineScrollRef] as const) {
      const el = r.current;
      if (el && el !== source && el.scrollLeft !== x) {
        el.scrollLeft = x;
      }
    }
  }, []);

  const onTimelineScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      syncTimelineScrollLeft(e.currentTarget);
    },
    [syncTimelineScrollLeft],
  );

  const collapseAllChecklists = useCallback(() => {
    const next = new Set<string>();
    for (const m of milestones) {
      for (const t of m.tasks) {
        if (filterTaskChecklistForView(t).length > 0) next.add(t.id);
      }
    }
    setCollapsedTaskIds(next);
  }, [milestones, filterTaskChecklistForView]);

  const bars = useMemo(() => computeBars(milestones), [milestones]);

  const { domainStart, domainEnd, totalDays, today, weekTicks } = useMemo(() => {
    const now = startOfDay(new Date());
    if (bars.length === 0) {
      const s = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const e = addDays(s, 90);
      return {
        domainStart: s,
        domainEnd: e,
        totalDays: differenceInCalendarDays(e, s) + 1,
        today: now,
        weekTicks: buildWeekTicks(s, e),
      };
    }
    const starts = bars.map((b) => b.start);
    const ends = bars.map((b) => b.end);
    let domainStart = minDate(starts);
    let domainEnd = maxDate([...ends, now]);
    domainStart = startOfWeek(domainStart, { weekStartsOn: 1 });
    domainEnd = addDays(maxDate([domainEnd, now]), 7);
    const padStart = addDays(domainStart, -3);
    const padEnd = addDays(domainEnd, 7);
    const totalDays = differenceInCalendarDays(padEnd, padStart) + 1;
    return {
      domainStart: padStart,
      domainEnd: padEnd,
      totalDays,
      today: now,
      weekTicks: buildWeekTicks(padStart, padEnd),
    };
  }, [bars]);

  /** Wider minimum when many days (e.g. quarter = All) so the track stays scrollable and readable. */
  const dayMinPx = totalDays > 120 ? Math.max(6, DAY_MIN_PX - 2) : DAY_MIN_PX;
  const chartWidthPx = Math.max(640, totalDays * dayMinPx);
  const trackWidthPx = chartWidthPx - LABEL_W;

  const pctFromDate = (d: Date) =>
    (differenceInCalendarDays(d, domainStart) / totalDays) * 100;

  /** X position of “today” from the left edge of the scrollable timeline track. */
  const todayLineLeftPx = (() => {
    if (today < domainStart || today > domainEnd) return null;
    return (trackWidthPx * pctFromDate(today)) / 100;
  })();

  const roadmapRows = useMemo((): RoadmapRow[] => {
    const out: RoadmapRow[] = [];
    for (const { milestone: m, start, end } of bars) {
      out.push({ kind: "milestone", key: m.id, milestone: m, start, end });
      if (collapsedMilestoneIds.has(m.id)) continue;
      for (const task of m.tasks) {
        const { start: ts, end: te } = taskBarRange(m, task);
        out.push({ kind: "task", key: task.id, milestone: m, task, ts, te });
        if (collapsedTaskIds.has(task.id)) continue;
        const checklistItems = filterTaskChecklistForView(task);
        for (const item of checklistItems) {
          out.push({
            kind: "checklist",
            key: `${task.id}-${item.id}`,
            milestone: m,
            task,
            item,
            done: isItemDone(task.id, item.id, item.completed),
          });
        }
      }
    }
    return out;
  }, [
    bars,
    collapsedMilestoneIds,
    collapsedTaskIds,
    filterTaskChecklistForView,
    isItemDone,
  ]);

  const hasAnyTasks = milestones.some((m) => m.tasks.length > 0);
  const hasAnyChecklists = useMemo(
    () =>
      milestones.some((m) =>
        m.tasks.some((t) => filterTaskChecklistForView(t).length > 0),
      ),
    [milestones, filterTaskChecklistForView],
  );

  if (milestones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white/80 p-10 text-center text-sm text-muted-foreground">
        No milestones match the current filters. Adjust filters or add a milestone.
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Roadmap</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The timeline and bars scroll horizontally on the right; milestone, task, and checklist
              names stay in the left column.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasAnyTasks ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={expandAllMilestoneTasks}
                >
                  Open all tasks
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={collapseAllMilestoneTasks}
                >
                  Close all tasks
                </Button>
              </>
            ) : null}
            {hasAnyChecklists ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={expandAllChecklists}
                >
                  Open all checklists
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={collapseAllChecklists}
                >
                  Close all checklists
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 w-full flex-col">
        <div className="sticky top-0 z-30 flex min-w-0 w-full bg-white shadow-[0_1px_0_0_hsl(var(--border))]">
          <div
            className="flex shrink-0 flex-col border-r border-border bg-white"
            style={{ width: LABEL_W }}
          >
            <div
              className={cn(
                "shrink-0 border-b border-border bg-muted/20",
                TIMELINE_SCROLLBAR_STRIP_H,
              )}
              aria-hidden
            />
            <div className="flex h-9 shrink-0 items-center border-b border-border bg-muted/20 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Milestone / task
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={timelineTopScrollRef}
              className={cn(
                "min-w-0 shrink-0 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x border-b border-border bg-muted/20",
                TIMELINE_SCROLLBAR_STRIP_H,
              )}
              onScroll={onTimelineScroll}
              aria-hidden
            >
              <div style={{ width: trackWidthPx, height: 1 }} className="pointer-events-none" />
            </div>
            <div
              ref={timelineDateScrollRef}
              className="min-w-0 shrink-0 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x border-b border-border bg-muted/20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={onTimelineScroll}
            >
              <div
                className="relative h-9 shrink-0 py-2 pr-2"
                style={{ width: trackWidthPx }}
              >
                {weekTicks.map((t) => (
                  <div
                    key={t.getTime()}
                    className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground"
                    style={{ left: `${pctFromDate(t)}%` }}
                  >
                    {format(t, "MMM d")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 w-full">
        <div
          className="flex shrink-0 flex-col border-r border-border bg-white"
          style={{ width: LABEL_W }}
        >
          {roadmapRows.map((row) => {
            if (row.kind === "milestone") {
              const m = row.milestone;
              const milestoneCollapsed = collapsedMilestoneIds.has(m.id);
              const hasTasks = m.tasks.length > 0;
              return (
                <div
                  key={row.key}
                  className="border-b border-border/60 bg-white px-2 py-2"
                >
                  <div className="flex items-start gap-1">
                    {hasTasks ? (
                      <button
                        type="button"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMilestoneCollapsed(m.id);
                        }}
                        aria-expanded={!milestoneCollapsed}
                        aria-label={milestoneCollapsed ? "Expand tasks" : "Collapse tasks"}
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            !milestoneCollapsed && "rotate-90",
                          )}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <span className="inline-block w-5 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="w-full text-left text-xs font-semibold leading-snug text-foreground hover:underline"
                        onClick={() => onMilestoneClick(m)}
                      >
                        {m.title}
                      </button>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {m.quarter} {m.year} · {formatShortMeta(m.dueDate)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            if (row.kind === "task") {
              const m = row.milestone;
              const { task } = row;
              const checklistItems = filterTaskChecklistForView(task);
              const checklistCollapsed = collapsedTaskIds.has(task.id);
              const hasChecklist = checklistItems.length > 0;
              return (
                <div
                  key={row.key}
                  className="border-b border-border/40 bg-muted/5 px-2 py-1.5 pl-4"
                >
                  <div className="flex items-start gap-1">
                    {hasChecklist ? (
                      <button
                        type="button"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCollapsed(task.id);
                        }}
                        aria-expanded={!checklistCollapsed}
                        aria-label={
                          checklistCollapsed ? "Expand checklist" : "Collapse checklist"
                        }
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            !checklistCollapsed && "rotate-90",
                          )}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <span className="inline-block w-5 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="w-full text-left text-[11px] font-medium leading-snug text-foreground hover:underline"
                        onClick={() => onMilestoneClick(m)}
                      >
                        {task.title}
                      </button>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {task.owner.trim() ? `${task.owner} · ` : ""}
                                  {task.dueDate?.trim()
                                    ? `Due ${format(parseISO(task.dueDate), "d MMM yyyy")}`
                                    : "No due date"}
                                </p>
                    </div>
                  </div>
                </div>
              );
            }
            const { task, item, done } = row;
            return (
              <div
                key={row.key}
                className="border-b border-border/30 bg-white py-1.5 pl-10 pr-2"
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-2 text-left text-[11px] leading-snug text-foreground hover:bg-muted/40"
                  onClick={() => onToggleChecklistItem(task.id, item.id, done)}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {done ? (
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white",
                        )}
                      >
                        <svg
                          className="h-2.5 w-2.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    ) : (
                      <Circle
                        className="h-4 w-4 text-indigo-500"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      done &&
                        "text-muted-foreground line-through decoration-muted-foreground/60",
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={timelineScrollRef}
            className="min-h-0 min-w-0 flex-1 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="region"
            aria-label="Timeline — scroll horizontally; names stay in the left column"
            onScroll={onTimelineScroll}
          >
          <div
            className="relative flex min-w-0 flex-col bg-muted/5"
            style={{ width: trackWidthPx }}
          >
            {todayLineLeftPx != null && (
              <div
                className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-px bg-red-500/90"
                style={{ left: todayLineLeftPx }}
                aria-hidden
              />
            )}
            {todayLineLeftPx != null && (
              <span
                className="pointer-events-none absolute left-0 top-2 z-[15] rounded bg-red-500 px-1 py-0.5 text-[9px] font-medium text-white"
                style={{ left: todayLineLeftPx, transform: "translateX(-50%)" }}
              >
                Today
              </span>
            )}

            {roadmapRows.map((row) => {
              if (row.kind === "milestone") {
                const m = row.milestone;
                const fillEnd = milestoneFillEnd(row.start, row.end, m, today);
                const st = statusStyles(m.status);
                return (
                  <div
                    key={row.key}
                    className="relative z-[1] border-b border-border/60 bg-white py-2 pr-2"
                  >
                    <GanttSegmentBar
                      domainStart={domainStart}
                      totalDays={totalDays}
                      rangeStart={row.start}
                      dueEnd={row.end}
                      fillEnd={fillEnd}
                      borderClass={st.border}
                      fillClass={st.fill}
                      onClick={() => onMilestoneClick(m)}
                      label={m.title}
                      title={`${m.title} · Plan: ${format(row.start, "d MMM yyyy")}–${format(row.end, "d MMM yyyy")} · Fill to ${format(fillEnd, "d MMM yyyy")}`}
                    />
                  </div>
                );
              }
              if (row.kind === "task") {
                const m = row.milestone;
                const taskFill = taskFillEnd(row.ts, row.te, row.task, today);
                const st = statusStyles(m.status);
                return (
                  <div
                    key={row.key}
                    className="relative z-[1] border-b border-border/40 bg-muted/5 py-1.5 pr-2"
                  >
                    <GanttSegmentBar
                      domainStart={domainStart}
                      totalDays={totalDays}
                      rangeStart={row.ts}
                      dueEnd={row.te}
                      fillEnd={taskFill}
                      borderClass={st.border}
                      fillClass={st.fill}
                      onClick={() => onMilestoneClick(m)}
                      label={row.task.title}
                      title={`${row.task.title} · Plan: ${format(row.ts, "d MMM yyyy")}–${format(row.te, "d MMM yyyy")} · Fill to ${format(taskFill, "d MMM yyyy")}`}
                      compact
                    />
                  </div>
                );
              }
              return (
                <div
                  key={row.key}
                  className="relative z-[1] border-b border-border/30 bg-muted/5 py-1.5 pr-2"
                />
              );
            })}
          </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function formatShortMeta(iso: string) {
  if (!iso?.trim()) return "No due date";
  try {
    return `Due ${format(parseISO(iso), "d MMM yyyy")}`;
  } catch {
    return "Due —";
  }
}

function buildWeekTicks(from: Date, to: Date): Date[] {
  const ticks: Date[] = [];
  let cur = startOfWeek(from, { weekStartsOn: 1 });
  const end = to;
  while (cur <= end) {
    ticks.push(cur);
    cur = addDays(cur, 7);
    if (ticks.length > 52) break;
  }
  if (ticks.length === 0) ticks.push(from);
  return ticks;
}
