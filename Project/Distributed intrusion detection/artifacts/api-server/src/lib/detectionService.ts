/**
 * Detection Service — Simulated ML intrusion detection engine.
 *
 * In a production system this would call a trained ML model (e.g. via ONNX,
 * a Python microservice, or a cloud ML endpoint). Here we implement a
 * rule-based heuristic that mimics model behavior with realistic confidence
 * scores so the API surface is identical to a real model integration.
 */

export type Prediction = "benign" | "malicious";

export interface DetectionResult {
  prediction: Prediction;
  confidenceScore: number; // 0.0 – 1.0
  threatType: string | null;
  severity: "low" | "medium" | "high" | "critical";
}

interface TrafficInput {
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  data: string;
  bytesSent?: number;
}

// ---------------------------------------------------------------------------
// Feature extraction helpers
// ---------------------------------------------------------------------------

/** Known malicious payload patterns with associated threat labels */
const MALICIOUS_PATTERNS: Array<{ pattern: RegExp; threat: string; severity: DetectionResult["severity"]; weight: number }> = [
  { pattern: /syn[\s_-]?flood|ddos|4500\s*pkts/i,       threat: "SYN Flood Attack",          severity: "critical", weight: 0.97 },
  { pattern: /reverse[\s_-]?shell|port\s*4444/i,         threat: "Reverse Shell Attempt",     severity: "critical", weight: 0.96 },
  { pattern: /botnet|c&c|c2\s*comm/i,                    threat: "Botnet C2 Communication",   severity: "critical", weight: 0.95 },
  { pattern: /brute[\s_-]?force|(\d+)\s*attempt/i,       threat: "Brute Force Attack",        severity: "high",     weight: 0.93 },
  { pattern: /sql[\s_-]?inject|'\s*or\s*1=1|union\s+select/i, threat: "SQL Injection",        severity: "high",     weight: 0.92 },
  { pattern: /dns[\s_-]?amp|amplif/i,                    threat: "DNS Amplification",         severity: "high",     weight: 0.91 },
  { pattern: /buffer[\s_-]?overflow|stack\s*smash/i,     threat: "Buffer Overflow",           severity: "high",     weight: 0.90 },
  { pattern: /credential[\s_-]?stuff|1200\s*failed/i,    threat: "Credential Stuffing",       severity: "high",     weight: 0.89 },
  { pattern: /<script[\s>]|xss|cross[\s_-]?site/i,       threat: "XSS Payload",               severity: "medium",   weight: 0.85 },
  { pattern: /port[\s_-]?scan|0-65535|sweep/i,           threat: "Port Scan",                 severity: "medium",   weight: 0.84 },
  { pattern: /directory[\s_-]?travers|\.\.\/|etc\/passwd/i, threat: "Directory Traversal",    severity: "medium",   weight: 0.83 },
  { pattern: /ldap[\s_-]?inject/i,                       threat: "LDAP Injection",            severity: "medium",   weight: 0.82 },
  { pattern: /icmp[\s_-]?flood|ping[\s_-]?flood/i,       threat: "ICMP Flood",               severity: "low",      weight: 0.75 },
];

/** Suspicious source IP ranges (public ASNs known for hosting attack infra) */
const SUSPICIOUS_IP_PREFIXES = ["45.33.", "185.220.", "194.165.", "91.108.", "51.15.", "185.107."];

function isSuspiciousIp(ip: string): boolean {
  return SUSPICIOUS_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

function addGaussianNoise(value: number, stdDev = 0.03): number {
  // Box-Muller transform for Gaussian noise
  const u1 = Math.random();
  const u2 = Math.random();
  const noise = stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.min(1, Math.max(0, value + noise));
}

// ---------------------------------------------------------------------------
// Main detection function
// ---------------------------------------------------------------------------

/**
 * Classify network traffic and return a detection result.
 *
 * Algorithm:
 * 1. Extract pattern-based features from payload
 * 2. Apply IP reputation scoring
 * 3. Apply protocol/byte anomaly signals
 * 4. Combine signals into final prediction + confidence
 */
export function detectThreat(input: TrafficInput): DetectionResult {
  const data = input.data ?? "";
  let maliciousWeight = 0;
  let matchedThreat: string | null = null;
  let matchedSeverity: DetectionResult["severity"] = "low";

  // 1. Pattern matching against payload
  for (const entry of MALICIOUS_PATTERNS) {
    if (entry.pattern.test(data)) {
      if (entry.weight > maliciousWeight) {
        maliciousWeight = entry.weight;
        matchedThreat = entry.threat;
        matchedSeverity = entry.severity;
      }
    }
  }

  // 2. IP reputation boost
  const ipBoost = isSuspiciousIp(input.sourceIp) ? 0.15 : 0;

  // 3. Protocol anomaly: unexpected high-volume ICMP or raw TCP
  let protocolBoost = 0;
  if (input.protocol === "ICMP" && (input.bytesSent ?? 0) > 10000) {
    protocolBoost = 0.1;
    if (!matchedThreat) matchedThreat = "Anomalous ICMP Volume";
  }
  if (input.protocol === "TCP" && (input.bytesSent ?? 0) > 60000) {
    protocolBoost = 0.08;
  }

  // 4. Combine signals
  const combinedScore = maliciousWeight + ipBoost * (1 - maliciousWeight) + protocolBoost;
  const DECISION_THRESHOLD = 0.50;

  if (combinedScore >= DECISION_THRESHOLD) {
    // Malicious: confidence is how far above threshold
    const rawConfidence = Math.min(0.99, combinedScore + 0.03);
    return {
      prediction: "malicious",
      confidenceScore: Math.round(addGaussianNoise(rawConfidence, 0.02) * 1000) / 1000,
      threatType: matchedThreat ?? "Unknown Threat",
      severity: matchedSeverity,
    };
  }

  // Benign: confidence is how far below threshold (inverted)
  const baseConfidence = 0.75 + (DECISION_THRESHOLD - combinedScore) * 0.4;
  return {
    prediction: "benign",
    confidenceScore: Math.round(addGaussianNoise(Math.min(0.99, baseConfidence), 0.04) * 1000) / 1000,
    threatType: null,
    severity: "low",
  };
}

/**
 * Map threat severity and confidence to an alert title + description.
 */
export function buildAlertDescription(threatType: string, sourceIp: string, confidence: number): string {
  const pct = Math.round(confidence * 100);
  return `${threatType} detected from ${sourceIp} with ${pct}% model confidence. Immediate investigation recommended.`;
}
