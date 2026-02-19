import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  FileText,
  Database,
  Receipt,
  BadgeCheck,
  Users,
  ClipboardList,
  UserCircle,
  Workflow,
  ChevronDown,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/presentation/useAuth";

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
        "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors",
        indent && "scale-[0.85]",
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

interface SectionProps {
  label: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ label, icon: Icon, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground transition-colors"
      >
        <Icon className="h-5 w-5" />
        <span className="flex items-center gap-0.5">
          {label}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>
      {open && <div className="space-y-1 mt-1">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const isActive = (path: string) => location.pathname === path;
  const isDatabaseQuotation = () => location.pathname === "/database" && searchParams.get("view") === "quotation";
  const isDatabaseIssuance = () => location.pathname === "/database" && (searchParams.get("view") === "issuance" || !searchParams.get("view"));
  const isWorkflowActive = (workflowId: string) =>
    location.pathname.startsWith(`/workflows/${workflowId}`);

  return (
    <div className="fixed left-0 top-0 h-screen w-[110px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col items-center z-50">
      <Link
        to="/"
        className="border-b border-sidebar-border w-full p-4 flex flex-col items-center gap-1 hover:bg-sidebar-accent/10 transition-colors"
      >
        <span className="text-sm font-bold italic text-sidebar-foreground leading-tight text-center">
          PolicyStreet
        </span>
        <span className="rounded-md bg-gradient-to-r from-blue-400 to-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
          Tools
        </span>
      </Link>

      <nav className="flex-1 w-full overflow-y-auto px-2 py-2 space-y-1">
        <Section label="Tools" icon={FileText}>
          <NavItem to="/report" icon={FileText} label="Report Generator" isActive={isActive("/report")} />
        </Section>

        <div className="mx-2 my-1 border-t border-sidebar-border" />

        <Section label="Database" icon={Database}>
          <NavItem to="/database?view=quotation" icon={Receipt} label="Quotation" isActive={isDatabaseQuotation()} />
          <NavItem to="/database?view=issuance" icon={BadgeCheck} label="Issuance" isActive={isDatabaseIssuance()} />
        </Section>

        <div className="mx-2 my-1 border-t border-sidebar-border" />

        <Section label="Workflows" icon={Workflow}>
          <NavItem to="/workflows/affiliates" icon={Workflow} label="Affiliates" isActive={isWorkflowActive("affiliates")} />
        </Section>

        <div className="mx-2 my-1 border-t border-sidebar-border" />

        <Section label="Admin" icon={Users}>
          <NavItem to="/admin/users" icon={Users} label="Users" isActive={isActive("/admin/users")} />
          <NavItem to="/admin/roles" icon={Shield} label="Roles" isActive={isActive("/admin/roles")} />
          <NavItem to="/admin/audit-logs" icon={ClipboardList} label="Audit Logs" isActive={isActive("/admin/audit-logs")} />
        </Section>
      </nav>

      <div className="border-t border-sidebar-border w-full p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-medium transition-colors",
                isActive("/profile")
                  ? "bg-sidebar-ring/80 text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
              )}
            >
              <UserCircle className="h-5 w-5" />
              <span>Profile</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="min-w-[140px]">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-muted-foreground focus:text-destructive"
              onSelect={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
