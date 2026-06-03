import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ title, value, icon, description, trend, className }: StatCardProps) {
  return (
    <UICard className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight font-mono">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </UICard>
  );
}
