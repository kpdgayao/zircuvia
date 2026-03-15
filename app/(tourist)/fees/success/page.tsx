"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYER_TYPE_LABELS } from "@/lib/fee-constants";
import { useSurveyContext } from "@/components/survey/SurveyProvider";

interface PaymentLine {
  payerType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PaymentInfo {
  id: string;
  referenceId: string;
  totalAmount: number;
  totalPersons: number;
  validUntil: string;
  paidAt: string | null;
  status: string;
  lines: PaymentLine[];
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referenceId = searchParams.get("ref");
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const { markAction } = useSurveyContext();

  useEffect(() => {
    if (!referenceId) return;

    async function fetchPayment() {
      try {
        const res = await fetch("/api/fees");
        if (res.ok) {
          const data = await res.json();
          const found = data.payments?.find(
            (p: PaymentInfo) => p.referenceId === referenceId
          );
          if (found) setPayment(found);
        }
      } catch {
        // Silent fail
      }
    }
    fetchPayment();

    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [referenceId]);

  useEffect(() => {
    if (payment) markAction("fee_payment");
  }, [payment, markAction]);

  const handleEmailInvoice = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <div className="space-y-6 pt-4 relative">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20 + 5}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`,
                opacity: 0.8,
                fontSize: `${10 + Math.random() * 8}px`,
              }}
            >
              {["🟢", "🎉", "✨", "💚"][i % 4]}
            </div>
          ))}
        </div>
      )}

      {/* Success indicator */}
      <div className="text-center space-y-2">
        <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="h-8 w-8 text-[#2E7D32]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          Payment Successful!
        </h1>
        <p className="text-sm text-gray-500">
          Your environmental fee has been paid. Keep this receipt for verification.
        </p>
      </div>

      {/* Receipt card */}
      <Card>
        <CardContent className="space-y-4 pt-1">
          {/* Receipt header */}
          <div className="text-center space-y-1 pt-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Official Receipt</p>
            <p className="text-lg font-bold text-gray-900">Zircuvia Environmental Fee</p>
            <p className="text-xs text-gray-500">Puerto Princesa City, Palawan</p>
          </div>

          <Separator />

          {/* Reference & date */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Reference No.</p>
              <p className="font-mono font-semibold text-sm">{referenceId ?? "—"}</p>
            </div>
            {payment?.paidAt && (
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date Paid</p>
                <p className="font-medium text-sm">{formatDate(payment.paidAt)}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Line items */}
          {payment?.lines && payment.lines.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Fee Breakdown
              </p>
              <div className="space-y-1.5">
                {payment.lines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="text-gray-700">
                      <span>{PAYER_TYPE_LABELS[line.payerType] ?? line.payerType}</span>
                      <span className="text-gray-400 ml-1">
                        x{line.quantity} @ {formatCurrency(line.unitPrice)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(line.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Total Paid</span>
            <span className="font-bold text-lg text-[#2E7D32]">
              {payment ? formatCurrency(payment.totalAmount) : "—"}
            </span>
          </div>

          <Separator />

          {/* Validity */}
          {payment && (
            <div className="bg-green-50 rounded-lg p-3 text-center space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Valid Until</p>
              <p className="font-bold text-[#2E7D32] text-lg">
                {formatDate(payment.validUntil)}
              </p>
              <p className="text-xs text-gray-500">
                {payment.totalPersons} person{payment.totalPersons !== 1 ? "s" : ""} covered
              </p>
            </div>
          )}

          {/* Receipt stamp */}
          <div className="text-center pt-1 pb-2">
            <div className="inline-block border-2 border-[#2E7D32] border-dashed rounded-lg px-4 py-1.5 rotate-[-2deg]">
              <p className="text-[#2E7D32] font-bold text-xs uppercase tracking-widest">Paid</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        {payment && (
          <Button
            className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
            size="lg"
            onClick={() => router.push(`/fees/${payment.id}`)}
          >
            View Full Invoice
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleEmailInvoice}
        >
          Email Receipt
        </Button>

        <Button
          variant="ghost"
          className="w-full text-gray-500"
          onClick={() => router.push("/fees")}
        >
          Back to Fees
        </Button>
      </div>

      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          Receipt sent to your email (simulated)
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-gray-500 py-8">Loading...</div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
