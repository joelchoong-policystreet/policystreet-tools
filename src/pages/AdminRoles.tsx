import { format } from "date-fns";
import { Shield, Plus, Trash2 } from "lucide-react";
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

type Role = {
  id: string;
  name: string;
  accessRights: string;
  status: "active" | "inactive";
  createdAt: Date;
};

const MOCK_ROLES: Role[] = [
  { id: "1", name: "Admin", accessRights: "Full access", status: "active", createdAt: new Date("2025-01-15") },
  { id: "2", name: "User", accessRights: "Reports, Workflows", status: "active", createdAt: new Date("2025-01-15") },
  { id: "3", name: "Billing view", accessRights: "Billing read-only", status: "active", createdAt: new Date("2025-02-01") },
  { id: "4", name: "Finance", accessRights: "Finance read-only", status: "active", createdAt: new Date("2025-02-01") },
  { id: "5", name: "Finance editor", accessRights: "Finance read & edit", status: "active", createdAt: new Date("2025-02-10") },
  { id: "6", name: "Part time ops motor", accessRights: "Workflows (limited)", status: "active", createdAt: new Date("2025-02-12") },
];

export default function AdminRoles() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
              <p className="text-sm text-muted-foreground">
                Manage roles and access rights for PolicyStreet Tools
              </p>
            </div>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create role
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
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
                {MOCK_ROLES.map((role) => (
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
