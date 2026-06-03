import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, alertsTable } from "@workspace/db";
import {
  GetAlertsQueryParams,
  GetAlertsResponse,
  ResolveAlertParams,
  ResolveAlertResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const parsed = GetAlertsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { severity, resolved } = parsed.data;

  let query = db.select().from(alertsTable).$dynamic();

  if (severity && severity !== "all") {
    query = query.where(eq(alertsTable.severity, severity as "low" | "medium" | "high" | "critical"));
  }

  if (resolved !== undefined) {
    query = query.where(eq(alertsTable.resolved, resolved));
  }

  const alerts = await query.orderBy(desc(alertsTable.timestamp));

  res.json(GetAlertsResponse.parse(alerts));
});

router.patch("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const params = ResolveAlertParams.safeParse({ id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .update(alertsTable)
    .set({ resolved: true })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(ResolveAlertResponse.parse(alert));
});

export default router;
