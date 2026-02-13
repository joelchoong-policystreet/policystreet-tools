import { Link, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Branding */}
      <div className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold italic text-sidebar-foreground">
            PolicyStreet
          </span>
          <span className="rounded-md bg-gradient-to-r from-blue-400 to-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
            Tools
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        <Link
          to="/report"
          className={cn(
            "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
            isActive("/report")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <FileText className="h-4 w-4" />
          Report Generator
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-sidebar-foreground/60">v1.0</p>
      </div>
    </div>
  );
}
