import { Activity, Shield, ShieldCheck, Server, AlertTriangle } from "lucide-react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRecentLogs, getGetRecentLogsQueryKey } from "@workspace/api-client-react";
import { StatCard } from "@/components/Card";
import { LogTable } from "@/components/LogTable";
import { ScanPanel } from "@/components/ScanPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey(), refetchInterval: 10000 },
  });
  const recentParams = { limit: 10 };
  const { data: recentLogs, isLoading: logsLoading } = useGetRecentLogs(
    recentParams,
    { query: { queryKey: getGetRecentLogsQueryKey(recentParams), refetchInterval: 5000 } }
  );

  const statusColors: Record<string, string> = {
    operational: "bg-green-500/15 text-green-400 border-green-500/30",
    degraded: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
          <p className="text-muted-foreground text-sm mt-1">Real-time network intrusion monitoring</p>
        </div>
        {summaryLoading ? (
          <Skeleton className="h-6 w-28" />
        ) : (
          <Badge
            variant="outline"
            className={`uppercase tracking-wider text-xs font-bold ${statusColors[summary?.systemStatus ?? "operational"]}`}
            data-testid="status-badge"
          >
            {summary?.systemStatus ?? "operational"}
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-md p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Traffic"
              value={summary?.totalTraffic.toLocaleString() ?? "—"}
              icon={<Activity className="w-4 h-4" />}
              description={`${summary?.trafficTrend ?? 0}% vs last period`}
            />
            <StatCard
              title="Threats Detected"
              value={summary?.threatsDetected.toLocaleString() ?? "—"}
              icon={<Shield className="w-4 h-4 text-red-400" />}
              description={`${summary?.threatRate ?? 0}% threat rate`}
              className="border-red-500/20"
            />
            <StatCard
              title="Safe Requests"
              value={summary?.safeRequests.toLocaleString() ?? "—"}
              icon={<ShieldCheck className="w-4 h-4 text-green-400" />}
              description="Benign network traffic"
            />
            <StatCard
              title="Active Nodes"
              value={summary?.activeNodes ?? "—"}
              icon={<Server className="w-4 h-4" />}
              description={`${summary?.unresolvedAlerts ?? 0} unresolved alerts`}
            />
          </>
        )}
      </div>

      {/* Unresolved alerts banner */}
      {!summaryLoading && (summary?.unresolvedAlerts ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/25 rounded-md animate-in fade-in slide-in-from-top-1">
          <div className="relative flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
          </div>
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 font-medium flex-1">
            <span className="font-bold">{summary?.unresolvedAlerts}</span> unresolved threat
            {(summary?.unresolvedAlerts ?? 0) > 1 ? "s" : ""} require immediate attention.{" "}
            <a href="/alerts" className="underline hover:no-underline font-semibold">
              View alerts →
            </a>
          </p>
        </div>
      )}


      {/* Live scanner */}
      <ScanPanel />

      {/* Recent logs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
          <span className="text-xs text-muted-foreground font-mono">Auto-refreshing every 5s</span>
        </div>
        <LogTable logs={recentLogs} isLoading={logsLoading} />
      </div>
    </div>
  );
}
