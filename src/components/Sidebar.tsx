import { Link, useLocation } from "react-router-dom";
import {
  FileText,
  Database,
  Users,
  ClipboardList,
  Bike,
  UserCircle,
  Shield,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  indent?: boolean;
}

function NavItem({ to, icon: Icon, label, isActive, indent }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-medium transition-colors",
        indent && "scale-90",
        isActive
          ? "bg-sidebar-ring/80 text-white"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-center leading-tight">{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
      {children}
    </p>
  );
}

export function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 h-screen w-[110px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col items-center">
      {/* Branding */}
      <div className="border-b border-sidebar-border w-full p-4 flex flex-col items-center gap-1">
        <span className="text-sm font-bold italic text-sidebar-foreground leading-tight text-center">
          PolicyStreet
        </span>
        <span className="rounded-md bg-gradient-to-r from-blue-400 to-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
          Tools
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full overflow-y-auto px-2 py-2 space-y-1">
        {/* Tools */}
        <SectionLabel>Tools</SectionLabel>
        <NavItem to="/report" icon={FileText} label="Report Generator" isActive={isActive("/report")} />

        {/* Divider */}
        <div className="mx-2 my-2 border-t border-sidebar-border" />

        {/* Database */}
        <SectionLabel>Database</SectionLabel>

        {/* Department Workflows */}
        <SectionLabel>Workflows</SectionLabel>
        <NavItem to="/workflows/affiliates" icon={Workflow} label="Affiliates" isActive={isActive("/workflows/affiliates")} />
        <NavItem
          to="/workflows/imotorbike"
          icon={Bike}
          label="iMotorbike"
          isActive={isActive("/workflows/imotorbike")}
          indent
        />

        {/* Divider */}
        <div className="mx-2 my-2 border-t border-sidebar-border" />

        {/* Admin */}
        <SectionLabel>Admin</SectionLabel>
        <NavItem to="/admin/users" icon={Users} label="Users" isActive={isActive("/admin/users")} />
        <NavItem to="/admin/audit-logs" icon={ClipboardList} label="Audit Logs" isActive={isActive("/admin/audit-logs")} />
      </nav>

      {/* Profile - bottom */}
      <div className="border-t border-sidebar-border w-full p-2">
        <Link
          to="/profile"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-medium transition-colors",
            isActive("/profile")
              ? "bg-sidebar-ring/80 text-white"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
          )}
        >
          <UserCircle className="h-5 w-5" />
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );
}
