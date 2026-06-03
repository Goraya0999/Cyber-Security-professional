import { Link, useLocation } from "wouter";
import { LayoutDashboard, List, ShieldAlert, BarChart2, LogOut, User, UploadCloud, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/logs", label: "Logs", icon: List },
    { href: "/alerts", label: "Alerts", icon: ShieldAlert },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/network-analysis", label: "Traffic Analysis", icon: UploadCloud },
    { href: "/live-traffic", label: "Live Traffic", icon: RadioTower },
  ];

  return (
    <aside className="w-64 border-r bg-sidebar flex-shrink-0 flex flex-col h-full">
      <div className="p-4 border-b h-16 flex items-center">
        <ShieldAlert className="w-6 h-6 text-primary mr-2" />
        <span className="font-bold text-lg tracking-tight uppercase">DIDS Control</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const active = location === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`link-sidebar-${link.label.toLowerCase()}`}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-none mb-0.5">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          id="sidebar-logout"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
