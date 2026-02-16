import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/presentation/useAuth";
import { Sidebar } from "@/features/layout/presentation/Sidebar";
import { ProjectPanel } from "@/features/layout/presentation/ProjectPanel";
import HomePage from "@/features/home/presentation/HomePage";
import ReportPage from "@/features/report/presentation/ReportPage";
import LoginPage from "@/features/auth/presentation/LoginPage";
import WorkflowDefaultPage from "@/features/workflows/presentation/WorkflowDefaultPage";
import ProjectIMotorbikePage from "@/features/workflows/imotorbike/presentation/ProjectIMotorbikePage";
import AdminUsersPage from "@/features/admin/users/presentation/AdminUsersPage";
import AdminRolesPage from "@/features/admin/roles/presentation/AdminRolesPage";
import AdminAuditLogsPage from "@/features/admin/audit-logs/presentation/AdminAuditLogsPage";
import ProfilePage from "@/features/profile/presentation/ProfilePage";
import NotFoundPage from "@/features/not-found/presentation/NotFoundPage";

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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/report" element={<ReportPage />} />
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
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default App;
