# Verifier UI/UX Audit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the verifier search bug, improve field usability of the checker UI, and add a daily check-in history page.

**Architecture:** Seven tasks matching the audit spec sections. Task 1 is a backend-only bug fix. Tasks 2-3 restructure existing UI. Tasks 4-5 add a new API endpoint and page. Task 6 adds error/edge state handling across both pages. Each task is independently committable.

**Tech Stack:** Next.js 15 (App Router), Prisma ORM, TypeScript, shadcn/ui, lucide-react, Tailwind CSS, sonner (toasts)

**Spec:** `docs/superpowers/specs/2026-03-15-verifier-ux-audit-design.md`

**No test framework** is configured in this project. Verification is done via `npx tsc --noEmit` and manual browser checks.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/checker/search/route.ts` | Modify | Add full-name split search logic |
| `components/search-with-history.tsx` | Modify | Add `autoFocus` prop support |
| `app/(checker)/checker/layout.tsx` | Modify | Restructure header, fetch location, add tab nav |
| `app/(checker)/checker/verify/page.tsx` | Modify | SearchWithHistory, result de-emphasis, detail card UX, error mapping, edge states |
| `app/api/checker/history/route.ts` | Create | History API endpoint for verifier check-ins |
| `app/(checker)/checker/history/page.tsx` | Create | Daily check-in history page |
| `lib/checker-utils.ts` | Create | Shared error mapping and auth check helpers for checker pages |

---

## Chunk 1: Backend Fix + New API

### Task 1: Fix full-name search

**Files:**
- Modify: `app/api/checker/search/route.ts`

- [ ] **Step 1: Add multi-word name splitting to search query**

Replace lines 14-21 in `app/api/checker/search/route.ts` with logic that splits the query on whitespace and adds a combined firstName+lastName condition when 2+ words are present:

```typescript
    const words = q.split(/\s+/);

    const orConditions: object[] = [
      { referenceId: q },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
    ];

    if (words.length >= 2) {
      orConditions.push({
        AND: [
          { user: { firstName: { contains: words[0], mode: "insensitive" } } },
          { user: { lastName: { contains: words[words.length - 1], mode: "insensitive" } } },
        ],
      });
    }

    const results = await prisma.feePayment.findMany({
      where: { OR: orConditions },
```

The `include`, `take`, and `orderBy` clauses remain unchanged.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `app/api/checker/search/route.ts`

- [ ] **Step 3: Commit**

```bash
git add app/api/checker/search/route.ts
git commit -m "fix: support full-name search in checker search API"
```

---

### Task 2: Create history API endpoint

**Files:**
- Create: `app/api/checker/history/route.ts`

- [ ] **Step 1: Create the history route file**

Create `app/api/checker/history/route.ts` with the following content:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "VERIFIER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const verifierProfile = await prisma.verifierProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!verifierProfile) {
      return NextResponse.json({ error: "Verifier profile not found" }, { status: 400 });
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        verifierId: verifierProfile.id,
        verifiedAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        feePayment: {
          select: {
            referenceId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { verifiedAt: "desc" },
    });

    const summary = {
      totalPersons: checkIns.reduce((sum, ci) => sum + ci.totalPersons, 0),
      checkInCount: checkIns.length,
    };

    return NextResponse.json({ summary, checkIns });
  } catch (error) {
    console.error("Checker history error:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `app/api/checker/history/route.ts`

- [ ] **Step 3: Commit**

```bash
git add app/api/checker/history/route.ts
git commit -m "feat: add GET /api/checker/history endpoint for verifier daily check-ins"
```

---

## Chunk 2: Layout + Shared Utilities

### Task 3: Create shared checker utilities

**Files:**
- Create: `lib/checker-utils.ts`

- [ ] **Step 1: Create the checker utilities file**

Create `lib/checker-utils.ts` with error mapping and auth-check helper:

```typescript
import { toast } from "sonner";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Map raw API errors to user-friendly messages. Uses optional payment status for contextual messaging. */
export function mapVerifyError(rawError: string, paymentStatus?: string, validUntil?: string): string {
  if (rawError === "Already checked in today") {
    return "This payment was already verified today. They can check in again tomorrow.";
  }
  if (rawError === "Payment has expired") {
    const dateStr = validUntil ? ` on ${new Date(validUntil).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}` : "";
    return `This payment expired${dateStr}. The visitor needs to purchase a new fee.`;
  }
  if (rawError === "Payment is not active") {
    const status = paymentStatus?.toLowerCase() ?? "inactive";
    return `This payment cannot be verified — its status is ${status}. The visitor may need to complete or repurchase their fee.`;
  }
  if (rawError === "Verifier profile not found") {
    return "Your verifier profile is missing. Contact your administrator.";
  }
  return "Something went wrong. Please try again.";
}

/** Check response for 401/403 and redirect to login. Returns true if redirected. */
export function handleAuthError(res: Response, router: AppRouterInstance): boolean {
  if (res.status === 401 || res.status === 403) {
    toast.error("Session expired. Please sign in again.");
    router.replace("/checker-login");
    return true;
  }
  return false;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add lib/checker-utils.ts
git commit -m "feat: add shared checker error mapping and auth helpers"
```

---

### Task 4: Restructure checker layout with header, location, and tab nav

**Files:**
- Modify: `app/(checker)/checker/layout.tsx`

- [ ] **Step 1: Rewrite the checker layout**

Replace the entire content of `app/(checker)/checker/layout.tsx` with:

```tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SurveyProvider } from "@/components/survey/SurveyProvider";
import { CheckerHeader } from "./checker-header";

export default async function CheckerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "VERIFIER") redirect("/checker-login");

  const profile = await prisma.verifierProfile.findUnique({
    where: { userId: session.userId },
    include: { assignedLocation: { select: { name: true } } },
  });

  const locationName = profile?.assignedLocation?.name ?? null;

  return (
    <SurveyProvider role="VERIFIER" variant="dialog">
      <div className="min-h-screen bg-white flex flex-col items-center">
        <CheckerHeader firstName={session.firstName} locationName={locationName} />
        <main className="w-full max-w-md px-4 py-6">{children}</main>
      </div>
    </SurveyProvider>
  );
}
```

- [ ] **Step 2: Create the CheckerHeader client component**

Create `app/(checker)/checker/checker-header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckerHeaderProps {
  firstName: string;
  locationName: string | null;
}

export function CheckerHeader({ firstName, locationName }: CheckerHeaderProps) {
  const pathname = usePathname();

  const tabs = [
    { href: "/checker/verify", label: "Verify" },
    { href: "/checker/history", label: "History" },
  ];

  return (
    <header className="w-full max-w-md border-b">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-[#2E7D32] text-lg">ZircuVia</h1>
            <p className="text-xs text-gray-500">Visitor Checker — {firstName}</p>
          </div>
          <SignOutButton redirectTo="/checker-login" />
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
          <span className={cn("text-xs", locationName ? "text-gray-500" : "text-gray-400 italic")}>
            {locationName ?? "No location assigned"}
          </span>
        </div>
      </div>
      <nav className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 text-center py-2.5 text-sm font-medium transition-colors",
              pathname === tab.href
                ? "text-[#2E7D32] border-b-2 border-[#2E7D32]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to checker layout files

- [ ] **Step 4: Commit**

```bash
git add "app/(checker)/checker/layout.tsx" "app/(checker)/checker/checker-header.tsx"
git commit -m "feat: restructure checker header with location display and tab navigation"
```

---

## Chunk 3: Verify Page UX Overhaul

### Task 5: Overhaul the verify page

**Files:**
- Modify: `app/(checker)/checker/verify/page.tsx`
- Modify: `components/search-with-history.tsx`

This is the largest task. It covers: SearchWithHistory integration, result de-emphasis, payment detail card improvements, success/error screen improvements, network error handling, session expiry detection, and empty initial state.

- [ ] **Step 1: Add `autoFocus` prop to SearchWithHistory**

In `components/search-with-history.tsx`, add `autoFocus` to the props interface and wire it:

Add to `SearchWithHistoryProps` (line 8-14):
```typescript
interface SearchWithHistoryProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  storageKey?: string;
  autoFocus?: boolean;
}
```

Destructure it in the component (line 18-24):
```typescript
export function SearchWithHistory({
  value,
  onChange,
  onSearch,
  placeholder = "Search…",
  storageKey = "search_history",
  autoFocus = false,
}: SearchWithHistoryProps) {
```

Add a `useEffect` after the existing history-load `useEffect` (after line 36):
```typescript
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
```

- [ ] **Step 2: Rewrite the verify page**

Replace the entire content of `app/(checker)/checker/verify/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add "components/search-with-history.tsx" "app/(checker)/checker/verify/page.tsx"
git commit -m "feat: overhaul verify page with search history, error mapping, and UX improvements"
```

---

## Chunk 4: History Page

### Task 6: Create the check-in history page

**Files:**
- Create: `app/(checker)/checker/history/page.tsx`

- [ ] **Step 1: Create the history page**

Create `app/(checker)/checker/history/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GiveFeedbackButton } from "@/components/survey/GiveFeedbackButton";
import { handleAuthError } from "@/lib/checker-utils";
import { ChevronLeft, ChevronRight, Loader2, WifiOff, ClipboardList } from "lucide-react";

interface HistoryCheckIn {
  id: string;
  verifiedAt: string;
  totalPersons: number;
  feePayment: {
    referenceId: string;
    user: { firstName: string; lastName: string };
  };
}

interface HistorySummary {
  totalPersons: number;
  checkInCount: number;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  return target.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [summary, setSummary] = useState<HistorySummary>({ totalPersons: 0, checkInCount: 0 });
  const [checkIns, setCheckIns] = useState<HistoryCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchHistory = useCallback(async (date: Date) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/checker/history?date=${toDateString(date)}`);
      if (handleAuthError(res, router)) return;
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data.summary);
      setCheckIns(data.checkIns);
    } catch {
      setError(true);
      setSummary({ totalPersons: 0, checkInCount: 0 });
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHistory(currentDate);
  }, [currentDate, fetchHistory]);

  function goToPreviousDay() {
    setCurrentDate((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  }

  function goToNextDay() {
    if (isToday(currentDate)) return;
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Date header + summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-800">
          {formatDateLabel(currentDate)} — {formatFullDate(currentDate)}
        </p>
        {!loading && !error && (
          <p className="text-xs text-gray-500 mt-1">
            {summary.totalPersons} visitor(s) verified &middot; {summary.checkInCount} check-in(s)
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading check-ins...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-8 space-y-3">
          <WifiOff className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-500">Connection error. Check your signal and try again.</p>
          <Button variant="outline" size="sm" onClick={() => fetchHistory(currentDate)}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && checkIns.length === 0 && (
        <div className="text-center py-8">
          <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No check-ins recorded for this day</p>
        </div>
      )}

      {/* Check-in list */}
      {!loading && !error && checkIns.length > 0 && (
        <div className="space-y-2">
          {checkIns.map((ci) => (
            <Card key={ci.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {ci.feePayment.user.firstName} {ci.feePayment.user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ci.totalPersons} person(s) &middot; {ci.feePayment.referenceId}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatTime(ci.verifiedAt)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Day navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={goToPreviousDay}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous Day
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          disabled={isToday(currentDate)}
        >
          Next Day <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Feedback button (moved from header) */}
      <div className="pt-4 border-t">
        <GiveFeedbackButton />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add "app/(checker)/checker/history/page.tsx"
git commit -m "feat: add verifier daily check-in history page"
```

---

### Task 7: Final verification and commit

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No new errors (pre-existing `leaflet.css` error is acceptable)

- [ ] **Step 2: Verify in browser**

Start dev server: `pnpm dev`

Manual checks:
1. Go to `/checker-login` and log in as `verifier@demo.zircuvia.ph` / `Demo2026!`
2. Verify header shows "ZircuVia", verifier name, assigned location, and Verify/History tabs
3. On Verify tab: search input auto-focuses, shows hint text before first search
4. Search "Pedro Reyes" (full name) → should return results
5. Search "Pedro" → should return results
6. Click a non-ACTIVE result → should show dimmed with status note
7. Click an ACTIVE result → should show person count callout, expiry coloring, large checkbox
8. Verify a payment → success screen shows summary with date/time, person count, name, ref ID
9. Click History tab → should show today's check-ins with summary
10. Navigate to previous day → should show empty or previous check-ins
11. "Next Day" button should be disabled when viewing today

- [ ] **Step 3: Push**

```bash
git push
```
