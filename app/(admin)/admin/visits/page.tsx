"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { subDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { PAYER_TYPE_LABELS } from "@/lib/fee-constants";
import { CATEGORY_LABELS } from "@/lib/business-constants";
import { Users, Receipt, MapPin, Download } from "lucide-react";

interface VisitStats {
  totalPayments: number;
  totalVisitors: number;
  totalAmount: number;
  breakdown: { payerType: string; persons: number; amount: number }[];
  topPlaces: { name: string; category: string; visitors: number }[];
  visitsByCategory: { category: string; visitors: number }[];
}

export default function AdminVisitsPage() {
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
      const res = await fetch(`/api/visits/stats?${params.toString()}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("format", "csv");
    params.set("from", dateRange.from.toISOString());
    params.set("to", dateRange.to.toISOString());
    window.open(`/api/export/visits?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visitor Statistics</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Visitors</CardTitle>
                <Users className="h-5 w-5 text-[#2E7D32]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">{stats.totalPayments} fee payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Collected</CardTitle>
                <Receipt className="h-5 w-5 text-[#2E7D32]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
                <p className="text-xs text-gray-500 mt-1">Environmental fees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Unique Payments</CardTitle>
                <Receipt className="h-5 w-5 text-[#2E7D32]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPayments.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Transactions</p>
              </CardContent>
            </Card>
          </div>

          {/* Payer Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payer Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payer Type</TableHead>
                    <TableHead className="text-right">Persons</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.breakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-6">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.breakdown.map((row) => (
                      <TableRow key={row.payerType}>
                        <TableCell className="font-medium">
                          {PAYER_TYPE_LABELS[row.payerType] ?? row.payerType}
                        </TableCell>
                        <TableCell className="text-right">{row.persons.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top 5 Places */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <MapPin className="h-5 w-5 text-[#2E7D32]" />
              <CardTitle className="text-base">Top 5 Places by Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Place</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topPlaces.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-6">
                        No check-in data
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.topPlaces.map((place, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{place.name}</TableCell>
                        <TableCell>{CATEGORY_LABELS[place.category] ?? place.category}</TableCell>
                        <TableCell className="text-right">{place.visitors.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-gray-500 py-8 text-center">Failed to load statistics.</p>
      )}
    </div>
  );
}
