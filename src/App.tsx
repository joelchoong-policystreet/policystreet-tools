import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/presentation/useAuth";
import { Sidebar } from "@/features/layout/presentation/Sidebar";
import { ProjectPanel } from "@/features/layout/presentation/ProjectPanel";
import { LoadingFallback } from "@/shared/components/LoadingFallback";

// Lazy-loaded routes
const HomePage = React.lazy(() => import("@/features/home/presentation/HomePage"));
const ReportPage = React.lazy(() => import("@/features/report/presentation/ReportPage"));
const LoginPage = React.lazy(() => import("@/features/auth/presentation/LoginPage"));
const WorkflowDefaultPage = React.lazy(() => import("@/features/workflows/presentation/WorkflowDefaultPage"));
const ProjectIMotorbikePage = React.lazy(() => import("@/features/workflows/imotorbike/presentation/ProjectIMotorbikePage"));
const AdminUsersPage = React.lazy(() => import("@/features/admin/users/presentation/AdminUsersPage"));
const AdminRolesPage = React.lazy(() => import("@/features/admin/roles/presentation/AdminRolesPage"));
const AdminAuditLogsPage = React.lazy(() => import("@/features/admin/audit-logs/presentation/AdminAuditLogsPage"));
const DatabasePage = React.lazy(() => import("@/features/database/presentation/DatabasePage"));
const ProfilePage = React.lazy(() => import("@/features/profile/presentation/ProfilePage"));
const NotFoundPage = React.lazy(() => import("@/features/not-found/presentation/NotFoundPage"));

const SIDEBAR_WIDTH = 110;
const PROJECT_PANEL_WIDTH = 220;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const location = useLocation();
  const showProjectPanel = location.pathname.startsWith("/workflows");
  const mainMarginLeft = showProjectPanel
    ? SIDEBAR_WIDTH + PROJECT_PANEL_WIDTH
    : SIDEBAR_WIDTH;

  return (
    <ProtectedRoute>
      <div className="flex">
        <Sidebar />
        {showProjectPanel && <ProjectPanel />}
        <div
          className="min-h-screen flex-1 transition-[margin] duration-200"
          style={{ marginLeft: mainMarginLeft, width: `calc(100% - ${mainMarginLeft}px)` }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/workflows/imotorbike" element={<Navigate to="/workflows/affiliates/imotorbike" replace />} />
              <Route path="/workflows/imotorbike/:projectId" element={<Navigate to="/workflows/affiliates/imotorbike" replace />} />
              <Route path="/workflows/:workflowId" element={<WorkflowDefaultPage />} />
              <Route path="/workflows/:workflowId/:projectId" element={<ProjectIMotorbikePage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/roles" element={<AdminRolesPage />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </ProtectedRoute>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (user) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginPage />
    </Suspense>
  );
}

export default App;
