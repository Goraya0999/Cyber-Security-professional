import { randomUUID } from "node:crypto";

export type RiskLevel = "Safe" | "Low Risk" | "Medium Risk" | "High Risk" | "Critical";

export interface TrafficEndpoint {
  ip: string;
  count: number;
  bytes: number;
}

export interface ProtocolStat {
  protocol: string;
  packets: number;
  bytes: number;
}

export interface PortStat {
  port: number;
  count: number;
}

export interface DnsRequest {
  sourceIp: string;
  domain: string;
  count: number;
}

export interface HttpActivity {
  sourceIp: string;
  destinationIp: string;
  host?: string;
  method?: string;
  path?: string;
  count: number;
}

export interface ThreatFinding {
  type: string;
  severity: RiskLevel;
  confidence: number;
  description: string;
  indicators: string[];
  mitigation: string;
}

export interface NetworkAnalysisReport {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  packetCount: number;
  totalBytes: number;
  uniqueSourceIps: number;
  uniqueDestinationIps: number;
  protocols: ProtocolStat[];
  topSourceIps: TrafficEndpoint[];
  topDestinationIps: TrafficEndpoint[];
  topPorts: PortStat[];
  dnsRequests: DnsRequest[];
  httpActivity: HttpActivity[];
  timeline: Array<{ label: string; packets: number; bytes: number }>;
  threats: ThreatFinding[];
  riskLevel: RiskLevel;
  riskScore: number;
  aiReport: {
    summary: string;
    suspiciousReasons: string[];
    possibleThreats: string[];
    recommendedMitigations: string[];
    confidenceScore: number;
  };
  securityRecommendations: {
    firewall: string[];
    idsIps: string[];
    hardening: string[];
  };
}

interface PacketObservation {
  timestampMs: number;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  sourcePort?: number;
  destinationPort?: number;
  bytes: number;
  payload?: string;
}

const PRIVATE_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^127\./,
  /^169\.254\./,
];

const MALWARE_DOMAINS = [
  "ru",
  "top",
  "xyz",
  "click",
  "zip",
  "work",
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((range) => range.test(ip));
}

function addCount<T extends { count: number }>(map: Map<string, T>, key: string, make: () => T, increment = 1): void {
  const current = map.get(key) ?? make();
  current.count += increment;
  map.set(key, current);
}

function readUInt16(buffer: Buffer, offset: number, littleEndian: boolean): number {
  return littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
}

function readUInt32(buffer: Buffer, offset: number, littleEndian: boolean): number {
  return littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
}

function ipFromBuffer(buffer: Buffer, offset: number): string {
  return `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
}

function parseDnsName(payload: Buffer, offset: number, depth = 0): string {
  if (depth > 8 || offset >= payload.length) return "";
  const labels: string[] = [];
  let cursor = offset;

  while (cursor < payload.length) {
    const length = payload[cursor];
    if (length === 0) break;
    if ((length & 0xc0) === 0xc0) {
      const pointer = ((length & 0x3f) << 8) | payload[cursor + 1]!;
      const suffix = parseDnsName(payload, pointer, depth + 1);
      if (suffix) labels.push(suffix);
      break;
    }
    cursor += 1;
    if (cursor + length > payload.length) break;
    labels.push(payload.subarray(cursor, cursor + length).toString("ascii"));
    cursor += length;
  }

  return labels.filter(Boolean).join(".");
}

function parseIpPacket(packet: Buffer, timestampMs: number): PacketObservation | null {
  if (packet.length < 14) return null;

  const etherType = packet.readUInt16BE(12);
  let ipOffset = 14;
  if (etherType === 0x8100 && packet.length >= 18) ipOffset = 18;
  if (etherType !== 0x0800 && ipOffset === 14) return null;
  if (packet.length < ipOffset + 20) return null;

  const version = packet[ipOffset] >> 4;
  if (version !== 4) return null;

  const ihl = (packet[ipOffset] & 0x0f) * 4;
  const protocolNumber = packet[ipOffset + 9];
  const sourceIp = ipFromBuffer(packet, ipOffset + 12);
  const destinationIp = ipFromBuffer(packet, ipOffset + 16);
  const totalLength = packet.readUInt16BE(ipOffset + 2);
  const transportOffset = ipOffset + ihl;
  const bytes = totalLength || packet.length;

  if (protocolNumber === 6 && packet.length >= transportOffset + 20) {
    const sourcePort = packet.readUInt16BE(transportOffset);
    const destinationPort = packet.readUInt16BE(transportOffset + 2);
    const dataOffset = ((packet[transportOffset + 12] ?? 5) >> 4) * 4;
    const payload = packet.subarray(transportOffset + dataOffset).toString("utf8").replace(/\0/g, "");
    return { timestampMs, sourceIp, destinationIp, protocol: portProtocol(sourcePort, destinationPort, "TCP"), sourcePort, destinationPort, bytes, payload };
  }

  if (protocolNumber === 17 && packet.length >= transportOffset + 8) {
    const sourcePort = packet.readUInt16BE(transportOffset);
    const destinationPort = packet.readUInt16BE(transportOffset + 2);
    const payload = packet.subarray(transportOffset + 8);
    return { timestampMs, sourceIp, destinationIp, protocol: portProtocol(sourcePort, destinationPort, "UDP"), sourcePort, destinationPort, bytes, payload: payload.toString("utf8").replace(/\0/g, "") };
  }

  if (protocolNumber === 1) {
    return { timestampMs, sourceIp, destinationIp, protocol: "ICMP", bytes };
  }

  return { timestampMs, sourceIp, destinationIp, protocol: `IP-${protocolNumber}`, bytes };
}

function portProtocol(sourcePort: number, destinationPort: number, fallback: "TCP" | "UDP"): string {
  const port = destinationPort || sourcePort;
  if (port === 53) return "DNS";
  if (port === 80 || port === 8080 || port === 8000) return "HTTP";
  if (port === 443 || port === 8443) return "HTTPS";
  if (port === 22) return "SSH";
  if (port === 21) return "FTP";
  if (port === 25 || port === 587) return "SMTP";
  return fallback;
}

function parsePcap(buffer: Buffer): PacketObservation[] {
  if (buffer.length < 24) return [];
  const magicLe = buffer.readUInt32LE(0);
  const magicBe = buffer.readUInt32BE(0);
  const littleEndian = magicLe === 0xa1b2c3d4 || magicLe === 0xa1b23c4d;
  if (!littleEndian && magicBe !== 0xa1b2c3d4 && magicBe !== 0xa1b23c4d) return [];

  const observations: PacketObservation[] = [];
  let offset = 24;
  while (offset + 16 <= buffer.length && observations.length < 250_000) {
    const tsSec = readUInt32(buffer, offset, littleEndian);
    const tsSub = readUInt32(buffer, offset + 4, littleEndian);
    const capturedLength = readUInt32(buffer, offset + 8, littleEndian);
    offset += 16;
    if (capturedLength <= 0 || offset + capturedLength > buffer.length) break;
    const parsed = parseIpPacket(buffer.subarray(offset, offset + capturedLength), tsSec * 1000 + Math.floor(tsSub / 1000));
    if (parsed) observations.push(parsed);
    offset += capturedLength;
  }
  return observations;
}

function parsePcapNg(buffer: Buffer): PacketObservation[] {
  const observations: PacketObservation[] = [];
  let offset = 0;
  let littleEndian = true;

  while (offset + 12 <= buffer.length && observations.length < 250_000) {
    const blockType = buffer.readUInt32LE(offset);
    const blockLength = buffer.readUInt32LE(offset + 4);
    if (blockLength < 12 || offset + blockLength > buffer.length) break;

    if (blockType === 0x0a0d0d0a && offset + 16 <= buffer.length) {
      const bom = buffer.readUInt32LE(offset + 8);
      littleEndian = bom === 0x1a2b3c4d;
    }

    if (blockType === 0x00000006 && offset + 28 <= buffer.length) {
      const timestampHigh = readUInt32(buffer, offset + 12, littleEndian);
      const timestampLow = readUInt32(buffer, offset + 16, littleEndian);
      const capturedLength = readUInt32(buffer, offset + 20, littleEndian);
      const packetOffset = offset + 28;
      if (capturedLength > 0 && packetOffset + capturedLength <= offset + blockLength) {
        const timestampMs = Math.floor(((timestampHigh * 2 ** 32 + timestampLow) || Date.now() * 1000) / 1000);
        const parsed = parseIpPacket(buffer.subarray(packetOffset, packetOffset + capturedLength), timestampMs);
        if (parsed) observations.push(parsed);
      }
    }
    offset += blockLength;
  }

  return observations;
}

function parseTextLogs(text: string): PacketObservation[] {
  const observations: PacketObservation[] = [];
  const ipPattern = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
  const portPattern = /\b(?:spt|sport|srcport|source_port|SPT)[:= ](?<src>\d{1,5}).*?\b(?:dpt|dport|dstport|destination_port|DPT)[:= ](?<dst>\d{1,5})/i;
  const protocolPattern = /\b(TCP|UDP|ICMP|HTTP|HTTPS|DNS|SSH|FTP|SMTP)\b/i;

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const ips = [...line.matchAll(ipPattern)].map((match) => match[0]);
    if (ips.length < 2) continue;
    const ports = line.match(portPattern)?.groups;
    const srcPort = ports?.["src"] ? Number(ports["src"]) : undefined;
    const dstPort = ports?.["dst"] ? Number(ports["dst"]) : undefined;
    const protocol = protocolPattern.exec(line)?.[1]?.toUpperCase() ?? portProtocol(srcPort ?? 0, dstPort ?? 0, "TCP");
    observations.push({
      timestampMs: Date.now() + index,
      sourceIp: ips[0]!,
      destinationIp: ips[1]!,
      protocol,
      sourcePort: srcPort,
      destinationPort: dstPort,
      bytes: Buffer.byteLength(line, "utf8"),
      payload: line,
    });
  }

  return observations;
}

function extractDns(observations: PacketObservation[]): DnsRequest[] {
  const dns = new Map<string, DnsRequest>();
  for (const obs of observations) {
    if (obs.protocol !== "DNS") continue;
    let domain = "";
    if (obs.payload) {
      const domainMatch = obs.payload.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i);
      domain = domainMatch?.[0] ?? "";
    }
    if (!domain && obs.payload) {
      domain = parseDnsName(Buffer.from(obs.payload, "binary"), 12);
    }
    if (!domain) domain = "unparsed-dns-query.local";
    const key = `${obs.sourceIp}:${domain}`;
    addCount(dns, key, () => ({ sourceIp: obs.sourceIp, domain, count: 0 }));
  }
  return [...dns.values()].sort((a, b) => b.count - a.count).slice(0, 20);
}

function extractHttp(observations: PacketObservation[]): HttpActivity[] {
  const activity = new Map<string, HttpActivity>();
  for (const obs of observations) {
    if (obs.protocol !== "HTTP" && obs.protocol !== "HTTPS") continue;
    const payload = obs.payload ?? "";
    const request = payload.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^\s]+)/i);
    const host = payload.match(/\bHost:\s*([^\s]+)/i)?.[1];
    const key = `${obs.sourceIp}:${obs.destinationIp}:${host ?? obs.destinationPort}:${request?.[1] ?? obs.protocol}:${request?.[2] ?? "/"}`;
    addCount(activity, key, () => ({
      sourceIp: obs.sourceIp,
      destinationIp: obs.destinationIp,
      host,
      method: request?.[1]?.toUpperCase(),
      path: request?.[2],
      count: 0,
    }));
  }
  return [...activity.values()].sort((a, b) => b.count - a.count).slice(0, 20);
}

function buildTimeline(observations: PacketObservation[]) {
  if (observations.length === 0) return [];
  const min = Math.min(...observations.map((obs) => obs.timestampMs));
  const max = Math.max(...observations.map((obs) => obs.timestampMs));
  const bucketSize = Math.max(1, Math.ceil((max - min || 1) / 12));
  const buckets = Array.from({ length: 12 }, (_, index) => ({ label: `T+${index + 1}`, packets: 0, bytes: 0 }));

  for (const obs of observations) {
    const index = Math.min(11, Math.floor((obs.timestampMs - min) / bucketSize));
    buckets[index]!.packets += 1;
    buckets[index]!.bytes += obs.bytes;
  }
  return buckets;
}

function riskScoreToLevel(score: number): RiskLevel {
  if (score >= 85) return "Critical";
  if (score >= 65) return "High Risk";
  if (score >= 40) return "Medium Risk";
  if (score >= 15) return "Low Risk";
  return "Safe";
}

function detectThreats(observations: PacketObservation[], dnsRequests: DnsRequest[], timeline: ReturnType<typeof buildTimeline>): ThreatFinding[] {
  const findings: ThreatFinding[] = [];
  const bySourceDest = new Map<string, Set<number>>();
  const sshAttempts = new Map<string, number>();
  const byDestination = new Map<string, number>();
  const outbound = new Map<string, number>();

  for (const obs of observations) {
    if (obs.destinationPort) {
      const key = `${obs.sourceIp}->${obs.destinationIp}`;
      const ports = bySourceDest.get(key) ?? new Set<number>();
      ports.add(obs.destinationPort);
      bySourceDest.set(key, ports);
    }
    if (obs.destinationPort === 22 || obs.protocol === "SSH" || obs.destinationPort === 21 || obs.protocol === "FTP") {
      sshAttempts.set(`${obs.sourceIp}->${obs.destinationIp}`, (sshAttempts.get(`${obs.sourceIp}->${obs.destinationIp}`) ?? 0) + 1);
    }
    byDestination.set(obs.destinationIp, (byDestination.get(obs.destinationIp) ?? 0) + 1);
    if (isPrivateIp(obs.sourceIp) && !isPrivateIp(obs.destinationIp)) {
      outbound.set(obs.destinationIp, (outbound.get(obs.destinationIp) ?? 0) + 1);
    }
  }

  for (const [key, ports] of bySourceDest) {
    if (ports.size >= 20) {
      findings.push({
        type: "Port scanning",
        severity: ports.size >= 80 ? "Critical" : "High Risk",
        confidence: Math.min(0.98, 0.55 + ports.size / 150),
        description: `${key} contacted ${ports.size} distinct destination ports.`,
        indicators: [`Distinct ports: ${ports.size}`, "Single source repeatedly probing one host"],
        mitigation: "Block or rate-limit the source IP and review exposed services on the destination host.",
      });
    }
  }

  for (const [key, count] of sshAttempts) {
    if (count >= 25) {
      findings.push({
        type: "Brute-force attempts",
        severity: count >= 100 ? "Critical" : "High Risk",
        confidence: Math.min(0.96, 0.5 + count / 180),
        description: `${key} generated ${count} authentication-service packets or log entries.`,
        indicators: [`Attempt count: ${count}`, "Repeated SSH/FTP activity"],
        mitigation: "Enable account lockout/MFA, block the source, and inspect authentication logs for compromised accounts.",
      });
    }
  }

  const largestDestination = [...byDestination.entries()].sort((a, b) => b[1] - a[1])[0];
  if (largestDestination && largestDestination[1] >= Math.max(500, observations.length * 0.35)) {
    findings.push({
      type: "DDoS indicators",
      severity: largestDestination[1] > 5000 ? "Critical" : "High Risk",
      confidence: Math.min(0.97, 0.55 + largestDestination[1] / Math.max(1000, observations.length)),
      description: `${largestDestination[0]} received ${largestDestination[1]} packets, indicating possible traffic concentration.`,
      indicators: ["High packet concentration on one destination", `Packets to host: ${largestDestination[1]}`],
      mitigation: "Apply upstream filtering, rate limits, and DDoS protection for the targeted service.",
    });
  }

  const suspiciousDns = dnsRequests.filter((req) => {
    const tld = req.domain.split(".").pop()?.toLowerCase();
    return !!tld && MALWARE_DOMAINS.includes(tld) || req.domain.length > 55 || req.count > 20;
  });
  if (suspiciousDns.length > 0) {
    findings.push({
      type: "Suspicious DNS requests",
      severity: suspiciousDns.length > 5 ? "High Risk" : "Medium Risk",
      confidence: 0.78,
      description: `${suspiciousDns.length} DNS pattern(s) matched high-risk TLD, long-domain, or high-frequency behavior.`,
      indicators: suspiciousDns.slice(0, 5).map((req) => `${req.domain} (${req.count})`),
      mitigation: "Sinkhole suspicious domains, enable DNS filtering, and inspect affected clients for malware.",
    });
  }

  const unusualOutbound = [...outbound.entries()].filter(([, count]) => count >= 20);
  if (unusualOutbound.length > 0) {
    findings.push({
      type: "Unusual outbound connections",
      severity: unusualOutbound.length > 10 ? "High Risk" : "Medium Risk",
      confidence: 0.74,
      description: `${unusualOutbound.length} external destination(s) received repeated outbound traffic from private hosts.`,
      indicators: unusualOutbound.slice(0, 5).map(([ip, count]) => `${ip}: ${count} connections`),
      mitigation: "Review egress firewall rules, validate business need, and block unauthorized outbound destinations.",
    });
  }

  const average = timeline.reduce((sum, pt) => sum + pt.packets, 0) / Math.max(1, timeline.length);
  const spike = timeline.find((pt) => average > 0 && pt.packets >= average * 3 && pt.packets >= 100);
  if (spike) {
    findings.push({
      type: "High-frequency traffic spikes",
      severity: spike.packets > average * 6 ? "High Risk" : "Medium Risk",
      confidence: 0.72,
      description: `${spike.label} contains ${spike.packets} packets, far above the baseline average of ${Math.round(average)}.`,
      indicators: [`Spike bucket: ${spike.label}`, `Packets: ${spike.packets}`],
      mitigation: "Correlate spike timing with service logs and apply rate limiting to the affected service.",
    });
  }

  if (observations.some((obs) => /c2|beacon|reverse shell|4444|payload|malware/i.test(obs.payload ?? ""))) {
    findings.push({
      type: "Malware communication",
      severity: "Critical",
      confidence: 0.9,
      description: "Payload/log text contains malware communication indicators such as beaconing, C2, or reverse shell terms.",
      indicators: ["Malware/C2 keyword matched", "Potential command-and-control behavior"],
      mitigation: "Isolate the host, capture memory/disk evidence, rotate credentials, and block observed indicators.",
    });
  }

  return findings.sort((a, b) => b.confidence - a.confidence);
}

function recommendations(findings: ThreatFinding[]) {
  const hasCritical = findings.some((finding) => finding.severity === "Critical");
  return {
    firewall: [
      "Block confirmed malicious source IPs and suspicious outbound destinations.",
      "Restrict inbound administrative ports such as SSH, FTP, RDP, and database services to trusted networks.",
      hasCritical ? "Enable emergency rate limiting or upstream filtering for targeted hosts." : "Apply rate limits on public services with elevated traffic.",
    ],
    idsIps: [
      "Create IDS signatures for repeated port probes, brute-force bursts, and suspicious DNS domains found in this analysis.",
      "Forward gateway, DNS, firewall, and authentication logs into a central SIEM for correlation.",
      "Tune alert thresholds to reduce false positives while preserving high-severity detections.",
    ],
    hardening: [
      "Enforce MFA and account lockout on administrative services.",
      "Disable unused services and close unnecessary exposed ports.",
      "Patch internet-facing systems and segment critical assets from user subnets.",
    ],
  };
}

function aiSummary(report: Omit<NetworkAnalysisReport, "aiReport" | "securityRecommendations">) {
  const suspiciousReasons = report.threats.flatMap((finding) => finding.indicators).slice(0, 8);
  const possibleThreats = report.threats.map((finding) => finding.type);
  const recommendedMitigations = report.threats.map((finding) => finding.mitigation);
  const confidenceScore = report.threats.length
    ? Math.round((report.threats.reduce((sum, finding) => sum + finding.confidence, 0) / report.threats.length) * 100) / 100
    : 0.92;

  return {
    summary: report.threats.length
      ? `Analysis found ${report.threats.length} suspicious pattern(s). Overall risk is ${report.riskLevel} with score ${report.riskScore}/100.`
      : `No strong attack pattern was detected. Overall risk is ${report.riskLevel} with score ${report.riskScore}/100.`,
    suspiciousReasons: suspiciousReasons.length ? suspiciousReasons : ["Traffic volume and protocol distribution are within expected limits."],
    possibleThreats: possibleThreats.length ? [...new Set(possibleThreats)] : ["No confirmed threat pattern"],
    recommendedMitigations: [...new Set(recommendedMitigations)].slice(0, 8),
    confidenceScore,
  };
}

export function analyzeNetworkFile(fileName: string, fileType: string, content: Buffer): NetworkAnalysisReport {
  const lowerName = fileName.toLowerCase();
  const observations = lowerName.endsWith(".pcapng")
    ? parsePcapNg(content)
    : lowerName.endsWith(".pcap") || lowerName.endsWith(".cap")
      ? parsePcap(content)
      : [];
  const parsedObservations = observations.length > 0 ? observations : parseTextLogs(content.toString("utf8"));

  const sourceIps = new Map<string, TrafficEndpoint>();
  const destinationIps = new Map<string, TrafficEndpoint>();
  const protocols = new Map<string, ProtocolStat>();
  const ports = new Map<number, PortStat>();

  for (const obs of parsedObservations) {
    const source = sourceIps.get(obs.sourceIp) ?? { ip: obs.sourceIp, count: 0, bytes: 0 };
    source.count += 1;
    source.bytes += obs.bytes;
    sourceIps.set(obs.sourceIp, source);

    const destination = destinationIps.get(obs.destinationIp) ?? { ip: obs.destinationIp, count: 0, bytes: 0 };
    destination.count += 1;
    destination.bytes += obs.bytes;
    destinationIps.set(obs.destinationIp, destination);

    const protocol = protocols.get(obs.protocol) ?? { protocol: obs.protocol, packets: 0, bytes: 0 };
    protocol.packets += 1;
    protocol.bytes += obs.bytes;
    protocols.set(obs.protocol, protocol);

    if (obs.destinationPort) {
      const port = ports.get(obs.destinationPort) ?? { port: obs.destinationPort, count: 0 };
      port.count += 1;
      ports.set(obs.destinationPort, port);
    }
  }

  const dnsRequests = extractDns(parsedObservations);
  const httpActivity = extractHttp(parsedObservations);
  const timeline = buildTimeline(parsedObservations);
  const threats = detectThreats(parsedObservations, dnsRequests, timeline);
  const baseScore = threats.reduce((score, finding) => {
    const severityWeight = finding.severity === "Critical" ? 30 : finding.severity === "High Risk" ? 22 : finding.severity === "Medium Risk" ? 14 : 6;
    return score + severityWeight * finding.confidence;
  }, 0);
  const riskScore = Math.min(100, Math.round(baseScore));
  const partialReport = {
    id: randomUUID(),
    fileName,
    fileType,
    fileSize: content.length,
    createdAt: new Date().toISOString(),
    packetCount: parsedObservations.length,
    totalBytes: parsedObservations.reduce((sum, obs) => sum + obs.bytes, 0),
    uniqueSourceIps: sourceIps.size,
    uniqueDestinationIps: destinationIps.size,
    protocols: [...protocols.values()].sort((a, b) => b.packets - a.packets).slice(0, 12),
    topSourceIps: [...sourceIps.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    topDestinationIps: [...destinationIps.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    topPorts: [...ports.values()].sort((a, b) => b.count - a.count).slice(0, 15),
    dnsRequests,
    httpActivity,
    timeline,
    threats,
    riskLevel: riskScoreToLevel(riskScore),
    riskScore,
  };

  return {
    ...partialReport,
    aiReport: aiSummary(partialReport),
    securityRecommendations: recommendations(threats),
  };
}
