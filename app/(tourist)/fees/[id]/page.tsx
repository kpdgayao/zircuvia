"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceView } from "@/components/invoice-view";
import { ChevronLeft } from "lucide-react";

interface FeePaymentLine {
  payerType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface FeePaymentDetail {
  id: string;
  referenceId: string;
  totalAmount: number;
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "FAILED";
  validUntil: string;
  paidAt: string | null;
  createdAt: string;
  lines: FeePaymentLine[];
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<FeePaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayment() {
      try {
        const res = await fetch(`/api/fees/${id}`);
        if (!res.ok) {
          setError("Payment not found.");
          return;
        }
        const data = await res.json();
        setPayment(data.payment);
      } catch {
        setError("Failed to load payment.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchPayment();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">{error ?? "Payment not found."}</p>
        <Button
          variant="ghost"
          className="mt-4 text-[#2E7D32]"
          onClick={() => router.push("/fees")}
        >
          Back to Fees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/fees")}
        className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Fees
      </button>

      <h1 className="text-lg font-bold text-gray-900">Invoice</h1>

      <Card>
        <CardContent>
          <InvoiceView
            referenceId={payment.referenceId}
            status={payment.status}
            validFrom={payment.paidAt ?? payment.createdAt}
            validUntil={payment.validUntil}
            lines={payment.lines}
            totalAmount={payment.totalAmount}
            paidAt={payment.paidAt}
          />
        </CardContent>
      </Card>
    </div>
  );
}
