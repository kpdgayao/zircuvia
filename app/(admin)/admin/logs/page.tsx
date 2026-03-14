"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { SearchWithHistory } from "@/components/search-with-history";
import { ScrollText } from "lucide-react";

interface LogRow extends Record<string, unknown> {
  id: string;
  action: string;
  description: string;
  userId: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs ?? []);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const columns: Column<LogRow>[] = [
    {
      key: "createdAt",
      label: "Timestamp",
      render: (row) =>
        new Date(row.createdAt).toLocaleString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
          {row.action}
        </span>
      ),
    },
    { key: "description", label: "Description" },
    {
      key: "targetType",
      label: "Target",
      render: (row) =>
        row.targetType ? (
          <span className="text-xs text-gray-500">
            {row.targetType}
            {row.targetId ? ` (${row.targetId.slice(0, 8)}...)` : ""}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "userId",
      label: "User ID",
      render: (row) => (
        <span className="text-xs text-gray-500 font-mono">
          {row.userId.slice(0, 8)}...
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-[#2E7D32]" />
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <SearchWithHistory
              value={search}
              onChange={setSearch}
              onSearch={setSearchQuery}
              placeholder="Search by action or description..."
              storageKey="admin_logs_search"
            />
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : (
            <DataTable<LogRow>
              columns={columns}
              data={logs}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              emptyMessage="No system logs found."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
