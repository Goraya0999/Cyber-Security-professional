import { Router, type IRouter } from "express";
import {
  getLiveTrafficLogs,
  getLiveTrafficStats,
  liveTrafficEvents,
  liveTrafficToCsv,
  type LiveTrafficFilters,
} from "../lib/liveTrafficService";
import { requireLiveTrafficAuth } from "../middlewares/liveTrafficAuth";

const router: IRouter = Router();
const EXPORT_RATE_WINDOW_MS = 60_000;
const EXPORT_RATE_MAX = 20;
const exportCounters = new Map<string, { resetAt: number; count: number }>();

function parseFilters(query: Record<string, unknown>): LiveTrafficFilters {
  const statusCode = typeof query["statusCode"] === "string" && query["statusCode"]
    ? Number(query["statusCode"])
    : undefined;

  return {
    ip: typeof query["ip"] === "string" ? query["ip"] : undefined,
    endpoint: typeof query["endpoint"] === "string" ? query["endpoint"] : undefined,
    statusCode: Number.isFinite(statusCode) ? statusCode : undefined,
    from: typeof query["from"] === "string" && query["from"] ? new Date(query["from"]) : undefined,
    to: typeof query["to"] === "string" && query["to"] ? new Date(query["to"]) : undefined,
    limit: typeof query["limit"] === "string" ? Number(query["limit"]) : undefined,
  };
}

function rateLimitKey(reqIp: string | undefined): string {
  return reqIp ?? "unknown";
}

function allowExport(key: string): boolean {
  const now = Date.now();
  const current = exportCounters.get(key);
  if (!current || current.resetAt <= now) {
    exportCounters.set(key, { resetAt: now + EXPORT_RATE_WINDOW_MS, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= EXPORT_RATE_MAX;
}

router.use("/live-traffic", requireLiveTrafficAuth);

router.get("/live-traffic", async (req, res): Promise<void> => {
  res.json(await getLiveTrafficStats(parseFilters(req.query)));
});

router.get("/live-traffic/logs", async (req, res): Promise<void> => {
  res.json(await getLiveTrafficLogs(parseFilters(req.query)));
});

router.get("/live-traffic/stats", async (req, res): Promise<void> => {
  res.json(await getLiveTrafficStats(parseFilters(req.query)));
});

router.get("/live-traffic/export", async (req, res): Promise<void> => {
  if (!allowExport(rateLimitKey(req.ip))) {
    res.status(429).json({ error: "Too many export requests. Please wait before exporting again." });
    return;
  }

  const format = typeof req.query["format"] === "string" ? req.query["format"] : "json";
  const rows = await getLiveTrafficLogs({ ...parseFilters(req.query), limit: 1000 });

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"live-traffic-logs.csv\"");
    res.send(liveTrafficToCsv(rows));
    return;
  }

  if (format !== "json") {
    res.status(400).json({ error: "Unsupported export format. Use csv or json." });
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=\"live-traffic-logs.json\"");
  res.json(rows);
});

router.get("/live-traffic/stream", async (req, res): Promise<void> => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: unknown) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: "connected", timestamp: new Date().toISOString() });

  const listener = (event: unknown) => send({ type: "traffic", payload: event });
  liveTrafficEvents.on("traffic", listener);

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    liveTrafficEvents.off("traffic", listener);
    res.end();
  });
});

export default router;
