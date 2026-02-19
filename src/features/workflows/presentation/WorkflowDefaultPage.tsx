import { Navigate, useParams } from "react-router-dom";
import { WORKFLOWS } from "@/features/layout/presentation/ProjectPanel";

/**
 * Shown when on /workflows/:workflowId with no project selected.
 * Redirects to first project if the workflow has any; otherwise shows placeholder.
 */
export default function WorkflowDefaultPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const workflow = workflowId ? WORKFLOWS[workflowId] : undefined;

  if (!workflowId || !workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Workflow not found.</p>
      </div>
    );
  }

  if (workflow.projects.length > 0) {
    return (
      <Navigate to={`/workflows/${workflowId}/${workflow.projects[0].id}`} replace />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">No projects in this workflow yet.</p>
    </div>
  );
}
