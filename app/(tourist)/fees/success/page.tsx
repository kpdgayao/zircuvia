"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface PaymentInfo {
  id: string;
  referenceId: string;
  validUntil: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referenceId = searchParams.get("ref");
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

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
        // Silent fail — the success page is mainly cosmetic
      }
    }
    fetchPayment();
  }, [referenceId]);

  const handleEmailInvoice = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <div className="space-y-6 pt-4">
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
          Thank you for paying the Environmental Fee.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Reference ID
            </p>
            <p className="font-mono font-semibold text-sm">
              {referenceId ?? "—"}
            </p>
          </div>

          {payment && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Valid Until
              </p>
              <p className="font-semibold text-[#2E7D32]">
                {formatDate(payment.validUntil)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {payment && (
          <Button
            className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
            size="lg"
            onClick={() => router.push(`/fees/${payment.id}`)}
          >
            View Invoice
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleEmailInvoice}
        >
          Email Invoice
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
          Invoice sent to your email (simulated)
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-gray-500 py-8">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
