import http from "node:http";
import { URL } from "node:url";

const now = Date.now();

const logs = [
  ["45.33.32.156", "10.0.0.5", "TCP", "SYN flood attack 4500 pkts/s", "malicious", "node-01", 45000, 0.982],
  ["192.168.1.50", "10.0.0.1", "HTTP", "GET /index.html HTTP/1.1", "benign", "node-02", 512, 0.941],
  ["185.220.101.42", "10.0.0.8", "HTTPS", "POST /admin: 1200 failed login attempts", "malicious", "node-03", 4400, 0.934],
  ["10.1.4.77", "10.0.0.2", "DNS", "DNS query: example.com", "benign", "node-04", 64, 0.912],
  ["51.15.88.11", "10.0.0.10", "TCP", "TCP SYN port scan sweep 0-65535", "malicious", "node-05", 1024, 0.887],
  ["172.16.2.9", "10.0.0.3", "HTTPS", "GET /api/status HTTP/2", "benign", "node-01", 900, 0.905],
  ["194.165.16.21", "10.0.0.6", "DNS", "DNS amplification attack detected", "malicious", "node-02", 8192, 0.919],
  ["192.168.1.81", "10.0.0.4", "SSH", "Accepted publickey for deploy", "benign", "node-03", 1280, 0.876],
  ["91.108.4.19", "10.0.0.7", "TCP", "Outbound connection to port 4444 reverse shell", "malicious", "node-04", 2048, 0.961],
  ["10.2.1.18", "10.0.0.9", "UDP", "Service heartbeat packet", "benign", "node-05", 256, 0.889],
].map((row, i) => ({
  id: i + 1,
  sourceIp: row[0],
  destinationIp: row[1],
  protocol: row[2],
  data: row[3],
  status: row[4],
  nodeId: row[5],
  bytesSent: row[6],
  confidenceScore: row[7],
  timestamp: new Date(now - i * 7 * 60_000).toISOString(),
}));

const alerts = [
  ["SYN Flood Attack", "SYN Flood Attack detected from 45.33.32.156 with 98% model confidence.", "critical", "45.33.32.156", "node-01", false, 1],
  ["Brute Force Attack", "High-volume failed login pattern detected from 185.220.101.42.", "high", "185.220.101.42", "node-03", false, 3],
  ["Port Scan", "Systematic scan detected across service ports.", "medium", "51.15.88.11", "node-05", false, 5],
  ["DNS Amplification", "Amplification-style DNS payload detected.", "high", "194.165.16.21", "node-02", true, 7],
].map((row, i) => ({
  id: i + 1,
  title: row[0],
  description: row[1],
  severity: row[2],
  sourceIp: row[3],
  nodeId: row[4],
  resolved: row[5],
  logId: row[6],
  timestamp: new Date(now - i * 23 * 60_000).toISOString(),
}));

const analysisReport = {
  id: "demo-analysis-001",
  fileName: "campus-edge-capture.pcap",
  fileType: "application/vnd.tcpdump.pcap",
  fileSize: 18742912,
  createdAt: new Date(now - 5 * 60_000).toISOString(),
  packetCount: 18420,
  totalBytes: 128992420,
  uniqueSourceIps: 142,
  uniqueDestinationIps: 89,
  protocols: [
    { protocol: "HTTPS", packets: 7240, bytes: 61200000 },
    { protocol: "DNS", packets: 3190, bytes: 5800000 },
    { protocol: "TCP", packets: 2840, bytes: 23100000 },
    { protocol: "HTTP", packets: 2100, bytes: 18400000 },
    { protocol: "SSH", packets: 960, bytes: 1200000 },
  ],
  topSourceIps: [
    { ip: "45.33.32.156", count: 4200, bytes: 38000000 },
    { ip: "192.168.1.50", count: 2380, bytes: 18000000 },
    { ip: "10.1.4.77", count: 1840, bytes: 9900000 },
  ],
  topDestinationIps: [
    { ip: "10.0.0.5", count: 5100, bytes: 44000000 },
    { ip: "8.8.8.8", count: 930, bytes: 870000 },
  ],
  topPorts: [
    { port: 443, count: 7240 },
    { port: 53, count: 3190 },
    { port: 80, count: 2100 },
    { port: 22, count: 960 },
  ],
  dnsRequests: [
    { sourceIp: "192.168.1.50", domain: "updates.example.com", count: 44 },
    { sourceIp: "10.1.4.77", domain: "beacon-control.top", count: 31 },
  ],
  httpActivity: [
    { sourceIp: "192.168.1.50", destinationIp: "10.0.0.5", host: "portal.local", method: "GET", path: "/index.html", count: 120 },
  ],
  timeline: Array.from({ length: 12 }, (_, i) => ({ label: `T+${i + 1}`, packets: 600 + i * 90 + (i > 7 ? 900 : 0), bytes: 4000000 + i * 700000 })),
  threats: [
    {
      type: "Port scanning",
      severity: "High Risk",
      confidence: 0.91,
      description: "45.33.32.156 contacted a high number of ports on 10.0.0.5.",
      indicators: ["Distinct ports: 86", "Single source probing one host"],
      mitigation: "Block or rate-limit the source IP and review exposed services.",
    },
    {
      type: "Suspicious DNS requests",
      severity: "Medium Risk",
      confidence: 0.78,
      description: "DNS requests include high-risk TLD and repeated beacon-like lookups.",
      indicators: ["beacon-control.top (31)", "High-risk TLD"],
      mitigation: "Sinkhole suspicious domains and inspect affected clients.",
    },
  ],
  riskLevel: "High Risk",
  riskScore: 73,
  aiReport: {
    summary: "Analysis found 2 suspicious patterns. Overall risk is High Risk with score 73/100.",
    suspiciousReasons: ["Distinct ports: 86", "beacon-control.top (31)", "Traffic spike after T+8"],
    possibleThreats: ["Port scanning", "Suspicious DNS requests"],
    recommendedMitigations: ["Block or rate-limit the source IP.", "Enable DNS filtering and inspect affected clients."],
    confidenceScore: 0.85,
  },
  securityRecommendations: {
    firewall: ["Block confirmed malicious sources.", "Restrict administrative ports to trusted networks."],
    idsIps: ["Create signatures for repeated port probes.", "Forward DNS and firewall logs into SIEM."],
    hardening: ["Enable MFA for administrative services.", "Patch internet-facing systems."],
  },
};

const liveTrafficLogs = Array.from({ length: 48 }, (_, i) => ({
  id: i + 1,
  ipAddress: ["127.0.0.1", "192.168.1.50", "45.33.32.156", "10.0.0.12"][i % 4],
  country: i % 4 === 0 ? "Local/Private" : i % 4 === 1 ? "Local/Private" : "Unknown",
  method: ["GET", "POST", "GET", "PATCH"][i % 4],
  path: ["/api/summary", "/api/network-analysis/upload", "/api/live-traffic/stats", "/api/alerts/1/resolve"][i % 4],
  userAgent: "Mozilla/5.0 Demo Browser",
  referrer: i % 3 === 0 ? "http://localhost:5173/" : null,
  statusCode: [200, 201, 200, 401, 404][i % 5],
  timestamp: new Date(now - i * 90_000).toISOString(),
}));

const liveTrafficStats = {
  activeVisitors: 4,
  totalRequests: 1248,
  topIps: [
    { ipAddress: "127.0.0.1", count: 420 },
    { ipAddress: "192.168.1.50", count: 318 },
    { ipAddress: "45.33.32.156", count: 210 },
  ],
  timeline: Array.from({ length: 12 }, (_, i) => ({ label: `T-${11 - i}`, requests: 12 + i * 4 + (i > 7 ? 22 : 0) })),
  countries: [
    { country: "Local/Private", count: 738 },
    { country: "Unknown", count: 510 },
  ],
  statusCodes: [
    { statusCode: 200, count: 980 },
    { statusCode: 404, count: 120 },
    { statusCode: 401, count: 88 },
  ],
};

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type,x-api-key",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url ?? "/", "http://localhost:3001");
  const path = url.pathname;

  if (path === "/api/healthz") return send(res, 200, { status: "ok" });
  if (path === "/api/auth/me") return send(res, 200, { id: 1, username: "zaid", email: "zaid@dids.local", createdAt: new Date().toISOString() });
  if (path === "/api/auth/login" || path === "/api/auth/signup") {
    return send(res, path.endsWith("signup") ? 201 : 200, {
      token: "mock.token.value",
      user: { id: 1, username: "zaid", email: "zaid@dids.local", createdAt: new Date().toISOString() },
    });
  }
  if (path === "/api/summary") {
    const totalTraffic = 12840;
    const threatsDetected = 284;
    return send(res, 200, {
      totalTraffic,
      threatsDetected,
      safeRequests: totalTraffic - threatsDetected,
      activeNodes: 5,
      systemStatus: "critical",
      threatRate: 2.2,
      trafficTrend: 5.2,
      unresolvedAlerts: 3,
    });
  }
  if (path === "/api/logs/recent") return send(res, 200, logs.slice(0, Number(url.searchParams.get("limit") ?? 10)));
  if (path === "/api/logs") {
    const status = url.searchParams.get("status");
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    let filtered = logs;
    if (status && status !== "all") filtered = filtered.filter((l) => l.status === status);
    if (search) filtered = filtered.filter((l) => `${l.sourceIp} ${l.destinationIp} ${l.protocol} ${l.data}`.toLowerCase().includes(search));
    return send(res, 200, { logs: filtered, total: 12840, page: Number(url.searchParams.get("page") ?? 1), pageSize: Number(url.searchParams.get("pageSize") ?? 50) });
  }
  if (path === "/api/alerts") {
    const severity = url.searchParams.get("severity");
    const filtered = severity && severity !== "all" ? alerts.filter((a) => a.severity === severity) : alerts;
    return send(res, 200, filtered);
  }
  if (path.match(/^\/api\/alerts\/\d+\/resolve$/)) {
    const id = Number(path.split("/")[3]);
    const alert = alerts.find((a) => a.id === id) ?? alerts[0];
    return send(res, 200, { ...alert, resolved: true });
  }
  if (path === "/api/analytics/traffic") {
    const points = Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(now - (11 - i) * 60 * 60_000).toISOString(),
      benign: 420 + i * 16 + (i % 3) * 42,
      malicious: 8 + (i % 4) * 7 + (i > 7 ? 18 : 0),
      label: "",
    }));
    return send(res, 200, points);
  }
  if (path === "/api/analytics/threats") {
    return send(res, 200, [
      { name: "SYN Flood Attack", count: 92, percentage: 32.4 },
      { name: "Brute Force Attack", count: 68, percentage: 23.9 },
      { name: "SQL Injection", count: 46, percentage: 16.2 },
      { name: "Port Scan", count: 41, percentage: 14.4 },
      { name: "DNS Amplification", count: 37, percentage: 13.1 },
    ]);
  }
  if (path === "/api/analytics/nodes") {
    return send(res, 200, [
      { nodeId: "node-01", location: "New York, US", totalRequests: 3920, threats: 91, status: "online" },
      { nodeId: "node-02", location: "London, UK", totalRequests: 2840, threats: 67, status: "online" },
      { nodeId: "node-03", location: "Tokyo, JP", totalRequests: 2310, threats: 54, status: "online" },
      { nodeId: "node-04", location: "Frankfurt, DE", totalRequests: 1980, threats: 43, status: "online" },
      { nodeId: "node-05", location: "Singapore, SG", totalRequests: 1790, threats: 29, status: "online" },
    ]);
  }
  if (path === "/api/network-analysis") return send(res, 200, [analysisReport]);
  if (path === "/api/network-analysis/upload" && req.method === "POST") {
    await readBody(req);
    return send(res, 201, analysisReport);
  }
  if (path === "/api/network-analysis/demo-analysis-001") return send(res, 200, analysisReport);
  if (path.startsWith("/api/network-analysis/demo-analysis-001/export/")) return send(res, 200, analysisReport);
  if (path === "/api/live-traffic" || path === "/api/live-traffic/stats") return send(res, 200, liveTrafficStats);
  if (path === "/api/live-traffic/logs") return send(res, 200, liveTrafficLogs);
  if (path === "/api/live-traffic/export") return send(res, 200, liveTrafficLogs);
  if (path === "/api/live-traffic/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);
    return;
  }
  if (path === "/api/scan" && req.method === "POST") {
    const body = await readBody(req);
    const malicious = /flood|scan|injection|failed|shell|amplification/i.test(body.data ?? "");
    return send(res, 200, {
      logId: 999,
      prediction: malicious ? "malicious" : "benign",
      confidenceScore: malicious ? 0.97 : 0.94,
      threatType: malicious ? "SYN Flood Attack" : null,
      alertId: malicious ? 77 : null,
      message: malicious ? "Threat detected: SYN Flood Attack (97% confidence)" : "Traffic classified as benign (94% confidence)",
    });
  }

  send(res, 404, { error: "Not found", path });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Mock DIDS API listening on http://localhost:3001");
});
