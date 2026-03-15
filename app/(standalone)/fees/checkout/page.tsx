"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { PAYER_TYPE_LABELS } from "@/lib/fee-constants";

interface PaymentLine {
  payerType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PaymentData {
  id: string;
  referenceId: string;
  totalAmount: number;
  totalPersons: number;
  lines: PaymentLine[];
}

type PaymentMethod = "card" | "gcash" | "maya";
type CheckoutStep = "method" | "details" | "processing" | "error";

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: string; desc: string }[] = [
  { id: "card", name: "Credit / Debit Card", icon: "💳", desc: "Visa, Mastercard, JCB" },
  { id: "gcash", name: "GCash", icon: "🟢", desc: "Pay with GCash e-wallet" },
  { id: "maya", name: "Maya", icon: "🟣", desc: "Pay with Maya e-wallet" },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceId = searchParams.get("ref");

  const [step, setStep] = useState<CheckoutStep>("method");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Card form state (demo only)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // Fetch payment data
  useEffect(() => {
    if (!referenceId) {
      setError("Missing payment reference.");
      setStep("error");
      return;
    }

    async function fetchPayment() {
      try {
        const res = await fetch("/api/fees");
        if (res.ok) {
          const data = await res.json();
          const found = data.payments?.find(
            (p: PaymentData) => p.referenceId === referenceId
          );
          if (found) {
            setPayment(found);
          } else {
            setError("Payment not found.");
            setStep("error");
          }
        } else {
          setError("Failed to load payment details.");
          setStep("error");
        }
      } catch {
        setError("Something went wrong.");
        setStep("error");
      } finally {
        setLoading(false);
      }
    }
    fetchPayment();
  }, [referenceId]);

  // Format card number with spaces
  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  // Format expiry as MM/YY
  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const isCardFormValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardExpiry.length === 5 &&
    cardCvc.length >= 3 &&
    cardName.trim().length > 0;

  const isEwalletReady = method === "gcash" || method === "maya";

  const canPay =
    method !== null && (method === "card" ? isCardFormValid : isEwalletReady);

  const handlePay = async () => {
    if (!referenceId) return;
    setStep("processing");

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const res = await fetch("/api/fees/mock-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId }),
      });

      if (res.ok) {
        // Brief pause to show "approved" feel
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.replace(`/fees/success?ref=${referenceId}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Payment confirmation failed.");
        setStep("error");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("error");
    }
  };

  // --- Error state ---
  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
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

  // --- Processing state ---
  if (step === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 border-4 border-gray-200 border-t-[#2E7D32] rounded-full animate-spin" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Processing payment...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Please do not close this window.
            </p>
          </div>
          {referenceId && (
            <p className="text-xs text-gray-400 font-mono">{referenceId}</p>
          )}
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <div className="mx-auto h-10 w-10 border-4 border-gray-200 border-t-[#2E7D32] rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // --- Main checkout UI ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Zircuvia Payment Gateway</p>
            <p className="text-sm font-medium mt-0.5">Environmental Fee</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Amount Due</p>
            <p className="text-xl font-bold">{payment ? formatCurrency(payment.totalAmount) : "—"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Order summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Order Summary</p>
            <p className="text-xs text-gray-400 font-mono">{referenceId}</p>
          </div>

          {payment?.lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {PAYER_TYPE_LABELS[line.payerType] ?? line.payerType} x{line.quantity}
              </span>
              <span className="text-gray-900 font-medium">{formatCurrency(line.lineTotal)}</span>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-bold text-[#2E7D32]">
              {payment ? formatCurrency(payment.totalAmount) : "—"}
            </span>
          </div>
        </div>

        {/* Payment method selection */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Select Payment Method
          </p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.id}
                onClick={() => {
                  setMethod(pm.id);
                  setStep("details");
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition text-left ${
                  method === pm.id
                    ? "border-[#2E7D32] bg-green-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">{pm.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{pm.name}</p>
                  <p className="text-xs text-gray-500">{pm.desc}</p>
                </div>
                {method === pm.id && (
                  <svg className="h-5 w-5 text-[#2E7D32]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Card form (only for card method) */}
        {method === "card" && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Card Details
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Card Number</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent font-mono"
                  maxLength={19}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="MARIA SANTOS"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent font-mono"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">CVC</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent font-mono"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Demo mode — no real charges will be made
            </p>
          </div>
        )}

        {/* E-wallet confirmation */}
        {(method === "gcash" || method === "maya") && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 text-center">
            <div className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center text-2xl ${
              method === "gcash" ? "bg-blue-50" : "bg-purple-50"
            }`}>
              {method === "gcash" ? "🟢" : "🟣"}
            </div>
            <p className="text-sm text-gray-700">
              You will be redirected to <span className="font-semibold">{method === "gcash" ? "GCash" : "Maya"}</span> to complete your payment of{" "}
              <span className="font-bold text-[#2E7D32]">{payment ? formatCurrency(payment.totalAmount) : "—"}</span>.
            </p>
            <p className="text-xs text-gray-400">
              Demo mode — no real charges will be made
            </p>
          </div>
        )}

        {/* Pay button */}
        {method && (
          <button
            onClick={handlePay}
            disabled={!canPay}
            className={`w-full py-3 rounded-lg text-white font-semibold text-sm transition ${
              canPay
                ? "bg-[#2E7D32] hover:bg-[#1B5E20] active:scale-[0.98]"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {method === "card"
              ? `Pay ${payment ? formatCurrency(payment.totalAmount) : ""}`
              : `Continue to ${method === "gcash" ? "GCash" : "Maya"}`}
          </button>
        )}

        {/* Cancel */}
        <button
          onClick={() => router.push("/fees")}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Cancel Payment
        </button>

        {/* Security footer */}
        <div className="text-center pt-2 pb-4">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secured by Zircuvia Payment Gateway (Demo)
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
          Loading...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
