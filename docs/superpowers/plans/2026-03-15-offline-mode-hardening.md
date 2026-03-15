# Offline Mode Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ZircuVia's offline experience robust — users should always see cached content, get clear feedback when offline, and have mutations (saves, reviews) queued for sync on reconnect.

**Architecture:** A shared `useOnlineStatus()` hook provides global network state. An `OfflineQueue` utility (localStorage-based, matching the existing SurveyProvider pattern) handles mutation queuing. Each page/component is updated to use these primitives for graceful degradation. The service worker adds Stale-While-Revalidate for key API routes.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Sonner (toast), Tailwind CSS, Service Worker (custom), localStorage

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `hooks/use-online-status.ts` | React hook wrapping `navigator.onLine` + `online`/`offline` events |
| `lib/offline-queue.ts` | Generic localStorage queue with flush-on-reconnect (mirrors SurveyProvider pattern) |
| `components/offline-indicator.tsx` | Floating banner shown when offline |

### Modified Files
| File | Change |
|------|--------|
| `public/sw.js` | Add Stale-While-Revalidate for `/api/saved` and `/api/businesses`; add fetch timeout |
| `app/(tourist)/layout.tsx` | Add Toaster + OfflineIndicator |
| `app/(tourist)/saved/page.tsx` | Fix infinite loading; add error state + retry |
| `app/(tourist)/listings/[id]/business-actions.tsx` | Queue saves offline with toast feedback |
| `app/(tourist)/listings/[id]/review-form.tsx` | Queue reviews offline with toast feedback |
| `app/(tourist)/map/page.tsx` | Show cached markers + offline-aware error state |
| `app/(tourist)/listings/page.tsx` | Add error state + retry for offline |
| `app/(tourist)/fees/pay/page.tsx` | Disable submit when offline with clear message |

---

## Chunk 1: Foundation — Hook, Queue, Indicator

### Task 1: Create `useOnlineStatus` hook

**Files:**
- Create: `hooks/use-online-status.ts`

- [ ] **Step 1: Create the hook**

```typescript
// hooks/use-online-status.ts
"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/zircuvia-mock/zircuvia" && npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add hooks/use-online-status.ts
git commit -m "feat(offline): add useOnlineStatus hook with useSyncExternalStore"
```

---

### Task 2: Create `OfflineQueue` utility

**Files:**
- Create: `lib/offline-queue.ts`

- [ ] **Step 1: Create the offline queue utility**

This mirrors the proven SurveyProvider pattern (localStorage + online event flush) but is generic and reusable.

```typescript
// lib/offline-queue.ts

export interface QueuedAction {
  id: string;
  endpoint: string;
  method: string;
  body?: unknown;
  queuedAt: number;
}

const QUEUE_KEY = "zv_offline_queue";
const MAX_QUEUED = 50;

export function queueAction(action: Omit<QueuedAction, "id" | "queuedAt">): void {
  try {
    const pending: QueuedAction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]"
    );
    if (pending.length >= MAX_QUEUED) return;
    // Deduplicate: remove existing action with same endpoint+method (prevents toggle thrashing)
    const deduped = pending.filter(
      (a) => !(a.endpoint === action.endpoint && a.method === action.method)
    );
    deduped.push({
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      queuedAt: Date.now(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(deduped));
  } catch {
    // localStorage unavailable
  }
}

export function getPendingCount(): number {
  try {
    const pending: QueuedAction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]"
    );
    return pending.length;
  } catch {
    return 0;
  }
}

export async function flushQueue(): Promise<number> {
  let synced = 0;
  try {
    const pending: QueuedAction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]"
    );
    if (pending.length === 0) return 0;

    const remaining: QueuedAction[] = [];
    for (const action of pending) {
      try {
        const res = await fetch(action.endpoint, {
          method: action.method,
          headers: action.body
            ? { "Content-Type": "application/json" }
            : undefined,
          body: action.body ? JSON.stringify(action.body) : undefined,
        });
        if (res.ok) {
          synced++;
        } else {
          remaining.push(action);
        }
      } catch {
        remaining.push(action);
      }
      // Rate limit: 300ms between requests
      await new Promise((r) => setTimeout(r, 300));
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // silent
  }
  return synced;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/offline-queue.ts
git commit -m "feat(offline): add generic localStorage offline queue utility"
```

---

### Task 3: Create `OfflineIndicator` component

**Files:**
- Create: `components/offline-indicator.tsx`

- [ ] **Step 1: Create the offline indicator component**

```typescript
// components/offline-indicator.tsx
"use client";

import { useEffect } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { flushQueue, getPendingCount } from "@/lib/offline-queue";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isOnline) {
      const count = getPendingCount();
      if (count > 0) {
        toast.promise(flushQueue(), {
          loading: `Syncing ${count} pending action${count > 1 ? "s" : ""}...`,
          success: (synced) =>
            synced > 0
              ? `Synced ${synced} action${synced > 1 ? "s" : ""}`
              : "All caught up",
          error: "Some actions failed to sync",
        });
      }
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-14 left-0 right-0 z-40 flex items-center justify-center gap-2 bg-gray-800 px-4 py-2 text-white text-xs font-medium"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>You&apos;re offline — some features may be limited</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/offline-indicator.tsx
git commit -m "feat(offline): add OfflineIndicator banner with auto-sync on reconnect"
```

---

### Task 4: Add Toaster and OfflineIndicator to tourist layout

**Files:**
- Modify: `app/(tourist)/layout.tsx`

- [ ] **Step 1: Add imports and components to tourist layout**

Add imports at the top of the file (after existing imports):

```typescript
import { Toaster } from "sonner";
import { OfflineIndicator } from "@/components/offline-indicator";
```

Add `<Toaster richColors position="top-center" />` and `<OfflineIndicator />` inside the layout, right after the closing `</header>` tag, before `<main>`:

The modified layout structure should be:

```
<header>...</header>
<OfflineIndicator />
<main>...</main>
<BottomNav />
<Toaster richColors position="top-center" />
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tourist\)/layout.tsx
git commit -m "feat(offline): add Toaster and OfflineIndicator to tourist layout"
```

---

## Chunk 2: Service Worker — Better API Caching

### Task 5: Update service worker with Stale-While-Revalidate for API routes and fetch timeout

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Bump cache version and add SWR helper**

Change `CACHE_VERSION` from `2` to `3` (line 1).

Add a `staleWhileRevalidate` helper function after the `idbGetAll` function (after line 101) and before the fetch event listener:

```javascript
// Stale-While-Revalidate: serve cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  if (cached) {
    // Fire-and-forget: update cache in background
    void fetchPromise;
    return cached;
  }
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;
  return new Response("Offline", { status: 503 });
}
```

- [ ] **Step 2: Replace the `/api/businesses` handler**

Replace the existing `/api/businesses` block (the one with `url.pathname === "/api/businesses"`) with a broader pattern that handles both `/api/businesses` and `/api/saved` with GET:

```javascript
  // API routes: stale-while-revalidate for GET requests
  if (
    request.method === "GET" &&
    (url.pathname === "/api/businesses" || url.pathname === "/api/saved")
  ) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }
```

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat(offline): add stale-while-revalidate for API routes in service worker"
```

---

## Chunk 3: Fix Broken Pages — Saved, Listings, Map

### Task 6: Fix saved page infinite loading

**Files:**
- Modify: `app/(tourist)/saved/page.tsx`

- [ ] **Step 1: Add offline-aware error handling**

Add imports at the top of the file (after existing imports):

```typescript
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";
```

Add inside the component, after the existing state declarations:

```typescript
const isOnline = useOnlineStatus();
const [error, setError] = useState(false);
```

In the `fetchSaved` function inside the `useEffect`, make two changes:

**Change 1:** After the `if (res.ok) { ... }` block, add an `else` to catch server errors. Change:

```typescript
      if (res.ok) {
        setIsSignedIn(true);
        const json = await res.json();
        setBusinesses(json.businesses);
      }
```

To:

```typescript
      if (res.ok) {
        setIsSignedIn(true);
        const json = await res.json();
        setBusinesses(json.businesses);
      } else if (res.status !== 401) {
        setError(true);
      }
```

**Change 2:** Replace the catch block:

```typescript
    } catch (err) {
      console.error("Error fetching saved businesses:", err);
    } finally {
```

To:

```typescript
    } catch {
      setError(true);
    } finally {
```

Add a retry function after the `useEffect`:

```typescript
const retry = () => {
  setError(false);
  setLoading(true);
  fetch("/api/saved")
    .then(async (res) => {
      if (res.status === 401) {
        setIsSignedIn(false);
      } else if (res.ok) {
        setIsSignedIn(true);
        const json = await res.json();
        setBusinesses(json.businesses);
      } else {
        setError(true);
      }
    })
    .catch(() => setError(true))
    .finally(() => setLoading(false));
};
```

Add an error state render block after the loading block (`if (loading) { ... }`) and before the `if (isSignedIn === false)` block:

```typescript
if (error) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Saved Places</h1>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <WifiOff className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-sm text-gray-500 mb-1">
          {isOnline ? "Failed to load saved places" : "You're offline"}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          {isOnline
            ? "Something went wrong. Please try again."
            : "Your saved places will appear when you reconnect."}
        </p>
        {isOnline && (
          <button
            onClick={retry}
            className="rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] transition"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tourist\)/saved/page.tsx
git commit -m "fix(offline): handle fetch errors on saved page with retry button"
```

---

### Task 7: Fix listings page error handling

**Files:**
- Modify: `app/(tourist)/listings/page.tsx`

- [ ] **Step 1: Add error state and retry**

Add import at top of the file:

```typescript
import { useOnlineStatus } from "@/hooks/use-online-status";
```

Inside the `ListingsContent` component (NOT the outer `ListingsPage`), add state near existing state declarations:

```typescript
const isOnline = useOnlineStatus();
const [error, setError] = useState(false);
```

In the `fetchBusinesses` callback, add `setError(false)` right after `setLoading(true)`, and replace the catch block. Change:

```typescript
  } catch (err) {
    console.error("Error fetching businesses:", err);
  } finally {
```

To:

```typescript
  } catch {
    setError(true);
  } finally {
```

Replace the `{/* Results */}` ternary block (lines 138-159 in the current file). The current code is a ternary `loading ? ... : businesses.length === 0 ? ... : ...`. Replace it with conditionals that include an error state:

```tsx
{/* Results */}
{loading ? (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
    ))}
  </div>
) : error && businesses.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <p className="text-sm text-gray-500 mb-1">
      {isOnline ? "Failed to load listings" : "You're offline"}
    </p>
    <p className="text-xs text-gray-400 mb-4">
      {isOnline
        ? "Please try again."
        : "Listings will load when you reconnect."}
    </p>
    {isOnline && (
      <button
        onClick={() => fetchBusinesses()}
        className="rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] transition"
      >
        Try Again
      </button>
    )}
  </div>
) : businesses.length === 0 ? (
  <p className="text-center text-sm text-gray-500 py-12">
    No businesses found.
  </p>
) : (
  <div className="grid grid-cols-2 gap-3">
    {businesses.map((b) => (
      <BusinessCard
        key={b.id}
        business={b}
        onClick={() => router.push(`/listings/${b.id}`)}
      />
    ))}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tourist\)/listings/page.tsx
git commit -m "fix(offline): add error state and retry to listings page"
```

---

### Task 8: Fix map page offline marker loading

**Files:**
- Modify: `app/(tourist)/map/page.tsx`

- [ ] **Step 1: Add offline-aware error message**

Add import at top:

```typescript
import { useOnlineStatus } from "@/hooks/use-online-status";
```

Add inside component:

```typescript
const isOnline = useOnlineStatus();
```

Find the error display section (where `error` state is rendered). Replace the generic error message rendering with an offline-aware version. The error message should say "You're offline — showing cached map tiles" when offline vs "Failed to load businesses" when online. Add a retry button that calls `fetchBusinesses()` when online.

Update the error rendering to:

```tsx
{error && (
  <div className="absolute top-2 left-2 right-2 z-[1000] rounded-lg bg-white/90 backdrop-blur px-3 py-2 text-center shadow">
    <p className="text-xs text-gray-600">
      {isOnline
        ? "Failed to load business markers"
        : "Offline — showing cached map tiles"}
    </p>
    {isOnline && (
      <button
        onClick={() => fetchBusinesses()}
        className="mt-1 text-xs font-medium text-[#2E7D32] hover:underline"
      >
        Retry
      </button>
    )}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tourist\)/map/page.tsx
git commit -m "fix(offline): show offline-aware error for map markers"
```

---

## Chunk 4: Offline Mutation Queuing — Saves and Reviews

### Task 9: Wire up bookmark offline queue

**Files:**
- Modify: `app/(tourist)/listings/[id]/business-actions.tsx`

- [ ] **Step 1: Add offline queue and toast to save button**

Add imports at top:

```typescript
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queueAction } from "@/lib/offline-queue";
```

Add inside the component:

```typescript
const isOnline = useOnlineStatus();
```

Replace the `handleSave` function body (the try/catch inside it). Change:

```typescript
  try {
    const res = await fetch(`/api/saved/${businessId}`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setSaved(data.saved);
    }
  } catch (err) {
    console.error("Save error:", err);
  } finally {
    setLoading(false);
  }
```

To:

```typescript
  try {
    const res = await fetch(`/api/saved/${businessId}`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setSaved(data.saved);
      toast.success(data.saved ? "Saved!" : "Removed from saved");
    }
  } catch {
    // Offline: queue and optimistically update UI
    queueAction({ endpoint: `/api/saved/${businessId}`, method: "POST" });
    setSaved(!saved);
    toast.info("Saved offline — will sync when you reconnect");
  } finally {
    setLoading(false);
  }
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tourist\)/listings/\[id\]/business-actions.tsx
git commit -m "feat(offline): queue bookmark saves offline with optimistic UI"
```

---

### Task 10: Add offline queue to review form

**Files:**
- Modify: `app/(tourist)/listings/[id]/review-form.tsx`

- [ ] **Step 1: Add offline queue and toast to review submission**

Add imports at top:

```typescript
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queueAction } from "@/lib/offline-queue";
```

Add inside the component:

```typescript
const isOnline = useOnlineStatus();
```

Replace the catch block in `handleSubmit`. Change:

```typescript
  } catch {
    setError("Something went wrong. Please try again.");
  } finally {
```

To:

```typescript
  } catch {
    // Offline: queue review for later
    queueAction({
      endpoint: `/api/businesses/${businessId}/reviews`,
      method: "POST",
      body: { rating, text: text.trim() || undefined },
    });
    toast.info("Review saved offline — will submit when you reconnect");
    setSubmitted(true);
    setRating(0);
    setText("");
  } finally {
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tourist\)/listings/\[id\]/review-form.tsx
git commit -m "feat(offline): queue reviews offline with user feedback"
```

---

### Task 11: Disable payment form when offline

**Files:**
- Modify: `app/(tourist)/fees/pay/page.tsx`

- [ ] **Step 1: Add offline guard to payment page**

Add import at top:

```typescript
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";
```

Add inside the component:

```typescript
const isOnline = useOnlineStatus();
```

Find the submit button (it should be a `<button>` or `<Button>` calling `handleSubmit`). Wrap it with an offline check. Add this block right before the submit button:

```tsx
{!isOnline && (
  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500">
    <WifiOff className="h-3.5 w-3.5" />
    <span>Internet connection required for payments</span>
  </div>
)}
```

Add `disabled={!isOnline || loading || totalPersons === 0}` to the submit button (add `!isOnline` to whatever disabled condition already exists).

- [ ] **Step 2: Commit**

```bash
git add app/\(tourist\)/fees/pay/page.tsx
git commit -m "feat(offline): disable payment form when offline with clear message"
```

---

## Chunk 5: Final Integration and Cleanup

### Task 12: Remove dead IndexedDB sync code from service worker

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Remove the background sync event listener and IndexedDB helpers**

Since we're using localStorage-based queuing (matching the project's existing pattern in SurveyProvider), the IndexedDB `sync-saved` infrastructure in the SW is dead code. Remove:

1. The `sync` event listener (lines 52-56)
2. The `syncSavedItems` async function (lines 58-83)
3. The `openSyncDB` function (lines 85-94)
4. The `idbGetAll` function (lines 96-102)

This keeps the SW focused on caching only. All mutation queuing happens in the client via `lib/offline-queue.ts`.

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "refactor(offline): remove dead IndexedDB sync code from service worker"
```

---

### Task 13: Final verification

- [ ] **Step 1: Build check**

Run: `cd "C:/Users/ASUS TUF/Projects/zircuvia-mock/zircuvia" && npx next build 2>&1 | grep -E "Compil|error"`
Expected: "Compiled successfully"

- [ ] **Step 2: Verify all new files exist**

Run: `ls hooks/use-online-status.ts lib/offline-queue.ts components/offline-indicator.tsx`

- [ ] **Step 3: Verify no broken imports**

Run: `grep -r "use-online-status\|offline-queue\|offline-indicator" --include="*.tsx" --include="*.ts" -l`

Expected: All files that import these should resolve correctly.

- [ ] **Step 4: Final commit with all remaining changes**

Only if there are unstaged fixes from verification:

```bash
git add -A
git commit -m "chore(offline): final verification fixes"
```
