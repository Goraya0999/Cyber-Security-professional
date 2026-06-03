import { useState } from "react";
import { ShieldAlert, CheckCircle2, Clock, AlertTriangle, Zap } from "lucide-react";
import {
  useGetAlerts,
  getGetAlertsQueryKey,
  useResolveAlert,
} from "@workspace/api-client-react";
import type { Alert, GetAlertsParams } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertBadge } from "@/components/AlertBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Severity configuration for enhanced visual treatment
const SEVERITY_CONFIG = {
  critical: {
    card: "border-red-500/50 bg-red-500/5 shadow-sm shadow-red-500/10",
    dot: "bg-red-500 animate-pulse",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.15)]",
  },
  high: {
    card: "border-orange-500/40 bg-orange-500/5",
    dot: "bg-orange-500",
    glow: "",
  },
  medium: {
    card: "border-yellow-500/30 bg-yellow-500/5",
    dot: "bg-yellow-500",
    glow: "",
  },
  low: {
    card: "border-border",
    dot: "bg-blue-500",
    glow: "",
  },
} as const;

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const params: GetAlertsParams = { severity: severityFilter as Alert["severity"] | "all" };

  const { data: alerts, isLoading } = useGetAlerts(params, {
    query: {
      queryKey: getGetAlertsQueryKey(params),
      refetchInterval: 10000,
    },
  });

  const resolveAlert = useResolveAlert({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
      },
    },
  });

  const unresolvedCount = alerts?.filter((a) => !a.resolved).length ?? 0;
  const criticalCount = alerts?.filter((a) => !a.resolved && a.severity === "critical").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Threat Alerts</h2>
          <div className="flex items-center gap-3 mt-1">
            {unresolvedCount > 0 ? (
              <span className="flex items-center gap-1.5 text-sm text-red-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                {unresolvedCount} unresolved alert{unresolvedCount !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                All alerts resolved
              </span>
            )}
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 animate-pulse">
                <Zap className="w-3 h-3" />
                {criticalCount} CRITICAL
              </span>
            )}
          </div>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40" data-testid="select-severity-filter">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : alerts?.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
          <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-mono text-sm">No alerts match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts?.map((alert) => {
            const config = alert.resolved
              ? null
              : SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG];

            return (
              <Card
                key={alert.id}
                data-testid={`card-alert-${alert.id}`}
                className={
                  alert.resolved
                    ? "opacity-50 border-border transition-all"
                    : `${config?.card ?? ""} ${config?.glow ?? ""} transition-all`
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Severity dot */}
                      {!alert.resolved && config && (
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AlertBadge severity={alert.severity} />
                          <h3 className="font-semibold text-sm">{alert.title}</h3>
                          {alert.resolved && (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                          <span>Source: {alert.sourceIp}</span>
                          <span>Node: {alert.nodeId}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!alert.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveAlert.mutate({ id: alert.id })}
                        disabled={resolveAlert.isPending}
                        data-testid={`button-resolve-${alert.id}`}
                        className="flex-shrink-0 text-green-400 border-green-500/30 hover:bg-green-500/10"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
