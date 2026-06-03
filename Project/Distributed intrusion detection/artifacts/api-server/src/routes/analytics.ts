import { Router, type IRouter } from "express";
import { desc, eq, sql, count } from "drizzle-orm";
import { db, networkLogsTable, alertsTable } from "@workspace/db";
import {
  GetTrafficAnalyticsQueryParams,
  GetTrafficAnalyticsResponse,
  GetThreatBreakdownResponse,
  GetNodeActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/traffic", async (req, res): Promise<void> => {
  const parsed = GetTrafficAnalyticsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { period } = parsed.data;

  // Build time truncation based on period
  let truncUnit: string;
  let numPoints: number;
  switch (period) {
    case "hour":
      truncUnit = "minute";
      numPoints = 60;
      break;
    case "week":
      truncUnit = "day";
      numPoints = 7;
      break;
    case "month":
      truncUnit = "day";
      numPoints = 30;
      break;
    default:
      truncUnit = "hour";
      numPoints = 24;
  }

  const bucketExpr = sql<string>`date_trunc(${sql.raw(`'${truncUnit}'`)}, ${networkLogsTable.timestamp})`;

  const rows = await db
    .select({
      bucket: bucketExpr.as("bucket"),
      benign: sql<number>`count(*) filter (where ${networkLogsTable.status} = 'benign')`.as("benign"),
      malicious: sql<number>`count(*) filter (where ${networkLogsTable.status} = 'malicious')`.as("malicious"),
    })
    .from(networkLogsTable)
    .where(
      sql`${networkLogsTable.timestamp} > now() - interval '1 ${sql.raw(
        period === "hour" ? "hour" : period === "day" ? "day" : period === "week" ? "week" : "month"
      )}'`
    )
    .groupBy(bucketExpr)
    .orderBy(bucketExpr);

  const points = rows.map((r) => ({
    label: new Date(r.bucket).toISOString(),
    benign: Number(r.benign),
    malicious: Number(r.malicious),
    timestamp: new Date(r.bucket).toISOString(),
  }));

  res.json(GetTrafficAnalyticsResponse.parse(points));
});

router.get("/analytics/threats", async (_req, res): Promise<void> => {
  // Simulate threat type breakdown using alert titles/descriptions
  const rows = await db
    .select({
      title: alertsTable.title,
      cnt: count(),
    })
    .from(alertsTable)
    .groupBy(alertsTable.title)
    .orderBy(desc(count()));

  const total = rows.reduce((acc, r) => acc + Number(r.cnt), 0) || 1;

  const breakdown = rows.map((r) => ({
    name: r.title,
    count: Number(r.cnt),
    percentage: Math.round((Number(r.cnt) / total) * 1000) / 10,
  }));

  res.json(GetThreatBreakdownResponse.parse(breakdown));
});

router.get("/analytics/nodes", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      nodeId: networkLogsTable.nodeId,
      totalRequests: count(),
      threats: sql<number>`count(*) filter (where ${networkLogsTable.status} = 'malicious')`.as("threats"),
    })
    .from(networkLogsTable)
    .groupBy(networkLogsTable.nodeId)
    .orderBy(networkLogsTable.nodeId);

  // Map nodeId to location
  const locationMap: Record<string, string> = {
    "node-01": "New York, US",
    "node-02": "London, UK",
    "node-03": "Tokyo, JP",
    "node-04": "Frankfurt, DE",
    "node-05": "Singapore, SG",
  };

  const nodes = rows.map((r) => ({
    nodeId: r.nodeId,
    location: locationMap[r.nodeId] ?? "Unknown",
    totalRequests: Number(r.totalRequests),
    threats: Number(r.threats),
    status: "online" as const,
  }));

  res.json(GetNodeActivityResponse.parse(nodes));
});

export default router;
