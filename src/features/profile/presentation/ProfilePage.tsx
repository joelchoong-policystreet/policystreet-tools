import { useState } from "react";
import { UserCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/presentation/useAuth";
import { supabase } from "@/data/supabase/client";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdating(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: "Password changed successfully." });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 max-w-2xl">
        <PageHeader
          icon={UserCircle}
          title="Profile"
          description="Manage your account"
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>Your sign-in email for PolicyStreet Tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="profile-email" className="text-muted-foreground text-sm">
              Email address
            </Label>
            <Input
              id="profile-email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="mt-1.5 bg-muted/50"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change password
            </CardTitle>
            <CardDescription>Set a new password. You will stay signed in after changing it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {message && (
                <p
                  className={cn(
                    "text-sm",
                    message.type === "success" ? "text-green-600" : "text-destructive"
                  )}
                >
                  {message.text}
                </p>
              )}
              <Button type="submit" disabled={updating}>
                {updating ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
