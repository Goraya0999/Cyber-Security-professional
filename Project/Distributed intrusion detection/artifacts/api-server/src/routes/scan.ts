import { Router, type IRouter } from "express";
import { db, networkLogsTable, alertsTable } from "@workspace/db";
import { ScanTrafficBody, ScanTrafficResponse } from "@workspace/api-zod";
import { requireApiKey } from "../middlewares/apiKey";
import { buildAlertDescription } from "../lib/detectionService";
import { detectTraffic, type TrafficInput } from "../lib/mlDetectionClient";
import { PacketScanBody, packetToTrafficInput } from "../lib/packetIngestion";

const router: IRouter = Router();

async function scanAndPersist(input: TrafficInput) {
  const detection = await detectTraffic(input);

  const [log] = await db
    .insert(networkLogsTable)
    .values({
      sourceIp: input.sourceIp,
      destinationIp: input.destinationIp,
      protocol: input.protocol,
      data: input.data,
      status: detection.prediction,
      nodeId: input.nodeId,
      bytesSent: input.bytesSent ?? 0,
      confidenceScore: detection.confidenceScore,
    })
    .returning();

  let alertId: number | null = null;
  if (detection.prediction === "malicious" && detection.threatType) {
    const [alert] = await db
      .insert(alertsTable)
      .values({
        title: detection.threatType,
        description: buildAlertDescription(detection.threatType, input.sourceIp, detection.confidenceScore),
        severity: detection.severity,
        sourceIp: input.sourceIp,
        nodeId: input.nodeId,
        resolved: false,
        logId: log!.id,
      })
      .returning();
    alertId = alert?.id ?? null;
  }

  return ScanTrafficResponse.parse({
    logId: log!.id,
    prediction: detection.prediction,
    confidenceScore: detection.confidenceScore,
    threatType: detection.threatType,
    alertId,
    message:
      detection.prediction === "malicious"
        ? `⚠ Threat detected: ${detection.threatType} (${Math.round(detection.confidenceScore * 100)}% confidence)`
        : `✓ Traffic classified as benign (${Math.round(detection.confidenceScore * 100)}% confidence)`,
  });
}

/**
 * POST /api/scan
 *
 * Accepts raw or structured network traffic, runs the detection engine,
 * persists the log (with confidence score), auto-creates an alert if
 * malicious, and returns the full result.
 *
 * Protected by API key when DIDS_API_KEY env var is set.
 */
router.post("/scan", requireApiKey, async (req, res): Promise<void> => {
  const parsed = ScanTrafficBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;

  res.json(await scanAndPersist({
    sourceIp: input.sourceIp,
    destinationIp: input.destinationIp,
    protocol: input.protocol,
    data: input.data,
    bytesSent: input.bytesSent ?? 0,
    nodeId: input.nodeId,
  }));
});

/**
 * POST /api/scan/packet
 *
 * Accepts packet metadata or tcpdump-style text, normalizes it into the
 * standard scan payload, then uses the same ML/fallback detection workflow.
 */
router.post("/scan/packet", requireApiKey, async (req, res): Promise<void> => {
  const parsed = PacketScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    res.json(await scanAndPersist(packetToTrafficInput(parsed.data)));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid packet payload" });
  }
});

export default router;
