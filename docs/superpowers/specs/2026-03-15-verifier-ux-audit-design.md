# Verifier UI/UX Audit — Design Spec

**Date:** 2026-03-15
**Scope:** Completeness audit + best practices review for verifier (checker) UI
**Timeline:** Immediate — fix critical issues now, ship improvements soon
**Environment:** Mobile phone in the field + tablet at desk (must serve both)

---

## Context

The verifier role is a field-worker tool. Verifiers stand at checkpoints (docks, park entrances, terminals) and verify that visitors have paid their environmental fee. The current UI consists of three screens: checker-login, a header layout, and a single verify page with search-and-confirm flow.

### Audit Findings

1. **Critical bug:** Full-name search fails (e.g. "Pedro Reyes" returns nothing)
2. **No work visibility:** Verifiers cannot see their daily check-in count or history
3. **Poor error guidance:** Network failures look like empty results; verification errors show raw strings
4. **Suboptimal field usability:** Small touch targets, no search history, no location context in header
5. **Missing edge state handling:** No session expiry detection, no initial guidance

---

## Section 1: Search Fix (Critical Bug)

### Problem

The search API (`app/api/checker/search/route.ts`) matches the full query string against `firstName` and `lastName` separately. Typing "Pedro Reyes" matches neither field because firstName is "Pedro" and lastName is "Reyes".

### Solution

Split the query on whitespace. When the query contains 2+ words, add a combined condition matching the first word against firstName AND the last word against lastName. Keep existing single-string conditions so partial names still work.

**Query: "Pedro Reyes"** produces OR conditions:
- `referenceId === "Pedro Reyes"` (exact match, unlikely)
- `firstName contains "Pedro Reyes"` (won't match, harmless)
- `lastName contains "Pedro Reyes"` (won't match, harmless)
- **NEW:** `firstName contains "Pedro" AND lastName contains "Reyes"` (matches)

Single-word queries continue working as-is. Backend-only change.

### Files Changed

- `app/api/checker/search/route.ts`

---

## Section 2: Header & Layout Improvements

### Problem

- Sign-out and feedback buttons stacked vertically in center, wasting space
- No indication of verifier's assigned location
- No navigation between views (needed once history tab is added)

### Solution

Restructure the checker layout header:

```
┌─────────────────────────────────────┐
│  ZircuVia                    [Sign Out]
│  Visitor Checker — Pedro
│  📍 Sabang Sea Ferry Terminal
├─────────────────────────────────────┤
│  [ Verify ]    [ History ]          │
├─────────────────────────────────────┤
│  (page content)                     │
└─────────────────────────────────────┘
```

- **Sign-out** moves to top-right, inline with branding
- **Assigned location** shown below verifier name. The location comes from `VerifierProfile.assignedLocation`, which is a `Business` record — display `business.name`. Shows "No location assigned" in muted text if none set.
- **Tab navigation** with two items: "Verify" (`/checker/verify`) and "History" (`/checker/history`)
- **Give Feedback button** moves out of header into the history page
- Maintains `max-w-md` centered layout
- **`/checker` redirect** (`app/(checker)/checker/page.tsx`) continues redirecting to `/checker/verify` — this is the default tab

### Data Requirement

The layout needs the verifier's assigned location name. The layout is a server component with access to `getSession()`. Query `prisma.verifierProfile.findUnique({ where: { userId }, include: { assignedLocation: { select: { name: true } } } })` and render the `assignedLocation.name` server-side in the header.

### Files Changed

- `app/(checker)/checker/layout.tsx` — restructure header, add tab nav, fetch assigned location

---

## Section 3: Verify Page UX Improvements

### 3a. Search Input

- Replace the plain `Input` + separate search `Button` with the existing `SearchWithHistory` component (already used in admin logs page). `SearchWithHistory` has its own built-in `<form>` and search icon, so the current outer `<form>` wrapper and standalone search `<Button>` must be removed to avoid nesting forms or duplicating the icon.
- `SearchWithHistory` accepts `value`, `onChange`, `onSearch`, and `placeholder` props. Wire `onSearch` to the existing search logic (minus the form event, since `SearchWithHistory` calls `onSearch(query)` directly with the trimmed string).
- Add `autoFocus` via a `useEffect` + `useRef` on mount — `SearchWithHistory` exposes an `inputRef` internally but does not accept an `autoFocus` prop, so focus programmatically after mount.
- Update placeholder: "Search by name or reference ID"
- Storage key: `"checker_search_history"`

### 3b. Search Results List

- **De-emphasize non-verifiable results.** Payments with status other than ACTIVE get `opacity-60` and a note like "Cannot verify — expired" or "Cannot verify — pending"
- Show `validUntil` date in the result card so verifiers can see expiry without tapping in

### 3c. Payment Detail Card

- **Expiry urgency treatment:** If `validUntil` is today, show in amber/orange text. If already past, show in red. Otherwise default gray.
- **Larger touch target for checkbox:** Replace native checkbox with a full-width tappable row (min 48x48px touch target per WCAG mobile guidelines) or the shadcn/ui `Checkbox` component which is larger than native. Current native checkbox is too small for field use on mobile.
- **Prominent person count:** Display `totalPersons` as a large callout (e.g. large number with "persons" label) rather than buried in a text line. This is the primary thing the verifier is physically checking.

### 3d. Success/Error Result Screen

**Success screen** should show a summary of what was recorded:
- Date and time of verification
- Person count
- Payer name
- Reference ID

**Error screen** should show actionable human-readable guidance:

| Raw error | User-facing message |
|-----------|-------------------|
| "Already checked in today" | "This payment was already verified today. They can check in again tomorrow." |
| "Payment has expired" | "This payment expired on [date]. The visitor needs to purchase a new fee." |
| "Payment is not active" | "This payment cannot be verified. Its status is [PENDING/EXPIRED/FAILED] — the visitor may need to complete or repurchase their fee." |
| "Verifier profile not found" | "Your verifier profile is missing. Contact your administrator." |
| Generic/network error | "Something went wrong. Please try again." |

**Note:** The API checks `status !== "ACTIVE"` before checking date expiry. This means "Payment is not active" can be triggered by PENDING, EXPIRED, or FAILED statuses. The user-facing message should not assume "pending" — it should be general or, ideally, include the actual status. The verify page already has the payment's status from the search results, so display it contextually.

### Files Changed

- `app/(checker)/checker/verify/page.tsx`

---

## Section 4: Today's Check-ins (New Page)

### Problem

Verifiers have zero visibility into their own work. They cannot answer "how many visitors did I verify today?" or review what they've already processed.

### Solution

New page at `/checker/history` showing a daily activity log.

```
┌─────────────────────────────────────┐
│  Today — March 15, 2026            │
│  12 visitors verified  ·  8 check-ins│
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ Pedro Reyes         10:15 AM   ││
│  │ 3 persons  ·  REF-20260312-001 ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Maria Santos         9:30 AM   ││
│  │ 2 persons  ·  REF-20260311-004 ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
│  [  ← Previous Day  ]   [ Next → ] │
```

- **Summary bar:** Total persons verified + total check-in count for the selected day
- **Chronological list:** Most recent first. Shows payer name, person count, reference ID, verification time
- **Day navigation:** Previous/next day buttons. No full calendar needed
- **Read-only** — no actions, just visibility
- **Give Feedback button** placed here (moved from header)

### New API Endpoint

`GET /api/checker/history?date=2026-03-15`

- Requires VERIFIER role (check both 401 for no session and 403 for wrong role)
- Fetches CheckIn records for the logged-in verifier's VerifierProfile on the given date
- Includes related FeePayment (referenceId, totalPersons) and User (firstName, lastName)
- Defaults to today if no date parameter
- "Next" button disabled when viewing today (cannot navigate to future dates)
- No lower bound on past navigation (verifiers may need to check older records)
- Loading state: `Loader2` spinner with "Loading check-ins..." text (same pattern as verify page)

**Response shape:**

```json
{
  "summary": { "totalPersons": 12, "checkInCount": 8 },
  "checkIns": [
    {
      "id": "clx...",
      "verifiedAt": "2026-03-15T10:15:00Z",
      "totalPersons": 3,
      "feePayment": {
        "referenceId": "REF-20260312-001",
        "user": { "firstName": "Pedro", "lastName": "Reyes" }
      }
    }
  ]
}
```

### Files Created

- `app/(checker)/checker/history/page.tsx`
- `app/api/checker/history/route.ts`

---

## Section 5: Error & Edge State Handling

### 5a. Network Error Handling

- **Search failures:** Distinguish "no matches" from "search failed". Currently, a network error silently results in "No results found". On fetch error, show: "Connection error. Check your signal and try again." with a retry button.
- **Verify failures:** Do not reset the selected payment on error. Keep the payment detail card visible so the verifier can retry without re-searching.

### 5b. Session Expiry Detection

If any API call returns 401 or 403, show a toast: "Session expired. Please sign in again." and redirect to `/checker-login`. A 403 can occur if the verifier's role is changed while they are logged in. Implement as a check in the existing fetch calls within the verify and history pages (no need for a global wrapper given the small number of fetch calls).

### 5c. Empty Initial State

When the verify page first loads (before any search), show an instructional hint below the search bar: "Enter a visitor's name or payment reference ID to verify their fee." This hint disappears once the first search is performed (tracked by existing `searched` state).

### Files Changed

- `app/(checker)/checker/verify/page.tsx`
- `app/(checker)/checker/history/page.tsx` (network error handling)

---

## Design Conventions

All changes follow existing codebase patterns:
- Green accent: `#2E7D32` (primary actions, branding)
- Centered layout: `max-w-md` container
- Components: shadcn/ui (Button, Card, Input, Badge, Dialog)
- Icons: lucide-react
- Loading states: `Loader2` spinner with gray helper text
- Empty states: centered gray text with contextual icon
- Toasts: sonner `toast.error()` / `toast.success()`

---

## Out of Scope

The following were considered but deferred:
- Offline-first PWA with service worker caching (note: PWA infrastructure work is in progress separately — see `components/pwa-register.tsx`, `public/sw.js`, `app/offline/`)
- QR code scanning for payments
- Shift-based sessions with auto-logout
- Push notifications from admin
- Full analytics dashboard for verifiers
