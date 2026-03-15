"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PAYER_TYPE_LABELS } from "@/lib/fee-constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Search, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useSurveyContext } from "@/components/survey/SurveyProvider";

interface PaymentLine {
  id: string;
  payerType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface CheckInRecord {
  verifiedAt: string;
}

interface PaymentResult {
  id: string;
  referenceId: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "FAILED";
  totalPersons: number;
  totalAmount: number;
  paidAt: string | null;
  validUntil: string;
  user: { firstName: string; lastName: string };
  lines: PaymentLine[];
  checkIns: CheckInRecord[];
}

export default function VerifyPage() {
  const { markAction } = useSurveyContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaymentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setSelectedPayment(null);
    setChecked(false);
    setVerifyResult(null);

    try {
      const res = await fetch(`/api/checker/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
      markAction("fee_scan");
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function selectPayment(payment: PaymentResult) {
    setSelectedPayment(payment);
    setChecked(false);
    setVerifyResult(null);
  }

  async function handleVerify() {
    if (!selectedPayment) return;
    setVerifying(true);
    setConfirmOpen(false);

    try {
      const res = await fetch("/api/checker/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feePaymentId: selectedPayment.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setVerifyResult({ success: false, message: data.error || "Verification failed" });
      } else {
        setVerifyResult({ success: true, message: "Payment Verified" });
        markAction("check_in");
      }
    } catch {
      setVerifyResult({ success: false, message: "Verification failed" });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Reference ID or payer name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={loading} className="bg-[#2E7D32] hover:bg-[#1B5E20]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </form>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Checking database...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No results found for &quot;{query}&quot;</p>
        </div>
      )}

      {!loading && results.length > 0 && !selectedPayment && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{results.length} result(s) found</p>
          {results.map((payment) => (
            <Card
              key={payment.id}
              className="cursor-pointer hover:shadow-md transition"
              onClick={() => selectPayment(payment)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {payment.user.firstName} {payment.user.lastName}
                  </span>
                  <StatusBadge status={payment.status} />
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Ref: {payment.referenceId}</p>
                  <p>{payment.totalPersons} person(s) &middot; {formatCurrency(payment.totalAmount)}</p>
                  {payment.paidAt && <p>Paid: {formatDate(payment.paidAt)}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPayment && !verifyResult && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {selectedPayment.user.firstName} {selectedPayment.user.lastName}
              </h3>
              <StatusBadge status={selectedPayment.status} />
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="text-gray-400">Reference:</span> {selectedPayment.referenceId}</p>
              {selectedPayment.paidAt && (
                <p><span className="text-gray-400">Date Paid:</span> {formatDate(selectedPayment.paidAt)}</p>
              )}
              <p><span className="text-gray-400">Valid Until:</span> {formatDate(selectedPayment.validUntil)}</p>
              <p><span className="text-gray-400">Total:</span> {formatCurrency(selectedPayment.totalAmount)}</p>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Payer Breakdown</p>
              <div className="space-y-1">
                {selectedPayment.lines.map((line) => (
                  <div key={line.id} className="flex justify-between text-sm">
                    <span>{PAYER_TYPE_LABELS[line.payerType] || line.payerType} x{line.quantity}</span>
                    <span>{formatCurrency(line.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedPayment.checkIns.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Previous Check-ins</p>
                {selectedPayment.checkIns.map((ci, i) => (
                  <p key={i} className="text-xs text-gray-500">{formatDate(ci.verifiedAt)}</p>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 accent-[#2E7D32]"
                />
                <span className="text-sm">I have checked and verified the visitor(s)</span>
              </label>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPayment(null);
                    setChecked(false);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!checked || verifying}
                  className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Verification"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {verifyResult && (
        <div className="text-center py-8 space-y-3">
          {verifyResult.success ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-[#2E7D32] mx-auto" />
              <h3 className="text-lg font-bold text-[#2E7D32]">{verifyResult.message}</h3>
              <p className="text-sm text-gray-500">
                {selectedPayment?.totalPersons} person(s) verified for{" "}
                {selectedPayment?.user.firstName} {selectedPayment?.user.lastName}
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h3 className="text-lg font-bold text-red-600">{verifyResult.message}</h3>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedPayment(null);
              setChecked(false);
              setVerifyResult(null);
              setResults([]);
              setSearched(false);
              setQuery("");
            }}
          >
            New Search
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Verification"
        description="This will be recorded. They can only check in again the next day."
        onConfirm={handleVerify}
        confirmLabel="Verify"
      />
    </div>
  );
}
