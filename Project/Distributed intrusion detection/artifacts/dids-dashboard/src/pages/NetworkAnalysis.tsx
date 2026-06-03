import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { AlertTriangle, Download, FileJson, FileText, Gauge, Network, ShieldCheck, UploadCloud } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RiskLevel = "Safe" | "Low Risk" | "Medium Risk" | "High Risk" | "Critical";

interface NetworkAnalysisReport {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  packetCount: number;
  totalBytes: number;
  uniqueSourceIps: number;
  uniqueDestinationIps: number;
  riskLevel: RiskLevel;
  riskScore: number;
  protocols: Array<{ protocol: string; packets: number; bytes: number }>;
  topSourceIps: Array<{ ip: string; count: number; bytes: number }>;
  topDestinationIps: Array<{ ip: string; count: number; bytes: number }>;
  topPorts: Array<{ port: number; count: number }>;
  dnsRequests: Array<{ sourceIp: string; domain: string; count: number }>;
  httpActivity: Array<{ sourceIp: string; destinationIp: string; host?: string; method?: string; path?: string; count: number }>;
  timeline: Array<{ label: string; packets: number; bytes: number }>;
  threats: Array<{
    type: string;
    severity: RiskLevel;
    confidence: number;
    description: string;
    indicators: string[];
    mitigation: string;
  }>;
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

const ACCEPTED_EXTENSIONS = ".pcap,.pcapng,.cap,.log,.txt,.json,.csv,.evtx";
const RISK_COLORS: Record<RiskLevel, string> = {
  Safe: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  "Low Risk": "text-lime-400 border-lime-500/30 bg-lime-500/10",
  "Medium Risk": "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  "High Risk": "text-orange-400 border-orange-500/30 bg-orange-500/10",
  Critical: "text-red-400 border-red-500/30 bg-red-500/10",
};
const CHART_COLORS = ["#2dd4bf", "#38bdf8", "#a78bfa", "#f59e0b", "#ef4444", "#22c55e"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[index]}`;
}

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
            <p className="text-2xl font-bold font-mono mt-1">{value}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-md border flex items-center justify-center", tone ?? "text-primary border-primary/25 bg-primary/10")}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NetworkAnalysis() {
  const { token } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<NetworkAnalysisReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const protocolChart = useMemo(
    () => report?.protocols.slice(0, 6).map((item) => ({ name: item.protocol, value: item.packets })) ?? [],
    [report],
  );

  function uploadFile(file: File) {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/network-analysis/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setReport(JSON.parse(xhr.responseText) as NetworkAnalysisReport);
        setUploadProgress(100);
      } else {
        const message = (() => {
          try {
            return JSON.parse(xhr.responseText).error as string;
          } catch {
            return "Upload failed";
          }
        })();
        setError(message);
      }
    };
    xhr.onerror = () => {
      setIsUploading(false);
      setError("Network error while uploading file");
    };
    xhr.send(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) uploadFile(file);
    event.currentTarget.value = "";
  }

  async function exportReport(format: "json" | "pdf" | "docx") {
    if (!report) return;
    const response = await fetch(`/api/network-analysis/${report.id}/export/${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setError("Could not export report");
      return;
    }
    const blob = await response.blob();
    const fallbackName = `${report.fileName.replace(/\.[^.]+$/, "")}-analysis.${format}`;
    const disposition = response.headers.get("content-disposition");
    const fileName = disposition?.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Network Traffic Analysis</h2>
          <p className="text-muted-foreground text-sm mt-1">Upload packet captures, firewall logs, IDS/IPS logs, or network log files for threat analysis</p>
        </div>
        {report && (
          <Badge variant="outline" className={cn("uppercase tracking-wider font-bold", RISK_COLORS[report.riskLevel])}>
            {report.riskLevel}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "min-h-44 border border-dashed rounded-md flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/30",
            )}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <UploadCloud className="w-10 h-10 text-primary" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">Drop a capture or network log file here</p>
              <p className="text-xs text-muted-foreground">Supports .pcap, .pcapng, .cap, Wireshark captures, network logs, IDS/IPS logs, and firewall logs</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              size="sm"
              disabled={isUploading}
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <UploadCloud className="w-4 h-4" />
              Select File
            </Button>
          </div>

          {(isUploading || uploadProgress > 0) && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>{isUploading ? "Uploading and analyzing..." : "Upload complete"}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="Packets Parsed" value={report.packetCount.toLocaleString()} icon={<Network />} />
            <MetricCard title="Total Traffic" value={formatBytes(report.totalBytes)} icon={<FileText />} />
            <MetricCard title="Threats Found" value={report.threats.length.toString()} icon={<AlertTriangle />} tone="text-red-400 border-red-500/25 bg-red-500/10" />
            <MetricCard title="Risk Score" value={`${report.riskScore}/100`} icon={<Gauge />} tone={RISK_COLORS[report.riskLevel]} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Traffic Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={report.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4 }} />
                    <Bar dataKey="packets" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Top Protocols</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={protocolChart} dataKey="value" nameKey="name" outerRadius={90} innerRadius={52}>
                      {protocolChart.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Top Source IPs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.topSourceIps.slice(0, 8).map((ip) => (
                  <div key={ip.ip} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-mono truncate">{ip.ip}</span>
                    <span className="text-muted-foreground font-mono">{ip.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Top Destination Ports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.topPorts.slice(0, 8).map((port) => (
                  <div key={port.port} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-mono">:{port.port}</span>
                    <span className="text-muted-foreground font-mono">{port.count}</span>
                  </div>
                ))}
                {report.topPorts.length === 0 && <p className="text-sm text-muted-foreground">No port data extracted</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">DNS Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.dnsRequests.slice(0, 8).map((dns) => (
                  <div key={`${dns.sourceIp}-${dns.domain}`} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{dns.domain}</span>
                      <span className="text-muted-foreground font-mono">{dns.count}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{dns.sourceIp}</p>
                  </div>
                ))}
                {report.dnsRequests.length === 0 && <p className="text-sm text-muted-foreground">No DNS requests extracted</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">AI Security Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{report.aiReport.summary}</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Why Suspicious</h3>
                  <ul className="space-y-1 text-sm">
                    {report.aiReport.suspiciousReasons.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Possible Threats</h3>
                  <ul className="space-y-1 text-sm">
                    {report.aiReport.possibleThreats.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Mitigations</h3>
                  <ul className="space-y-1 text-sm">
                    {report.aiReport.recommendedMitigations.slice(0, 5).map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Threat Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.threats.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  No strong threat pattern detected in this file.
                </div>
              ) : (
                report.threats.map((threat) => (
                  <div key={`${threat.type}-${threat.description}`} className="border rounded-md p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="font-semibold">{threat.type}</span>
                      </div>
                      <Badge variant="outline" className={RISK_COLORS[threat.severity]}>
                        {threat.severity} / {Math.round(threat.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{threat.description}</p>
                    <p className="text-sm">{threat.mitigation}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Security Recommendations & Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Firewall</h3>
                  {report.securityRecommendations.firewall.map((item) => <p key={item} className="text-muted-foreground mb-1">- {item}</p>)}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">IDS/IPS</h3>
                  {report.securityRecommendations.idsIps.map((item) => <p key={item} className="text-muted-foreground mb-1">- {item}</p>)}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Hardening</h3>
                  {report.securityRecommendations.hardening.map((item) => <p key={item} className="text-muted-foreground mb-1">- {item}</p>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => exportReport("pdf")}><Download className="w-4 h-4" />PDF</Button>
                <Button variant="outline" size="sm" onClick={() => exportReport("docx")}><FileText className="w-4 h-4" />DOCX</Button>
                <Button variant="outline" size="sm" onClick={() => exportReport("json")}><FileJson className="w-4 h-4" />JSON</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
