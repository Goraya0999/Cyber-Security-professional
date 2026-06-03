import { useState, useCallback } from "react";
import { Search, Filter, RefreshCw } from "lucide-react";
import { useGetLogs, getGetLogsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LogTable } from "@/components/LogTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LogStatus = "all" | "benign" | "malicious";

export default function Logs() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LogStatus>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const queryClient = useQueryClient();

  const params = { page, pageSize, status, search: search || undefined };

  const { data, isLoading, isFetching } = useGetLogs(params, {
    query: {
      queryKey: getGetLogsQueryKey(params),
      refetchInterval: 5000,
    },
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value as LogStatus);
    setPage(1);
  }, []);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetLogsQueryKey(params) });
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Network Logs</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? (
              <>
                <span className="font-mono text-foreground">{data.total.toLocaleString()}</span> total records
              </>
            ) : (
              "Loading..."
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          data-testid="button-refresh-logs"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search IPs, protocols, data..."
            value={search}
            onChange={handleSearch}
            className="pl-9 font-mono text-sm"
            data-testid="input-search-logs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36" data-testid="select-log-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="benign">Benign</SelectItem>
              <SelectItem value="malicious">Malicious</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <LogTable logs={data?.logs} isLoading={isLoading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground font-mono">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
