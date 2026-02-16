import { useState } from "react";
import { Users as UsersIcon, UserPlus, Copy, Check } from "lucide-react";
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

const INITIAL_USERS: User[] = [
  { id: "1", name: "Jane Smith", email: "jane.smith@policystreet.com", role: "admin", status: "active" },
  { id: "2", name: "John Doe", email: "john.doe@policystreet.com", role: "admin", status: "active" },
  { id: "3", name: "Alice Wong", email: "alice.wong@policystreet.com", role: "user", status: "active" },
  { id: "4", name: "Bob Chen", email: "bob.chen@policystreet.com", role: "user", status: "active" },
  { id: "5", name: "Carol Lee", email: "carol.lee@policystreet.com", role: "user", status: "active" },
];

function generateOneTimePassword(length = 12): string {
  const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [addedResult, setAddedResult] = useState<{ password: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    const password = generateOneTimePassword();
    const newUser: User = {
      id: String(Date.now()),
      name: name.trim() || trimmedEmail.split("@")[0] || "—",
      email: trimmedEmail,
      role,
      status: "active",
      mustChangePassword: true,
    };
    setUsers((prev) => [...prev, newUser]);
    setAddedResult({ password, email: trimmedEmail });
    setName("");
    setEmail("");
    setRole("user");
  };

  const closeAddDialog = () => {
    setAddOpen(false);
    setAddedResult(null);
    setCopied(false);
  };

  const copyPassword = () => {
    if (!addedResult) return;
    navigator.clipboard.writeText(addedResult.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "deactivated" : "active" }
          : u
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <UsersIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
              <p className="text-sm text-muted-foreground">
                Users allowed to use PolicyStreet
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
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
                          onCheckedChange={() => toggleUserStatus(user.id)}
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
                <Button type="submit">Add user & generate password</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
