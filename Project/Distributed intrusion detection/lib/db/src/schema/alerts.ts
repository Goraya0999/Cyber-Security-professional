import { pgTable, serial, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertSeverityEnum = pgEnum("alert_severity", ["low", "medium", "high", "critical"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  sourceIp: text("source_ip").notNull(),
  nodeId: text("node_id").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  logId: integer("log_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
