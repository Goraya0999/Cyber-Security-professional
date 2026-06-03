import { Badge } from "@/components/ui/badge";
import type { Alert } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type Severity = Alert["severity"];

export function AlertBadge({ severity, className }: { severity: Severity; className?: string }) {
  const variants: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };

  return (
    <Badge
      variant="outline"
      className={cn("uppercase tracking-wider text-[10px] font-bold px-2 py-0.5", variants[severity] ?? variants.low, className)}
    >
      {severity}
    </Badge>
  );
}
