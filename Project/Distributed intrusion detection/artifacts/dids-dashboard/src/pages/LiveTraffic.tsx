import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Download, Globe2, RefreshCw, Users, Wifi } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface LiveTrafficLog {
  id: number;
  ipAddress: string;
  country: string | null;
  method: string;
  path: string;
  userAgent: string | null;
  referrer: string | null;
  statusCode: number;
  timestamp: string;
}

interface LiveTrafficStats {
  activeVisitors: number;
  totalRequests: number;
  topIps: Array<{ ipAddress: string; count: number }>;
  timeline: Array<{ label: string; requests: number }>;
  countries: Array<{ country: string; count: number }>;
  statusCodes: Array<{ statusCode: number; count: number }>;
}

const COLORS = ["#38bdf8", "#2dd4bf", "#a78bfa", "#f59e0b", "#ef4444", "#22c55e"];

function MetricCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
            <p className="text-2xl font-bold font-mono mt-1">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-md border border-primary/25 bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LiveTraffic() {
  const { token } = useAuth();
  const [stats, setStats] = useState<LiveTrafficStats | null>(null);
  const [logs, setLogs] = useState<LiveTrafficLog[]>([]);
  const [ip, setIp] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [statusCode, setStatusCode] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (ip) params.set("ip", ip);
    if (endpoint) params.set("endpoint", endpoint);
    if (statusCode !== "all") params.set("statusCode", statusCode);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    return params.toString();
  }, [endpoint, from, ip, statusCode, to]);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const suffix = query ? `?${query}` : "";
      const [statsRes, logsRes] = await Promise.all([
        fetch(`/api/live-traffic/stats${suffix}`, { headers: authHeaders }),
        fetch(`/api/live-traffic/logs${suffix ? `${suffix}&limit=100` : "?limit=100"}`, { headers: authHeaders }),
      ]);
      if (!statsRes.ok || !logsRes.ok) throw new Error("Could not load live traffic data");
      setStats(await statsRes.json() as LiveTrafficStats);
      setLogs(await logsRes.json() as LiveTrafficLog[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live traffic request failed");
    }
  }, [authHeaders, query]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(query);
    params.set("token", token);
    const source = new EventSource(`/api/live-traffic/stream?${params.toString()}`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "traffic" && message.payload) {
          setLogs((current) => [message.payload as LiveTrafficLog, ...current].slice(0, 100));
          void loadData();
        }
      } catch {
        // Ignore malformed SSE messages.
      }
    };

    return () => source.close();
  }, [loadData, query, token]);

  async function exportLogs(format: "csv" | "json") {
    const params = new URLSearchParams(query);
    params.set("format", format);
    const response = await fetch(`/api/live-traffic/export?${params.toString()}`, { headers: authHeaders });
    if (!response.ok) {
      setError("Could not export live traffic logs");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `live-traffic-logs.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Traffic Scanner</h2>
          <p className="text-muted-foreground text-sm mt-1">Captures real client IPs and request metadata from live incoming API traffic</p>
        </div>
        <Badge variant="outline" className={connected ? "text-emerald-400 border-emerald-500/30" : "text-yellow-400 border-yellow-500/30"}>
          {connected ? "Realtime Connected" : "Realtime Waiting"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Active Visitors" value={(stats?.activeVisitors ?? 0).toString()} icon={<Users />} />
        <MetricCard title="Total Requests" value={(stats?.totalRequests ?? 0).toLocaleString()} icon={<Activity />} />
        <MetricCard title="Top IPs" value={(stats?.topIps.length ?? 0).toString()} icon={<Wifi />} />
        <MetricCard title="Countries" value={(stats?.countries.length ?? 0).toString()} icon={<Globe2 />} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input value={ip} onChange={(event) => setIp(event.target.value)} placeholder="Filter by IP" className="font-mono text-sm" />
          <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="Filter by endpoint" className="font-mono text-sm" />
          <Select value={statusCode} onValueChange={setStatusCode}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="201">201</SelectItem>
              <SelectItem value="400">400</SelectItem>
              <SelectItem value="401">401</SelectItem>
              <SelectItem value="404">404</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
          <div className="md:col-span-5 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadData()}><RefreshCw className="w-4 h-4" />Refresh</Button>
            <Button variant="outline" size="sm" onClick={() => void exportLogs("csv")}><Download className="w-4 h-4" />CSV Export</Button>
            <Button variant="outline" size="sm" onClick={() => void exportLogs("json")}><Download className="w-4 h-4" />JSON Export</Button>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Traffic Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats?.timeline ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4 }} />
                <Bar dataKey="requests" fill="#38bdf8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats?.countries ?? []} dataKey="count" nameKey="country" outerRadius={90} innerRadius={52}>
                  {(stats?.countries ?? []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
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
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Top IPs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.topIps ?? []).map((row) => (
              <div key={row.ipAddress} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono truncate">{row.ipAddress}</span>
                <span className="font-mono text-muted-foreground">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                <tr className="border-b">
                  <th className="text-left py-2 pr-3">Time</th>
                  <th className="text-left py-2 pr-3">IP</th>
                  <th className="text-left py-2 pr-3">Method</th>
                  <th className="text-left py-2 pr-3">Path</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 pr-3 font-mono">{log.ipAddress}</td>
                    <td className="py-2 pr-3 font-mono">{log.method}</td>
                    <td className="py-2 pr-3 font-mono max-w-[260px] truncate" title={log.path}>{log.path}</td>
                    <td className="py-2 pr-3 font-mono">{log.statusCode}</td>
                    <td className="py-2 pr-3 max-w-[260px] truncate" title={log.userAgent ?? ""}>{log.userAgent ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
