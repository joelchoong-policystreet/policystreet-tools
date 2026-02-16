import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";
import { ProjectPanel } from "@/components/ProjectPanel";
import Home from "./pages/Home";
import Report from "./pages/Report";
import Login from "./pages/Login";
import WorkflowDefault from "./pages/WorkflowDefault";
import ProjectIMotorbike from "./pages/ProjectIMotorbike";
import AdminUsers from "./pages/AdminUsers";
import AdminRoles from "./pages/AdminRoles";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<Report />} />
            <Route path="/workflows/imotorbike" element={<Navigate to="/workflows/affiliates/imotorbike" replace />} />
            <Route path="/workflows/imotorbike/:projectId" element={<Navigate to="/workflows/affiliates/imotorbike" replace />} />
            <Route path="/workflows/:workflowId" element={<WorkflowDefault />} />
            <Route path="/workflows/:workflowId/:projectId" element={<ProjectIMotorbike />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
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
  return <Login />;
}

export default App;
