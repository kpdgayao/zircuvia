"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data-table";
import { SearchWithHistory } from "@/components/search-with-history";
import { DateRangeFilter } from "@/components/date-range-filter";
import { StatusBadge } from "@/components/status-badge";
import { subDays } from "date-fns";
import { Users, Receipt, TrendingUp, Download } from "lucide-react";

interface FeeStats {
  totalPayments: number;
  totalVisitors: number;
  totalAmount: number;
  breakdown: { payerType: string; persons: number; amount: number }[];
}

interface PaymentRow extends Record<string, unknown> {
  id: string;
  referenceId: string;
  totalPersons: number;
  totalAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

const PAYER_LABELS: Record<string, string> = {
  REGULAR_TOURIST: "Regular Tourist",
  PALAWENO: "Palaweno / Palawan Resident",
  STUDENT: "Student",
  SENIOR_CITIZEN: "Senior Citizen",
  PWD: "Person with Disability",
};

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function AdminFeesPage() {
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
      const res = await fetch(`/api/fees/stats?${params.toString()}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // ignore
    }
  }, [dateRange]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/fees/logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPayments(json.payments ?? []);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    params.set("format", "csv");
    params.set("from", dateRange.from.toISOString());
    params.set("to", dateRange.to.toISOString());
    window.open(`/api/export/fees?${params.toString()}`, "_blank");
  };

  const columns: Column<PaymentRow>[] = [
    { key: "referenceId", label: "Reference" },
    {
      key: "user",
      label: "Payer",
      render: (row) => `${row.user.firstName} ${row.user.lastName}`,
    },
    { key: "totalPersons", label: "Persons" },
    {
      key: "totalAmount",
      label: "Amount",
      render: (row) => formatCurrency(row.totalAmount),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.status as "ACTIVE" | "PENDING" | "EXPIRED" | "FAILED"} />
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) =>
        new Date(row.createdAt).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Environmental Fee Reports</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Visitors</CardTitle>
            <Users className="h-5 w-5 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.totalVisitors.toLocaleString() : "..."}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats ? `${stats.totalPayments} payments` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Collected</CardTitle>
            <Receipt className="h-5 w-5 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalAmount) : "..."}
            </div>
            <p className="text-xs text-gray-500 mt-1">Environmental fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Per Payment</CardTitle>
            <TrendingUp className="h-5 w-5 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && stats.totalPayments > 0
                ? formatCurrency(stats.totalAmount / stats.totalPayments)
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Payer Type */}
      {stats && stats.breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown by Payer Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {stats.breakdown.map((b) => (
                <div key={b.payerType} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 truncate">
                    {PAYER_LABELS[b.payerType] ?? b.payerType}
                  </p>
                  <p className="text-lg font-bold mt-1">{b.persons.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(b.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <SearchWithHistory
              value={search}
              onChange={setSearch}
              onSearch={setSearchQuery}
              placeholder="Search by reference ID..."
              storageKey="admin_fee_search"
            />
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : (
            <DataTable<PaymentRow>
              columns={columns}
              data={payments}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              emptyMessage="No fee payments found."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
