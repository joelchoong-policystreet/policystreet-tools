import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bike, Car, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Parse workflow and project from pathname so panel works outside Route element. */
function useWorkflowParams() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/workflows\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return { workflowId: null, projectId: null };
  return { workflowId: match[1], projectId: match[2] ?? null };
}

export type WorkflowProject = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type WorkflowConfig = {
  label: string;
  projects: WorkflowProject[];
};

export const WORKFLOWS: Record<string, WorkflowConfig> = {
  affiliates: {
    label: "Affiliates",
    projects: [
      { id: "imotorbike", label: "iMotorbike", icon: Bike },
      { id: "carsome", label: "Carsome", icon: Car },
    ],
  },
};

export function ProjectPanel() {
  const { workflowId, projectId } = useWorkflowParams();
  const [optimisticProjectId, setOptimisticProjectId] = useState<string | null>(null);

  // Sync optimistic state when URL catches up; clear when workflow changes
  useEffect(() => {
    if (projectId) setOptimisticProjectId(null);
  }, [projectId]);
  useEffect(() => {
    setOptimisticProjectId(null);
  }, [workflowId]);

  const displayProjectId = optimisticProjectId ?? projectId;

  if (!workflowId) return null;

  const workflow = WORKFLOWS[workflowId];
  if (!workflow) return null;

  const { label: workflowLabel, projects } = workflow;
  const hasProjects = projects.length > 0;

  return (
    <div className="fixed left-[110px] top-0 h-screen w-[220px] border-r border-border bg-muted flex flex-col z-40 shadow-sm">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        <button
          type="button"
          className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{workflowLabel.toUpperCase()}</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {hasProjects ? (
          projects.map((project) => {
            const isSelected = displayProjectId === project.id;
            const Icon = project.icon;
            const path = `/workflows/${workflowId}/${project.id}`;
            return (
              <Link
                key={project.id}
                to={path}
                onClick={() => setOptimisticProjectId(project.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium border-l-2 border-transparent",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected
                    ? "bg-primary/10 text-foreground border-primary font-semibold"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{project.label}</span>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground px-3 py-2">Coming soon</p>
        )}
      </nav>
    </div>
  );
}
