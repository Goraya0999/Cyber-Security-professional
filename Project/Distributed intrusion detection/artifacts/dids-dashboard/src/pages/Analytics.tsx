import { useState } from "react";
import {
  useGetTrafficAnalytics,
  getGetTrafficAnalyticsQueryKey,
  useGetThreatBreakdown,
  getGetThreatBreakdownQueryKey,
  useGetNodeActivity,
  getGetNodeActivityQueryKey,
} from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/StatusDot";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const THREAT_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function Analytics() {
  const [period, setPeriod] = useState<"hour" | "day" | "week" | "month">("day");

  const { data: trafficData, isLoading: trafficLoading } = useGetTrafficAnalytics(
    { period },
    { query: { queryKey: getGetTrafficAnalyticsQueryKey({ period }), refetchInterval: 30000 } }
  );

  const { data: threatBreakdown, isLoading: threatLoading } = useGetThreatBreakdown({
    query: { queryKey: getGetThreatBreakdownQueryKey(), refetchInterval: 30000 },
  });

  const { data: nodeActivity, isLoading: nodesLoading } = useGetNodeActivity({
    query: { queryKey: getGetNodeActivityQueryKey(), refetchInterval: 30000 },
  });

  const formattedTraffic = trafficData?.map((pt) => ({
    ...pt,
    label: new Date(pt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground text-sm mt-1">Network traffic patterns and threat intelligence</p>
      </div>

      {/* Traffic Over Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Traffic Over Time
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Last Hour</SelectItem>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {trafficLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !formattedTraffic || formattedTraffic.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono border border-dashed rounded">
              No traffic data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={formattedTraffic} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="benignGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="maliciousGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="benign" name="Benign" stroke="#2dd4bf" fill="url(#benignGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="malicious" name="Malicious" stroke="#ef4444" fill="url(#maliciousGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: threat types + nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Threat Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {threatLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !threatBreakdown || threatBreakdown.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono border border-dashed rounded">
                No threat data available
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={threatBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={55}
                    >
                      {threatBreakdown.map((_, i) => (
                        <Cell key={i} fill={THREAT_COLORS[i % THREAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {threatBreakdown.slice(0, 6).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: THREAT_COLORS[i % THREAT_COLORS.length] }}
                      />
                      <span className="text-xs text-muted-foreground truncate flex-1" title={cat.name}>
                        {cat.name}
                      </span>
                      <span className="text-xs font-mono font-bold">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Node Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Node Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nodesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !nodeActivity || nodeActivity.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono border border-dashed rounded">
                No node data available
              </div>
            ) : (
              <div className="space-y-3">
                {nodeActivity.map((node) => (
                  <div
                    key={node.nodeId}
                    data-testid={`row-node-${node.nodeId}`}
                    className="flex items-center gap-3 p-3 border rounded-md bg-card"
                  >
                    <StatusDot status={node.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold">{node.nodeId}</span>
                        <span className="text-xs text-muted-foreground">{node.location}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1.5">
                        <div
                          className="bg-primary h-1 rounded-full"
                          style={{
                            width: `${node.totalRequests > 0 ? Math.min(100, (node.totalRequests / (nodeActivity[0]?.totalRequests || 1)) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right text-xs font-mono flex-shrink-0">
                      <div className="font-bold">{node.totalRequests.toLocaleString()}</div>
                      <div className="text-red-400">{node.threats} threats</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attacks vs Normal bar chart */}
      {!threatLoading && nodeActivity && nodeActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Attacks vs Normal Traffic per Node
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={nodeActivity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nodeId" tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="totalRequests"
                  name="Total Requests"
                  fill="#2dd4bf"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="threats"
                  name="Threats"
                  fill="#ef4444"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
