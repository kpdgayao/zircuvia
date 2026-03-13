"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceId = searchParams.get("ref");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!referenceId) {
      setError("Missing payment reference.");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/fees/mock-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referenceId }),
        });

        if (res.ok) {
          router.replace(`/fees/success?ref=${referenceId}`);
        } else {
          const data = await res.json();
          setError(data.error ?? "Payment confirmation failed.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [referenceId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => router.push("/fees")}
            className="text-sm text-[#2E7D32] underline"
          >
            Back to Fees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center space-y-4">
        {/* Spinner */}
        <div className="mx-auto h-10 w-10 border-4 border-gray-200 border-t-[#2E7D32] rounded-full animate-spin" />
        <div>
          <p className="text-sm font-medium text-gray-900">
            Redirecting to Xendit...
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Please wait while we process your payment.
          </p>
        </div>
        {referenceId && (
          <p className="text-xs text-gray-400 font-mono">{referenceId}</p>
        )}
      </div>
    </div>
  );
}
