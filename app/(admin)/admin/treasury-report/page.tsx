"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/date-range-filter";
import { subDays } from "date-fns";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FEE_PRICES, FEE_VALIDITY_DAYS, PAYER_TYPE_LABELS } from "@/lib/fee-constants";
import { Printer } from "lucide-react";

interface TreasuryReport {
  summary: {
    totalRevenue: number;
    totalVisitors: number;
    totalPayments: number;
    collectionRate: number;
  };
  byPayerType: {
    payerType: string;
    count: number;
    unitRate: number;
    totalCollected: number;
    sharePercent: number;
  }[];
  byStatus: {
    status: string;
    transactions: number;
    amount: number;
    percent: number;
  }[];
  recentPayments: {
    referenceId: string;
    payerName: string;
    totalPersons: number;
    totalAmount: number;
    status: string;
    paidAt: string | null;
  }[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Collected (Active)",
  EXPIRED: "Collected (Expired)",
  PENDING: "Pending",
  FAILED: "Failed",
};

export default function TreasuryReportPage() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [report, setReport] = useState<TreasuryReport | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
      const res = await fetch(`/api/reports/treasury?${params.toString()}`);
      if (res.ok) {
        setReport(await res.json());
        setGeneratedAt(
          new Date().toLocaleString("en-PH", {
            dateStyle: "long",
            timeStyle: "short",
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const dateLabel = useMemo(
    () => `${formatDate(dateRange.from)} — ${formatDate(dateRange.to)}`,
    [dateRange]
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Screen-only controls */}
      <div className="print:hidden space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Treasury Report</h1>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-16 text-center print:hidden">
          Generating report...
        </p>
      ) : !report ? (
        <p className="text-sm text-gray-500 py-16 text-center print:hidden">
          Failed to load report data.
        </p>
      ) : (
        <div className="space-y-8 print:space-y-6">
          {/* ===== REPORT HEADER ===== */}
          <div className="text-center border-b-2 border-gray-800 pb-6 print:pb-4">
            <p className="text-sm text-gray-600 uppercase tracking-widest">
              Republic of the Philippines
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              City of Puerto Princesa
            </h2>
            <p className="text-sm text-gray-600">Province of Palawan</p>
            <h3 className="text-lg font-bold text-gray-800 mt-4 uppercase tracking-wide">
              Environmental Fee Collection Report
            </h3>
            <p className="text-sm text-gray-600 mt-1">{dateLabel}</p>
            <p className="text-xs text-gray-400 mt-1">
              Generated: {generatedAt}
            </p>
          </div>

          {/* ===== EXECUTIVE SUMMARY ===== */}
          <section>
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300 pb-1 mb-4">
              I. Executive Summary
            </h4>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg print:bg-white print:border print:border-gray-300">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(report.summary.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase">
                  Total Revenue Collected
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg print:bg-white print:border print:border-gray-300">
                <p className="text-2xl font-bold text-gray-900">
                  {report.summary.totalVisitors.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase">
                  Total Visitors Served
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg print:bg-white print:border print:border-gray-300">
                <p className="text-2xl font-bold text-gray-900">
                  {report.summary.collectionRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase">
                  Collection Rate
                </p>
              </div>
            </div>
          </section>

          {/* ===== REVENUE BY PAYER TYPE ===== */}
          <section>
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300 pb-1 mb-4">
              II. Revenue by Payer Type
            </h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Payer Type
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Visitors
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Unit Rate
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Total Collected
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    % Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.byPayerType.map((row) => (
                  <tr key={row.payerType} className="border-b border-gray-200">
                    <td className="py-2 text-gray-800">
                      {PAYER_TYPE_LABELS[row.payerType] ?? row.payerType}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {formatCurrency(row.unitRate)}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {formatCurrency(row.totalCollected)}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {row.sharePercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400 font-bold">
                  <td className="py-2 text-gray-900">Total</td>
                  <td className="py-2 text-right text-gray-900">
                    {report.summary.totalVisitors.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-gray-900">—</td>
                  <td className="py-2 text-right text-gray-900">
                    {formatCurrency(report.summary.totalRevenue)}
                  </td>
                  <td className="py-2 text-right text-gray-900">100%</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* ===== COLLECTION STATUS ===== */}
          <section>
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300 pb-1 mb-4">
              III. Collection Status
            </h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Transactions
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.byStatus.map((row) => (
                  <tr key={row.status} className="border-b border-gray-200">
                    <td className="py-2 text-gray-800">
                      {STATUS_LABELS[row.status] ?? row.status}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {row.transactions.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {row.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ===== FEE SCHEDULE REFERENCE ===== */}
          <section>
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300 pb-1 mb-4">
              IV. Fee Schedule Reference
            </h4>
            <table className="w-full text-sm border-collapse max-w-md">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Rate (PHP)
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(FEE_PRICES).map(([type, price]) => (
                  <tr key={type} className="border-b border-gray-200">
                    <td className="py-2 text-gray-800">
                      {PAYER_TYPE_LABELS[type] ?? type}
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      {formatCurrency(price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2 italic">
              Validity: {FEE_VALIDITY_DAYS} days from date of payment. Non-transferable.
            </p>
          </section>

          {/* ===== RECENT TRANSACTIONS ===== */}
          <section className="print:break-before-page">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300 pb-1 mb-4">
              V. Recent Transactions
            </h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Reference ID
                  </th>
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Payer
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Persons
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="text-center py-2 font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Date Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.recentPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-gray-400 italic"
                    >
                      No transactions in selected period.
                    </td>
                  </tr>
                ) : (
                  report.recentPayments.map((p) => (
                    <tr
                      key={p.referenceId}
                      className="border-b border-gray-200"
                    >
                      <td className="py-1.5 text-gray-800 font-mono text-xs">
                        {p.referenceId}
                      </td>
                      <td className="py-1.5 text-gray-800">{p.payerName}</td>
                      <td className="py-1.5 text-right text-gray-800">
                        {p.totalPersons}
                      </td>
                      <td className="py-1.5 text-right text-gray-800">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="py-1.5 text-center text-gray-800">
                        {p.status}
                      </td>
                      <td className="py-1.5 text-right text-gray-800">
                        {p.paidAt ? formatDate(p.paidAt) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          {/* ===== FOOTER ===== */}
          <footer className="border-t-2 border-gray-800 pt-4 mt-8 text-center">
            <p className="text-xs text-gray-500">
              Per City Ordinance No. 1058, Series of 2017
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Generated by ZircuVia Environmental Management System
            </p>

            {/* Signature lines for print */}
            <div className="hidden print:grid print:grid-cols-2 print:gap-16 print:mt-12 print:text-sm">
              <div className="text-center">
                <div className="border-b border-gray-400 mb-1 pt-8" />
                <p className="text-gray-600">Prepared by</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 mb-1 pt-8" />
                <p className="text-gray-600">Noted by</p>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
