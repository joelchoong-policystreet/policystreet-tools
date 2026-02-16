import { Navigate, useParams } from "react-router-dom";
import { WORKFLOWS } from "@/components/ProjectPanel";

/**
 * Shown when on /workflows/:workflowId with no project selected.
 * Redirects to first project if the workflow has any; otherwise shows placeholder.
 */
export default function WorkflowDefault() {
  const { workflowId } = useParams<{ workflowId: string }>();
  if (!workflowId) return null;

  const workflow = WORKFLOWS[workflowId];
  if (!workflow) return null;

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
