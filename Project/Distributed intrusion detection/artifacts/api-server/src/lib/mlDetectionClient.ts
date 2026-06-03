import { z } from "zod";
import { detectThreat, type DetectionResult } from "./detectionService";
import { logger } from "./logger";

export interface TrafficInput {
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  data: string;
  nodeId: string;
  bytesSent?: number;
}

const MlScanResponse = z.object({
  prediction: z.enum(["benign", "malicious"]),
  confidenceScore: z.number().min(0).max(1),
  threatType: z.string().nullable(),
  message: z.string().optional(),
});

const THREAT_SEVERITY: Record<string, DetectionResult["severity"]> = {
  "DoS Hulk": "critical",
  DDoS: "critical",
  "SYN Flood Attack": "critical",
  "Reverse Shell Attempt": "critical",
  "SQL Injection": "high",
  "DNS Amplification": "high",
  "Brute Force Attack": "high",
  "FTP-Patator": "high",
  "SSH-Patator": "high",
  "DoS GoldenEye": "high",
  PortScan: "medium",
  "Port Scan": "medium",
  XSS: "medium",
};

function normalizeMlDetection(scan: z.infer<typeof MlScanResponse>): DetectionResult {
  const threatType = scan.prediction === "malicious" ? scan.threatType ?? "Unknown Threat" : null;

  return {
    prediction: scan.prediction,
    confidenceScore: Math.round(scan.confidenceScore * 1000) / 1000,
    threatType,
    severity: threatType ? THREAT_SEVERITY[threatType] ?? "high" : "low",
  };
}

async function callMlService(input: TrafficInput): Promise<DetectionResult | null> {
  const baseUrl = process.env["DIDS_ML_API_URL"]?.replace(/\/$/, "");
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timeoutMs = Number(process.env["DIDS_ML_TIMEOUT_MS"] ?? 2500);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = process.env["DIDS_ML_API_KEY"];
    const token = process.env["DIDS_ML_API_TOKEN"];
    if (apiKey) headers["X-Internal-API-Key"] = apiKey;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/api/scan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sourceIp: input.sourceIp,
        destinationIp: input.destinationIp,
        protocol: input.protocol,
        data: input.data,
        nodeId: input.nodeId,
        bytesSent: input.bytesSent ?? 0,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "ML service returned non-OK status; using local detector");
      return null;
    }

    return normalizeMlDetection(MlScanResponse.parse(await response.json()));
  } catch (error) {
    logger.warn({ error }, "ML service unavailable; using local detector");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function detectTraffic(input: TrafficInput): Promise<DetectionResult> {
  const mlDetection = await callMlService(input);
  if (mlDetection) return mlDetection;

  return detectThreat({
    sourceIp: input.sourceIp,
    destinationIp: input.destinationIp,
    protocol: input.protocol,
    data: input.data,
    bytesSent: input.bytesSent ?? 0,
  });
}
