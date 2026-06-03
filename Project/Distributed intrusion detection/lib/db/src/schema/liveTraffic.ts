import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liveTrafficLogsTable = pgTable(
  "live_traffic_logs",
  {
    id: serial("id").primaryKey(),
    ipAddress: text("ip_address").notNull(),
    country: text("country"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    statusCode: integer("status_code").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  },
  (table) => ({
    ipIdx: index("live_traffic_ip_idx").on(table.ipAddress),
    pathIdx: index("live_traffic_path_idx").on(table.path),
    statusIdx: index("live_traffic_status_idx").on(table.statusCode),
    timestampIdx: index("live_traffic_timestamp_idx").on(table.timestamp),
  }),
);

export const insertLiveTrafficLogSchema = createInsertSchema(liveTrafficLogsTable).omit({ id: true });
export type InsertLiveTrafficLog = z.infer<typeof insertLiveTrafficLogSchema>;
export type LiveTrafficLog = typeof liveTrafficLogsTable.$inferSelect;
