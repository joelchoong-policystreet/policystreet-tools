import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ProjectPanel } from "@/components/ProjectPanel";
import Home from "./pages/Home";
import Report from "./pages/Report";
import WorkflowDefault from "./pages/WorkflowDefault";
import ProjectIMotorbike from "./pages/ProjectIMotorbike";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

const SIDEBAR_WIDTH = 110;
const PROJECT_PANEL_WIDTH = 220;

function AppLayout() {
  const location = useLocation();
  const showProjectPanel = location.pathname.startsWith("/workflows");
  const mainMarginLeft = showProjectPanel
    ? SIDEBAR_WIDTH + PROJECT_PANEL_WIDTH
    : SIDEBAR_WIDTH;

  return (
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
