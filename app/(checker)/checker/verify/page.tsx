"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SearchWithHistory } from "@/components/search-with-history";
import { PAYER_TYPE_LABELS } from "@/lib/fee-constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { mapVerifyError, handleAuthError } from "@/lib/checker-utils";
import { CheckCircle2, AlertCircle, Loader2, Users, WifiOff, Info } from "lucide-react";
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

function getExpiryColor(validUntil: string): string {
  const expiry = new Date(validUntil);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  if (expiryDay < today) return "text-red-600";
  if (expiryDay.getTime() === today.getTime()) return "text-amber-600";
  return "text-gray-600";
}

function getStatusNote(status: string): string | null {
  if (status === "ACTIVE") return null;
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return `Cannot verify — ${label}`;
}

export default function VerifyPage() {
  const router = useRouter();
  const { markAction } = useSurveyContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaymentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSearch(q: string) {
    setQuery(q);
    setLoading(true);
    setSearched(true);
    setSearchError(false);
    setSelectedPayment(null);
    setChecked(false);
    setVerifyResult(null);

    try {
      const res = await fetch(`/api/checker/search?q=${encodeURIComponent(q)}`);
      if (handleAuthError(res, router)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
      markAction("fee_scan");
    } catch {
      setResults([]);
      setSearchError(true);
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
      if (handleAuthError(res, router)) return;
      const data = await res.json();

      if (!res.ok) {
        const message = mapVerifyError(
          data.error || "Verification failed",
          selectedPayment.status,
          selectedPayment.validUntil,
        );
        setVerifyResult({ success: false, message });
      } else {
        setVerifyResult({ success: true, message: "Payment Verified" });
        markAction("check_in");
      }
    } catch {
      setVerifyResult({ success: false, message: "Connection error. Check your signal and try again." });
    } finally {
      setVerifying(false);
    }
  }

  function resetAll() {
    setSelectedPayment(null);
    setChecked(false);
    setVerifyResult(null);
    setResults([]);
    setSearched(false);
    setSearchError(false);
    setQuery("");
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <SearchWithHistory
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        placeholder="Search by name or reference ID"
        storageKey="checker_search_history"
        autoFocus
      />

      {/* Initial hint */}
      {!searched && !loading && (
        <div className="text-center py-8">
          <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Enter a visitor&apos;s name or payment reference ID to verify their fee
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Checking database...</p>
        </div>
      )}

      {/* Network error */}
      {!loading && searched && searchError && (
        <div className="text-center py-8 space-y-3">
          <WifiOff className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-500">Connection error. Check your signal and try again.</p>
          <Button variant="outline" size="sm" onClick={() => handleSearch(query)}>
            Retry
          </Button>
        </div>
      )}

      {/* No results */}
      {!loading && searched && !searchError && results.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No results found for &quot;{query}&quot;</p>
        </div>
      )}

      {/* Results list */}
      {!loading && results.length > 0 && !selectedPayment && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{results.length} result(s) found</p>
          {results.map((payment) => {
            const note = getStatusNote(payment.status);
            return (
              <Card
                key={payment.id}
                className={`cursor-pointer hover:shadow-md transition ${note ? "opacity-60" : ""}`}
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
                    <p>Valid until: {formatDate(payment.validUntil)}</p>
                    {payment.paidAt && <p>Paid: {formatDate(payment.paidAt)}</p>}
                  </div>
                  {note && <p className="text-xs text-amber-600 font-medium">{note}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment detail */}
      {selectedPayment && !verifyResult && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {selectedPayment.user.firstName} {selectedPayment.user.lastName}
              </h3>
              <StatusBadge status={selectedPayment.status} />
            </div>

            {/* Person count callout */}
            <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
              <Users className="w-8 h-8 text-[#2E7D32]" />
              <div>
                <span className="text-2xl font-bold text-[#2E7D32]">{selectedPayment.totalPersons}</span>
                <span className="text-sm text-gray-600 ml-1.5">person(s)</span>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="text-gray-400">Reference:</span> {selectedPayment.referenceId}</p>
              {selectedPayment.paidAt && (
                <p><span className="text-gray-400">Date Paid:</span> {formatDate(selectedPayment.paidAt)}</p>
              )}
              <p>
                <span className="text-gray-400">Valid Until:</span>{" "}
                <span className={getExpiryColor(selectedPayment.validUntil)}>
                  {formatDate(selectedPayment.validUntil)}
                </span>
              </p>
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
              <button
                type="button"
                onClick={() => setChecked(!checked)}
                className="flex items-center gap-3 w-full p-3 rounded-lg border transition min-h-[48px] cursor-pointer hover:bg-gray-50"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${checked ? "bg-[#2E7D32] border-[#2E7D32]" : "border-gray-300"}`}>
                  {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm text-left">I have checked and verified the visitor(s)</span>
              </button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setSelectedPayment(null); setChecked(false); }}
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

      {/* Verify result */}
      {verifyResult && (
        <div className="text-center py-8 space-y-3">
          {verifyResult.success ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-[#2E7D32] mx-auto" />
              <h3 className="text-lg font-bold text-[#2E7D32]">{verifyResult.message}</h3>
              <div className="text-sm text-gray-500 space-y-0.5">
                <p>{selectedPayment?.totalPersons} person(s) verified</p>
                <p>{selectedPayment?.user.firstName} {selectedPayment?.user.lastName}</p>
                <p>Ref: {selectedPayment?.referenceId}</p>
                <p>{new Date().toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h3 className="text-lg font-bold text-red-600">Verification Failed</h3>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">{verifyResult.message}</p>
            </>
          )}
          <Button variant="outline" onClick={resetAll}>
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
