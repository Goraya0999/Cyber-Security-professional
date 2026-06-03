import { Moon, Sun, Shield } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { useHealthCheck } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { data: health } = useHealthCheck();
  const { user } = useAuth();

  const isOperational = health?.status === "ok";

  return (
    <header className="h-16 border-b bg-background flex items-center px-6 justify-between flex-shrink-0">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold tracking-tight">Mission Control</h1>
        <div className="flex items-center space-x-2 border rounded-full px-3 py-1 bg-muted/50">
          <div
            data-testid="status-indicator"
            className={`w-2.5 h-2.5 rounded-full ${
              isOperational ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            }`}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isOperational ? "System Operational" : "System Degraded"}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Authenticated user badge */}
        {user && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs font-medium"
            data-testid="navbar-user"
          >
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">{user.username}</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>
    </header>
  );
}

