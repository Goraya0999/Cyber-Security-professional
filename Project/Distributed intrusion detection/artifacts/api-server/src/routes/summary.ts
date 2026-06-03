import { Router, type IRouter } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, networkLogsTable, alertsTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/summary", async (_req, res): Promise<void> => {
  const [trafficStats, alertStats, unresolvedCount] = await Promise.all([
    db
      .select({
        total: count(),
        threats: sql<number>`count(*) filter (where ${networkLogsTable.status} = 'malicious')`.as("threats"),
        safe: sql<number>`count(*) filter (where ${networkLogsTable.status} = 'benign')`.as("safe"),
        activeNodes: sql<number>`count(distinct ${networkLogsTable.nodeId})`.as("active_nodes"),
      })
      .from(networkLogsTable),
    db
      .select({
        criticalCount: sql<number>`count(*) filter (where ${alertsTable.severity} = 'critical' and not ${alertsTable.resolved})`.as("critical_count"),
      })
      .from(alertsTable),
    db
      .select({ cnt: count() })
      .from(alertsTable)
      .where(eq(alertsTable.resolved, false)),
  ]);

  const stats = trafficStats[0];
  const total = Number(stats?.total ?? 0);
  const threats = Number(stats?.threats ?? 0);
  const safe = Number(stats?.safe ?? 0);
  const activeNodes = Number(stats?.activeNodes ?? 0);
  const criticalCount = Number(alertStats[0]?.criticalCount ?? 0);
  const unresolved = Number(unresolvedCount[0]?.cnt ?? 0);

  const threatRate = total > 0 ? Math.round((threats / total) * 1000) / 10 : 0;

  let systemStatus: "operational" | "degraded" | "critical";
  if (criticalCount > 0) {
    systemStatus = "critical";
  } else if (threatRate > 20) {
    systemStatus = "degraded";
  } else {
    systemStatus = "operational";
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      totalTraffic: total,
      threatsDetected: threats,
      safeRequests: safe,
      activeNodes,
      systemStatus,
      threatRate,
      trafficTrend: 5.2, // simulated percentage change
      unresolvedAlerts: unresolved,
    })
  );
});

export default router;
