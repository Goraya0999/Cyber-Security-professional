import { cn } from "@/lib/utils";
import type { NodeStat } from "@workspace/api-client-react";

type NodeStatus = NodeStat["status"];

export function StatusDot({ status, className }: { status: NodeStatus; className?: string }) {
  const variants: Record<string, string> = {
    online: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
    offline: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
    degraded: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]",
  };

  return (
    <span className="flex items-center justify-center w-4 h-4">
      <span className={cn("w-2 h-2 rounded-full", variants[status] ?? variants.offline, className)} />
    </span>
  );
}
