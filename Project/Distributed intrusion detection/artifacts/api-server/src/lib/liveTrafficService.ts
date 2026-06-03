import { EventEmitter } from "node:events";
import type { Request } from "express";
import { and, count, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { db, liveTrafficLogsTable, type InsertLiveTrafficLog, type LiveTrafficLog } from "@workspace/db";
import { logger } from "./logger";

export interface LiveTrafficFilters {
  ip?: string;
  endpoint?: string;
  statusCode?: number;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface LiveTrafficStats {
  activeVisitors: number;
  totalRequests: number;
  topIps: Array<{ ipAddress: string; count: number }>;
  timeline: Array<{ label: string; requests: number }>;
  countries: Array<{ country: string; count: number }>;
  statusCodes: Array<{ statusCode: number; count: number }>;
}

export const liveTrafficEvents = new EventEmitter();
liveTrafficEvents.setMaxListeners(200);

const activeVisitors = new Map<string, number>();
const LOG_RATE_LIMIT_WINDOW_MS = 60_000;
const LOG_RATE_LIMIT_MAX = Number(process.env["DIDS_LIVE_TRAFFIC_MAX_LOGS_PER_IP_PER_MINUTE"] ?? 600);
const ipLogCounters = new Map<string, { resetAt: number; count: number }>();

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeIp(rawIp: string | undefined): string {
  if (!rawIp) return "unknown";
  let ip = rawIp.trim();
  if (ip.includes(",")) ip = ip.split(",")[0]!.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") return "127.0.0.1";
  return ip.replace(/^\[|\]$/g, "");
}

export function getRealClientIp(req: Request): string {
  return normalizeIp(
    headerValue(req.headers["x-forwarded-for"] as string | string[] | undefined)
      ?? headerValue(req.headers["x-real-ip"] as string | string[] | undefined)
      ?? req.ip
      ?? req.socket.remoteAddress
      ?? req.connection.remoteAddress,
  );
}

function countryForIp(ipAddress: string): string | null {
  if (ipAddress === "127.0.0.1" || ipAddress.startsWith("10.") || ipAddress.startsWith("192.168.")) return "Local/Private";
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ipAddress)) return "Local/Private";
  return null;
}

function shouldLogIp(ipAddress: string): boolean {
  const now = Date.now();
  const current = ipLogCounters.get(ipAddress);
  if (!current || current.resetAt <= now) {
    ipLogCounters.set(ipAddress, { resetAt: now + LOG_RATE_LIMIT_WINDOW_MS, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= LOG_RATE_LIMIT_MAX;
}

export async function recordLiveTraffic(entry: InsertLiveTrafficLog): Promise<void> {
  if (!shouldLogIp(entry.ipAddress)) return;

  try {
    const [created] = await db.insert(liveTrafficLogsTable).values(entry).returning();
    if (!created) return;
    activeVisitors.set(created.ipAddress, Date.now());
    liveTrafficEvents.emit("traffic", created);
  } catch (error) {
    logger.warn({ error }, "Failed to persist live traffic log");
  }
}

export function pruneActiveVisitors(): void {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [ip, lastSeen] of activeVisitors) {
    if (lastSeen < cutoff) activeVisitors.delete(ip);
  }
}

function buildWhere(filters: LiveTrafficFilters) {
  const conditions = [];
  if (filters.ip) conditions.push(ilike(liveTrafficLogsTable.ipAddress, `%${filters.ip}%`));
  if (filters.endpoint) conditions.push(ilike(liveTrafficLogsTable.path, `%${filters.endpoint}%`));
  if (filters.statusCode) conditions.push(eq(liveTrafficLogsTable.statusCode, filters.statusCode));
  if (filters.from) conditions.push(gte(liveTrafficLogsTable.timestamp, filters.from));
  if (filters.to) conditions.push(lte(liveTrafficLogsTable.timestamp, filters.to));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getLiveTrafficLogs(filters: LiveTrafficFilters): Promise<LiveTrafficLog[]> {
  return db
    .select()
    .from(liveTrafficLogsTable)
    .where(buildWhere(filters))
    .orderBy(desc(liveTrafficLogsTable.timestamp))
    .limit(Math.min(filters.limit ?? 100, 1000));
}

export async function getLiveTrafficStats(filters: LiveTrafficFilters): Promise<LiveTrafficStats> {
  pruneActiveVisitors();
  const where = buildWhere(filters);
  const [totalRows, topIps, countries, statusCodes, recentRows] = await Promise.all([
    db.select({ count: count() }).from(liveTrafficLogsTable).where(where),
    db
      .select({ ipAddress: liveTrafficLogsTable.ipAddress, count: count() })
      .from(liveTrafficLogsTable)
      .where(where)
      .groupBy(liveTrafficLogsTable.ipAddress)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ country: sql<string>`coalesce(${liveTrafficLogsTable.country}, 'Unknown')`, count: count() })
      .from(liveTrafficLogsTable)
      .where(where)
      .groupBy(sql`coalesce(${liveTrafficLogsTable.country}, 'Unknown')`)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ statusCode: liveTrafficLogsTable.statusCode, count: count() })
      .from(liveTrafficLogsTable)
      .where(where)
      .groupBy(liveTrafficLogsTable.statusCode)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ timestamp: liveTrafficLogsTable.timestamp })
      .from(liveTrafficLogsTable)
      .where(where)
      .orderBy(desc(liveTrafficLogsTable.timestamp))
      .limit(1000),
  ]);

  const buckets = Array.from({ length: 12 }, (_, index) => ({ label: `T-${11 - index}`, requests: 0 })).reverse();
  const now = Date.now();
  const bucketMs = 5 * 60_000;
  for (const row of recentRows) {
    const distance = Math.floor((now - row.timestamp.getTime()) / bucketMs);
    if (distance >= 0 && distance < 12) buckets[11 - distance]!.requests += 1;
  }

  return {
    activeVisitors: activeVisitors.size,
    totalRequests: Number(totalRows[0]?.count ?? 0),
    topIps: topIps.map((row) => ({ ipAddress: row.ipAddress, count: Number(row.count) })),
    timeline: buckets,
    countries: countries.map((row) => ({ country: row.country, count: Number(row.count) })),
    statusCodes: statusCodes.map((row) => ({ statusCode: row.statusCode, count: Number(row.count) })),
  };
}

export function liveTrafficToCsv(rows: LiveTrafficLog[]): string {
  const header = ["id", "ipAddress", "timestamp", "method", "path", "userAgent", "referrer", "country", "statusCode"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [
    header.join(","),
    ...rows.map((row) => [
      row.id,
      row.ipAddress,
      row.timestamp.toISOString(),
      row.method,
      row.path,
      row.userAgent,
      row.referrer,
      row.country,
      row.statusCode,
    ].map(escape).join(",")),
  ].join("\n");
}

export function makeLiveTrafficEntry(req: Request, statusCode: number): InsertLiveTrafficLog {
  const ipAddress = getRealClientIp(req);
  return {
    ipAddress,
    country: countryForIp(ipAddress),
    method: req.method,
    path: req.originalUrl || req.url,
    userAgent: headerValue(req.headers["user-agent"] as string | string[] | undefined) ?? null,
    referrer: headerValue((req.headers["referer"] ?? req.headers["referrer"]) as string | string[] | undefined) ?? null,
    statusCode,
    timestamp: new Date(),
  };
}
