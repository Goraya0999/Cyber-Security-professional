import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logStatusEnum = pgEnum("log_status", ["benign", "malicious"]);

export const networkLogsTable = pgTable("network_logs", {
  id: serial("id").primaryKey(),
  sourceIp: text("source_ip").notNull(),
  destinationIp: text("destination_ip").notNull(),
  protocol: text("protocol").notNull(),
  data: text("data").notNull(),
  status: logStatusEnum("status").notNull(),
  nodeId: text("node_id").notNull(),
  bytesSent: integer("bytes_sent").notNull().default(0),
  confidenceScore: real("confidence_score").notNull().default(0.5),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertNetworkLogSchema = createInsertSchema(networkLogsTable).omit({ id: true });
export type InsertNetworkLog = z.infer<typeof insertNetworkLogSchema>;
export type NetworkLog = typeof networkLogsTable.$inferSelect;
