import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Shield, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/data/supabase/client";
import type { Database } from "@/data/supabase/types";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AppRole = Database["public"]["Enums"]["app_role"];

type RoleRow = {
  id: string;
  name: string;
  accessRights: string;
  status: "active";
  createdAt: Date;
};

const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  user: "User",
};

const ROLE_ACCESS_RIGHTS: Record<AppRole, string> = {
  admin: "Full access",
  moderator: "Moderate access",
  user: "Reports, Workflows",
};

async function fetchRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const byRole = new Map<AppRole, { createdAt: Date }>();
  for (const row of data ?? []) {
    const role = row.role as AppRole;
    const created = row.created_at ? parseISO(row.created_at) : new Date();
    const existing = byRole.get(role);
    if (!existing || created < existing.createdAt) {
      byRole.set(role, { createdAt: created });
    }
  }

  return Array.from(byRole.entries()).map(([role, { createdAt }]) => ({
    id: role,
    name: ROLE_DISPLAY_NAMES[role],
    accessRights: ROLE_ACCESS_RIGHTS[role],
    status: "active" as const,
    createdAt,
  }));
}

export default function AdminRolesPage() {
  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: fetchRoles,
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <PageHeader
          icon={Shield}
          title="Roles"
          description="Manage roles and access rights for PolicyStreet Tools"
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create role
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            {error && (
              <div className="p-4 text-sm text-destructive">
                Failed to load roles: {(error as Error).message}
              </div>
            )}
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading roles…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Access rights</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Created date</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No roles in use yet. Assign roles to users to see them here.
                      </TableCell>
                    </TableRow>
                  )}
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-muted-foreground">{role.accessRights}</TableCell>
                      <TableCell>
                        <Badge variant={role.status === "active" ? "default" : "secondary"}>
                          {role.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(role.createdAt, "d MMM, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
