"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface FeePayment {
  id: string;
  referenceId: string;
  totalPersons: number;
  totalAmount: number;
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "FAILED";
  validUntil: string;
  paidAt: string | null;
  createdAt: string;
}

export default function FeesPage() {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch("/api/fees");
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments ?? []);
        }
      } catch (err) {
        console.error("Error fetching payments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Fee Payments</h1>
        <Link href="/fees/terms">
          <Button className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white">
            Pay Environmental Fee
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-4xl mb-3">🌿</p>
          <p className="text-sm text-gray-500">No fee payments yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Pay your environmental fee to explore Puerto Princesa.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Link key={payment.id} href={`/fees/${payment.id}`}>
              <Card className="hover:ring-2 hover:ring-[#2E7D32]/20 transition cursor-pointer">
                <CardContent className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-mono text-sm font-semibold">
                      {payment.referenceId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.totalPersons} person(s) &middot;{" "}
                      {formatCurrency(payment.totalAmount)}
                    </p>
                    {payment.status === "ACTIVE" && (
                      <p className="text-xs text-[#2E7D32]">
                        Valid until {formatDate(payment.validUntil)}
                      </p>
                    )}
                    {payment.status === "PENDING" && (
                      <p className="text-xs text-yellow-600">
                        Awaiting payment
                      </p>
                    )}
                    {payment.status === "EXPIRED" && (
                      <p className="text-xs text-gray-400">
                        Expired on {formatDate(payment.validUntil)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={payment.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
