import { useState } from "react";
import { useScanTraffic } from "@workspace/api-client-react";
import type { ScanResult } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Scan, Loader2, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

const PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "ICMP", "DNS", "FTP", "SSH"];
const NODES = ["node-1", "node-2", "node-3", "node-4", "node-5"];

const SAMPLE_PAYLOADS: Record<string, { data: string; protocol: string; bytesSent: number }> = {
  "Normal web request":     { data: "GET /index.html HTTP/1.1",                       protocol: "HTTP",  bytesSent: 512 },
  "SQL injection attempt":  { data: "GET /login?id=' OR 1=1-- HTTP/1.1",              protocol: "HTTP",  bytesSent: 320 },
  "DNS query":              { data: "DNS query: example.com",                          protocol: "DNS",   bytesSent: 64  },
  "Port scan":              { data: "TCP SYN port scan sweep 0-65535",                 protocol: "TCP",   bytesSent: 1024 },
  "Brute force login":      { data: "POST /admin: 1200 failed login attempts",         protocol: "HTTPS", bytesSent: 4400 },
  "SYN flood":              { data: "SYN flood attack — 4500 pkts/s",                 protocol: "TCP",   bytesSent: 45000 },
  "Reverse shell":          { data: "Outbound connection to port 4444 (reverse shell)", protocol: "TCP", bytesSent: 2048 },
  "DNS amplification":      { data: "DNS amplification attack detected",               protocol: "DNS",   bytesSent: 8192 },
};

interface ScanResultDisplayProps {
  result: ScanResult;
}

function ScanResultDisplay({ result }: ScanResultDisplayProps) {
  const isMalicious = result.prediction === "malicious";
  const pct = Math.round(result.confidenceScore * 100);

  return (
    <div
      className={`rounded-md border p-4 space-y-3 transition-all ${
        isMalicious
          ? "bg-red-500/10 border-red-500/30"
          : "bg-emerald-500/10 border-emerald-500/30"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {isMalicious ? (
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          )}
          <span className={`text-sm font-semibold ${isMalicious ? "text-red-400" : "text-emerald-400"}`}>
            {result.message}
          </span>
        </div>
        <Badge
          variant={isMalicious ? "destructive" : "secondary"}
          className="uppercase text-[10px] font-bold flex-shrink-0"
        >
          {result.prediction}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="space-y-0.5">
          <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Confidence</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isMalicious ? "bg-red-400" : "bg-emerald-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono font-bold">{pct}%</span>
          </div>
        </div>
        {result.threatType && (
          <div className="space-y-0.5">
            <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Threat Type</p>
            <p className="font-mono text-red-300">{result.threatType}</p>
          </div>
        )}
        <div className="space-y-0.5">
          <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Log ID</p>
          <p className="font-mono text-muted-foreground">#{result.logId}</p>
        </div>
      </div>

      {result.alertId && (
        <p className="text-xs text-red-300 font-mono">
          ⚠ Alert #{result.alertId} auto-created — check the Alerts tab.
        </p>
      )}
    </div>
  );
}

export function ScanPanel() {
  const [open, setOpen] = useState(false);
  const [sourceIp, setSourceIp] = useState("192.168.1.50");
  const [destinationIp, setDestinationIp] = useState("10.0.0.1");
  const [protocol, setProtocol] = useState("HTTP");
  const [data, setData] = useState("GET /index.html HTTP/1.1");
  const [nodeId, setNodeId] = useState("node-1");
  const [bytesSent, setBytesSent] = useState("512");
  const [result, setResult] = useState<ScanResult | null>(null);

  const { mutate: scan, isPending } = useScanTraffic({
    mutation: {
      onSuccess: (res) => setResult(res),
    },
  });

  function loadSample(label: string) {
    const s = SAMPLE_PAYLOADS[label];
    if (!s) return;
    setData(s.data);
    setProtocol(s.protocol);
    setBytesSent(String(s.bytesSent));
    setResult(null);
  }

  function handleScan() {
    setResult(null);
    scan({
      data: {
        sourceIp,
        destinationIp,
        protocol,
        data,
        nodeId,
        bytesSent: parseInt(bytesSent, 10) || 0,
      },
    });
  }

  return (
    <Card className="border-primary/20">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
              Live Traffic Scanner
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/40">
              ML Detection Engine
            </Badge>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          {/* Quick-load samples */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick Load Sample</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(SAMPLE_PAYLOADS).map((label) => (
                <button
                  key={label}
                  onClick={() => loadSample(label)}
                  className="text-[11px] font-mono px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="src-ip" className="text-xs">Source IP</Label>
              <Input
                id="src-ip"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                className="font-mono text-xs h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dst-ip" className="text-xs">Dest IP</Label>
              <Input
                id="dst-ip"
                value={destinationIp}
                onChange={(e) => setDestinationIp(e.target.value)}
                placeholder="e.g. 10.0.0.1"
                className="font-mono text-xs h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Protocol</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map((p) => (
                    <SelectItem key={p} value={p} className="font-mono text-xs">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Node</Label>
              <Select value={nodeId} onValueChange={setNodeId}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODES.map((n) => (
                    <SelectItem key={n} value={n} className="font-mono text-xs">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3 space-y-1.5">
              <Label htmlFor="payload" className="text-xs">Payload / Data</Label>
              <Textarea
                id="payload"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Enter raw payload or traffic description..."
                className="font-mono text-xs resize-none h-16"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bytes" className="text-xs">Bytes Sent</Label>
              <Input
                id="bytes"
                type="number"
                value={bytesSent}
                onChange={(e) => setBytesSent(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleScan}
              disabled={isPending || !sourceIp || !destinationIp || !data}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Scan className="w-4 h-4" />
              )}
              {isPending ? "Analyzing…" : "Run Scan"}
            </Button>
            {result && (
              <button
                onClick={() => setResult(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear result
              </button>
            )}
          </div>

          {result && <ScanResultDisplay result={result} />}
        </CardContent>
      )}
    </Card>
  );
}
