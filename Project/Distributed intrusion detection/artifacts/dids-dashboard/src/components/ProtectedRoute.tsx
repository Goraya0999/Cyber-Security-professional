import { Redirect } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { type ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute — wraps pages that require authentication.
 *
 * Shows a full-screen spinner while auth state is loading (hydrating from
 * localStorage). Redirects to /login once loading is complete and the user
 * is not authenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background" aria-label="Loading">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
