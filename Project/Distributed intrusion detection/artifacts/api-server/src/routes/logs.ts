import { Router, type IRouter } from "express";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, networkLogsTable } from "@workspace/db";
import {
  GetLogsQueryParams,
  GetRecentLogsQueryParams,
  GetLogsResponse,
  GetRecentLogsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/logs", async (req, res): Promise<void> => {
  const parsed = GetLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page, pageSize, status, search } = parsed.data;
  const offset = (page - 1) * pageSize;

  // Build base where conditions
  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(networkLogsTable.status, status as "benign" | "malicious"));
  }

  if (search) {
    conditions.push(
      or(
        ilike(networkLogsTable.sourceIp, `%${search}%`),
        ilike(networkLogsTable.destinationIp, `%${search}%`),
        ilike(networkLogsTable.data, `%${search}%`),
        ilike(networkLogsTable.protocol, `%${search}%`),
      )
    );
  }

  const whereClause = conditions.length > 0
    ? conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)
    : undefined;

  const [logsResult, countResult] = await Promise.all([
    db
      .select()
      .from(networkLogsTable)
      .where(whereClause)
      .orderBy(desc(networkLogsTable.timestamp))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(networkLogsTable)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  res.json(
    GetLogsResponse.parse({
      logs: logsResult,
      total,
      page,
      pageSize,
    })
  );
});

router.get("/logs/recent", async (req, res): Promise<void> => {
  const parsed = GetRecentLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit } = parsed.data;

  const logs = await db
    .select()
    .from(networkLogsTable)
    .orderBy(desc(networkLogsTable.timestamp))
    .limit(limit);

  res.json(GetRecentLogsResponse.parse(logs));
});

export default router;
