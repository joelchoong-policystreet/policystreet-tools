import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, UserPlus, Copy, Check } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type AppRole = Database["public"]["Enums"]["app_role"];
type UserRole = "admin" | "user";
type UserStatus = "active" | "deactivated";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword?: boolean;
};

function generateOneTimePassword(length = 12): string {
  const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

function mapAppRoleToRole(role: AppRole): UserRole {
  return role === "admin" ? "admin" : "user";
}

function mapRoleToAppRole(role: UserRole): AppRole {
  return role as AppRole;
}

async function fetchUsers(): Promise<User[]> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("id, name, email, status, must_change_password").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const roleByUserId = new Map(rolesRes.data.map((r) => [r.user_id, r.role]));

  return profilesRes.data.map((p) => ({
    id: p.id,
    name: p.name || p.email.split("@")[0] || "—",
    email: p.email,
    role: mapAppRoleToRole(roleByUserId.get(p.id) ?? "user"),
    status: (p.status as UserStatus) || "active",
    mustChangePassword: p.must_change_password ?? false,
  }));
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [addError, setAddError] = useState("");
  const [addedResult, setAddedResult] = useState<{ password: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const addUserMutation = useMutation({
    mutationFn: async ({
      email: trimmedEmail,
      name: displayName,
      role: userRole,
      password,
    }: {
      email: string;
      name: string;
      role: UserRole;
      password: string;
    }) => {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: undefined },
      });
      if (signUpError) throw signUpError;
      const newUserId = signUpData.user?.id;
      if (!newUserId) throw new Error("User created but no id returned");

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: newUserId,
          name: displayName || trimmedEmail.split("@")[0] || "—",
          email: trimmedEmail,
          status: "active",
          must_change_password: true,
        },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: newUserId,
        role: mapRoleToAppRole(userRole),
      });
      if (roleError) throw roleError;

      return { password, email: trimmedEmail };
    },
    onSuccess: (result) => {
      setAddedResult(result);
      setAddError("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      setAddError(err.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setAddError("");
    const password = generateOneTimePassword();
    addUserMutation.mutate({
      email: trimmedEmail,
      name: name.trim(),
      role,
      password,
    });
    setName("");
    setEmail("");
    setRole("user");
  };

  const closeAddDialog = () => {
    setAddOpen(false);
    setAddedResult(null);
    setAddError("");
    setCopied(false);
    addUserMutation.reset();
  };

  const copyPassword = () => {
    if (!addedResult) return;
    navigator.clipboard.writeText(addedResult.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleUserStatus = (id: string, currentStatus: UserStatus) => {
    const next = currentStatus === "active" ? "deactivated" : "active";
    updateStatusMutation.mutate({ id, status: next });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <PageHeader
          icon={UsersIcon}
          title="Users"
          description="Users allowed to use PolicyStreet"
          action={
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add user
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            {error && (
              <div className="p-4 text-sm text-destructive">
                Failed to load users: {(error as Error).message}
              </div>
            )}
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading users…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        No users yet. Add a user to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className={user.status === "deactivated" ? "opacity-60" : undefined}
                    >
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "admin" ? "default" : "secondary"}
                        >
                          {user.role === "admin" ? "Admin" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.status === "active"}
                            onCheckedChange={() => toggleUserStatus(user.id, user.status)}
                            disabled={updateStatusMutation.isPending}
                          />
                          <span className="text-sm text-muted-foreground">
                            {user.status === "active" ? "Active" : "Deactivated"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={addOpen} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addedResult ? "User added" : "Add new user"}
            </DialogTitle>
            <DialogDescription>
              {addedResult
                ? "Share the one-time password with the user. They must change it on first login."
                : "Enter email and role. A one-time password will be generated for the user to sign in and change immediately."}
            </DialogDescription>
          </DialogHeader>

          {addedResult ? (
            <>
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-mono">{addedResult.email}</p>
                <p className="text-sm font-medium text-muted-foreground mt-2">One-time password</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono tracking-wider">
                    {addedResult.password}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    title="Copy password"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeAddDialog}>Done</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddedResult(null);
                    setName("");
                    setEmail("");
                    setRole("user");
                  }}
                >
                  Add another
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleAddUser} className="space-y-4">
              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="user@policystreet.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as UserRole)}
                >
                  <SelectTrigger id="add-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addUserMutation.isPending}>
                  {addUserMutation.isPending ? "Adding…" : "Add user & generate password"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
