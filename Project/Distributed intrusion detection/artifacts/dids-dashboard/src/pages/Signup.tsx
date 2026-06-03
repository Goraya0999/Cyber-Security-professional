import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ShieldAlert, Eye, EyeOff, Lock, Mail, User, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { type AuthUser } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be 30 characters or fewer")
      .regex(/^\w+$/, "Username may only contain letters, numbers, and underscores"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

// ---------------------------------------------------------------------------
// Password strength meter
// ---------------------------------------------------------------------------

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { level: 2, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { level: 3, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { level: 4, label: "Strong", color: "bg-green-500" };
  return { level: 5, label: "Excellent", color: "bg-emerald-500" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Signup() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const strength = getPasswordStrength(passwordValue);

  async function onSubmit(data: SignupForm) {
    setApiError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setApiError(body.message ?? "Signup failed. Please try again.");
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
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse delay-700" />
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
      <div className="relative w-full max-w-md mx-4 my-8">
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="p-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Account</h1>
              <p className="text-sm text-muted-foreground mt-1">Join DIDS Control Platform</p>
            </div>

            {/* API Error */}
            {apiError && (
              <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate id="signup-form">
              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="signup-username" className="text-sm font-medium text-foreground">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    placeholder="analyst_01"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background/50 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.username
                        ? "border-destructive focus:ring-destructive/50"
                        : "border-border/60 hover:border-border"
                    }`}
                    {...register("username")}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="analyst@dids.io"
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
                <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-background/50 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.password
                        ? "border-destructive focus:ring-destructive/50"
                        : "border-border/60 hover:border-border"
                    }`}
                    {...register("password", {
                      onChange: (e) => setPasswordValue(e.target.value),
                    })}
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

                {/* Password strength meter */}
                {passwordValue && (
                  <div className="space-y-1 animate-in fade-in">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            n <= strength.level ? strength.color : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength:{" "}
                      <span
                        className={
                          strength.level <= 2
                            ? "text-red-400"
                            : strength.level <= 3
                              ? "text-yellow-400"
                              : "text-green-400"
                        }
                      >
                        {strength.label}
                      </span>
                    </p>
                  </div>
                )}

                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="signup-confirm-password" className="text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background/50 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.confirmPassword
                        ? "border-destructive focus:ring-destructive/50"
                        : "border-border/60 hover:border-border"
                    }`}
                    {...register("confirmPassword")}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                id="signup-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold mt-2 transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <a href="/login" id="goto-login" className="text-primary hover:underline font-medium">
                Sign in
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground/60">
          <Lock className="w-3 h-3" />
          <span>bcrypt encrypted · JWT authenticated</span>
        </div>
      </div>
    </div>
  );
}
