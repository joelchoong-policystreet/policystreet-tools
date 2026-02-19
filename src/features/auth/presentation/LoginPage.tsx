import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Login form */}
      <div className="flex-1 flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <span className="text-2xl font-bold text-primary">PolicyStreet</span>
            <span className="ml-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              CRM
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Sign In Now</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Login"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right: Copy / welcome */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-12">
        <div className="max-w-md text-center text-white space-y-6">
          <h2 className="text-4xl font-bold tracking-tight">Welcome to Policystreet</h2>
          <p className="text-lg text-blue-100">
            Turn your sales process into a state of the art, revenue-generating machine. Manage Your
            Pipeline with Total Visibility.
          </p>
        </div>
      </div>
    </div>
  );
}
