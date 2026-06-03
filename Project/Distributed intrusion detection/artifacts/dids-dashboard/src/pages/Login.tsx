import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ShieldAlert, Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { type AuthUser } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setApiError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();

      if (!res.ok) {
        setApiError(body.message ?? "Login failed. Please try again.");
        return;
      }

      login(body.token, body.user as AuthUser);
      navigate("/");
    } catch {
      setApiError("Network error. Please check your connection.");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Top accent gradient */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="p-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                DIDS Control
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Distributed Intrusion Detection System
              </p>
            </div>

            {/* API error */}
            {apiError && (
              <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate id="login-form">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="operator@dids.io"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background/50 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.email
                        ? "border-destructive focus:ring-destructive/50"
                        : "border-border/60 hover:border-border"
                    }`}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-background/50 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.password
                        ? "border-destructive focus:ring-destructive/50"
                        : "border-border/60 hover:border-border"
                    }`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold mt-2 transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              No account yet?{" "}
              <a
                href="/signup"
                id="goto-signup"
                className="text-primary hover:underline font-medium"
              >
                Create one
              </a>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground/60">
          <Lock className="w-3 h-3" />
          <span>Secured with JWT · TLS encrypted</span>
        </div>
      </div>
    </div>
  );
}
