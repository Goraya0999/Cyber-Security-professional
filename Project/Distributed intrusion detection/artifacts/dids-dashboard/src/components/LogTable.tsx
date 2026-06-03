import type { NetworkLog } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface LogTableProps {
  logs?: NetworkLog[];
  isLoading?: boolean;
  showConfidence?: boolean;
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90 ? "bg-emerald-500" :
    pct >= 70 ? "bg-teal-500" :
    pct >= 50 ? "bg-yellow-500" : "bg-red-400";

  return (
    <div className="flex items-center gap-2 min-w-[72px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

export function LogTable({ logs, isLoading, showConfidence = true }: LogTableProps) {
  const colCount = showConfidence ? 8 : 7;

  if (isLoading) {
    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Source IP</TableHead>
              <TableHead>Dest IP</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              {showConfidence && <TableHead>Confidence</TableHead>}
              <TableHead className="text-right">Bytes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: colCount }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
        <p className="font-mono text-sm">No logs found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Source IP</TableHead>
            <TableHead>Dest IP</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            {showConfidence && <TableHead>Confidence</TableHead>}
            <TableHead className="text-right">Bytes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              key={log.id}
              data-testid={`row-log-${log.id}`}
              className={log.status === "malicious" ? "bg-red-500/5 hover:bg-red-500/10" : ""}
            >
              <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </TableCell>
              <TableCell className="font-mono text-xs">{log.sourceIp}</TableCell>
              <TableCell className="font-mono text-xs">{log.destinationIp}</TableCell>
              <TableCell>
                <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">{log.protocol}</span>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground max-w-[220px] truncate" title={log.data}>
                {log.data}
              </TableCell>
              <TableCell>
                <Badge
                  variant={log.status === "malicious" ? "destructive" : "secondary"}
                  className="uppercase text-[10px] font-bold"
                  data-testid={`badge-status-${log.id}`}
                >
                  {log.status}
                </Badge>
              </TableCell>
              {showConfidence && (
                <TableCell>
                  <ConfidenceBar score={log.confidenceScore} />
                </TableCell>
              )}
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {log.bytesSent.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
