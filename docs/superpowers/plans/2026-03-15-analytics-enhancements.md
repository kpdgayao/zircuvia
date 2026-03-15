# Analytics Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily visitor volume chart and verifier activity chart to admin Visits page, plus weekly summary stats to verifier History page.

**Architecture:** Enhance two existing API routes with new query fields and update two existing page components with recharts charts and stat cards. No new files needed.

**Tech Stack:** Next.js, Prisma, recharts 3.8, date-fns, lucide-react, shadcn UI Card/Table components.

**Spec:** `docs/superpowers/specs/2026-03-15-analytics-enhancements-design.md`

---

## Chunk 1: Admin Visits API — dailyVolume and verifierActivity

### Task 1: Add dailyVolume and verifierActivity to visits stats API

**Files:**
- Modify: `app/api/visits/stats/route.ts`

- [ ] **Step 1: Add dailyVolume query to the parallel Promise.all**

In `app/api/visits/stats/route.ts`, add a 4th query to the existing `Promise.all` array. Also build a `checkInDateFilter` from the `from`/`to` params to filter CheckIn by `checkDate`:

```typescript
// After line 24 (const paidAtFilter = ...)
const checkInDateFilter: Prisma.CheckInWhereInput = paidAtFilter
  ? { checkDate: { gte: paidAtFilter.gte, lte: paidAtFilter.lte } }
  : {};
```

Add to the Promise.all (rename `topPlacesRaw` destructure to `verifierRaw`):

```typescript
const [aggregates, breakdownRaw, verifierRaw, dailyVolumeRaw] = await Promise.all([
  // ... existing aggregates query (unchanged)
  // ... existing breakdownRaw query (unchanged)
  prisma.checkIn.groupBy({
    by: ["verifierId"],
    where: checkInDateFilter,  // <-- add date filter (was missing)
    _sum: { totalPersons: true },
    orderBy: { _sum: { totalPersons: "desc" } },
    take: 5,
  }),
  prisma.checkIn.groupBy({
    by: ["checkDate"],
    where: checkInDateFilter,
    _sum: { totalPersons: true },
    orderBy: { checkDate: "asc" },
  }),
]);
```

- [ ] **Step 2: Transform dailyVolume and verifierActivity data**

Replace the existing `topPlaces` and `visitsByCategory` transformation (lines 56-89) with:

```typescript
// Daily volume
const dailyVolume = dailyVolumeRaw.map((row) => ({
  date: row.checkDate.toISOString().slice(0, 10),
  visitors: row._sum.totalPersons ?? 0,
}));

// Verifier activity
const verifierIds = verifierRaw.map((v) => v.verifierId);
const verifiers =
  verifierIds.length > 0
    ? await prisma.verifierProfile.findMany({
        where: { id: { in: verifierIds } },
        include: {
          user: { select: { firstName: true, lastName: true } },
          assignedLocation: { select: { name: true } },
        },
      })
    : [];

const verifierMap = Object.fromEntries(verifiers.map((v) => [v.id, v]));

const verifierActivity = verifierRaw.map((item) => {
  const verifier = verifierMap[item.verifierId];
  const name = verifier
    ? `${verifier.user.firstName} ${verifier.user.lastName}`
    : "Unknown";
  return {
    name,
    location: verifier?.assignedLocation?.name ?? "Unassigned",
    visitors: item._sum.totalPersons ?? 0,
  };
});
```

- [ ] **Step 3: Update the JSON response**

Replace the return statement to use the new fields and remove `topPlaces`/`visitsByCategory`:

```typescript
return NextResponse.json({
  totalPayments: aggregates._count,
  totalVisitors: aggregates._sum.totalPersons ?? 0,
  totalAmount: aggregates._sum.totalAmount ?? 0,
  breakdown,
  dailyVolume,
  verifierActivity,
});
```

- [ ] **Step 4: Verify the API compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors in `app/api/visits/stats/route.ts`

- [ ] **Step 5: Commit**

```bash
git add app/api/visits/stats/route.ts
git commit -m "feat: add dailyVolume and verifierActivity to visits stats API"
```

---

## Chunk 2: Admin Visits Page — Charts UI

### Task 2: Add charts to admin visits page

**Files:**
- Modify: `app/(admin)/admin/visits/page.tsx`

- [ ] **Step 1: Update imports and VisitStats interface**

Replace the imports and interface at the top of `app/(admin)/admin/visits/page.tsx`:

Add recharts imports:
```typescript
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
```

Remove `MapPin` from lucide imports (no longer needed), add `BarChart3`:
```typescript
import { Users, Receipt, BarChart3, Download } from "lucide-react";
```

Remove `CATEGORY_LABELS` import (no longer needed).

Update the `VisitStats` interface — replace `topPlaces` and `visitsByCategory` with:
```typescript
interface VisitStats {
  totalPayments: number;
  totalVisitors: number;
  totalAmount: number;
  breakdown: { payerType: string; persons: number; amount: number }[];
  dailyVolume: { date: string; visitors: number }[];
  verifierActivity: { name: string; location: string; visitors: number }[];
}
```

- [ ] **Step 2: Add Daily Visitor Volume chart card**

After the closing `</div>` of the stats cards grid (after line 109), add the daily volume chart card:

```tsx
{/* Daily Visitor Volume Chart */}
{stats.dailyVolume.length > 0 && (
  <Card>
    <CardHeader className="flex flex-row items-center gap-2">
      <BarChart3 className="h-5 w-5 text-[#2E7D32]" />
      <CardTitle className="text-base">Daily Visitor Volume</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={stats.dailyVolume}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
            fontSize={12}
          />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip
            labelFormatter={(d: string) => format(parseISO(d), "MMM d, yyyy")}
            formatter={(value: number | string) => [Number(value).toLocaleString(), "Visitors"]}
          />
          <Bar dataKey="visitors" fill="#2E7D32" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: Replace Top 5 Places table with Verifier Activity chart**

Replace the entire "Top 5 Places" Card (lines 148-182) with:

```tsx
{/* Verifier Activity */}
<Card>
  <CardHeader className="flex flex-row items-center gap-2">
    <Users className="h-5 w-5 text-[#2E7D32]" />
    <CardTitle className="text-base">Verifier Activity</CardTitle>
  </CardHeader>
  <CardContent>
    {stats.verifierActivity.length === 0 ? (
      <p className="text-center text-gray-500 py-6">No check-in data</p>
    ) : (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={stats.verifierActivity} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            fontSize={12}
          />
          <Tooltip
            formatter={(value: number | string) => [Number(value).toLocaleString(), "Visitors"]}
            labelFormatter={(name: string) => {
              const v = stats.verifierActivity.find((a) => a.name === name);
              return v ? `${name} — ${v.location}` : name;
            }}
          />
          <Bar dataKey="visitors" fill="#2E7D32" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </CardContent>
</Card>
```

- [ ] **Step 4: Verify the page compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors in `app/(admin)/admin/visits/page.tsx`

- [ ] **Step 5: Commit**

```bash
git add "app/(admin)/admin/visits/page.tsx"
git commit -m "feat: add daily volume and verifier activity charts to admin visits page"
```

---

## Chunk 3: Verifier History API — weeklySummary

### Task 3: Add weeklySummary to checker history API

**Files:**
- Modify: `app/api/checker/history/route.ts`

- [ ] **Step 1: Add weekly summary query**

After the existing `checkIns` query and `summary` computation (after line 41), add the weekly summary logic. First, compute the Monday of the current week and today's date:

```typescript
// Weekly summary (always current week, independent of browsed date)
const now = new Date();
const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
const monday = new Date(now);
monday.setDate(monday.getDate() - mondayOffset);
monday.setHours(0, 0, 0, 0);

const sunday = new Date(monday);
sunday.setDate(sunday.getDate() + 6);
sunday.setHours(23, 59, 59, 999);

const weekCheckIns = await prisma.checkIn.findMany({
  where: {
    verifier: { userId: session.userId },
    checkDate: { gte: monday, lte: sunday },
  },
  select: { totalPersons: true, checkDate: true },
});

const weekTotalPersons = weekCheckIns.reduce((sum, ci) => sum + ci.totalPersons, 0);
const daysElapsed = mondayOffset + 1; // inclusive of today (Mon=1, Tue=2, ..., Sun=7)
const dailyAverage = daysElapsed > 0 ? Math.round((weekTotalPersons / daysElapsed) * 10) / 10 : 0;

// Today's total from the browsed-day summary (if browsing today) or from week data
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const todayPersons = weekCheckIns
  .filter((ci) => {
    const d = new Date(ci.checkDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === todayStr;
  })
  .reduce((sum, ci) => sum + ci.totalPersons, 0);

const todayVsAverage: "above" | "below" | "equal" =
  todayPersons > dailyAverage ? "above" : todayPersons < dailyAverage ? "below" : "equal";

const weeklySummary = {
  totalPersons: weekTotalPersons,
  checkInCount: weekCheckIns.length,
  dailyAverage,
  todayPersons,
  todayVsAverage,
};
```

- [ ] **Step 2: Update the response to include weeklySummary**

```typescript
return NextResponse.json({ summary, checkIns, weeklySummary });
```

- [ ] **Step 3: Verify the API compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors in `app/api/checker/history/route.ts`

- [ ] **Step 4: Commit**

```bash
git add app/api/checker/history/route.ts
git commit -m "feat: add weeklySummary to checker history API"
```

---

## Chunk 4: Verifier History Page — Weekly Summary UI

### Task 4: Add weekly summary stat cards to verifier history page

**Files:**
- Modify: `app/(checker)/checker/history/page.tsx`

- [ ] **Step 1: Update imports and add WeeklySummary interface**

Add new lucide icons and Card imports:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// CardHeader and CardTitle are new additions to the existing Card import
```

Add icons to the existing lucide import:
```typescript
import {
  ChevronLeft, ChevronRight, Loader2, WifiOff, ClipboardList,
  Users, TrendingUp, CalendarCheck, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
```

Add the `WeeklySummary` interface after `HistorySummary`:
```typescript
interface WeeklySummary {
  totalPersons: number;
  checkInCount: number;
  dailyAverage: number;
  todayPersons: number;
  todayVsAverage: "above" | "below" | "equal";
}
```

- [ ] **Step 2: Add weeklySummary state and update fetch**

Add state after the existing `error` state:
```typescript
const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
```

In the `fetchHistory` callback, after `setCheckIns(data.checkIns)`, add:
```typescript
setWeeklySummary(data.weeklySummary ?? null);
```

- [ ] **Step 3: Add weekly summary stat cards to the JSX**

Insert the following immediately after the opening `<div className="space-y-4">` (before the date header):

```tsx
{/* Weekly Summary */}
{weeklySummary && (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-gray-500">This Week</CardTitle>
        <Users className="h-4 w-4 text-[#2E7D32]" />
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="text-xl font-bold">{weeklySummary.totalPersons}</div>
        <p className="text-[10px] text-gray-400">{weeklySummary.checkInCount} check-in(s)</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-gray-500">Daily Average</CardTitle>
        <TrendingUp className="h-4 w-4 text-[#2E7D32]" />
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="text-xl font-bold">{weeklySummary.dailyAverage}</div>
        <p className="text-[10px] text-gray-400">visitors / day</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-gray-500">Today</CardTitle>
        <CalendarCheck className="h-4 w-4 text-[#2E7D32]" />
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold">{weeklySummary.todayPersons}</span>
          {weeklySummary.todayVsAverage === "above" && (
            <ArrowUp className="h-4 w-4 text-green-600" />
          )}
          {weeklySummary.todayVsAverage === "below" && (
            <ArrowDown className="h-4 w-4 text-red-500" />
          )}
          {weeklySummary.todayVsAverage === "equal" && (
            <Minus className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <p className="text-[10px] text-gray-400">vs. daily average</p>
      </CardContent>
    </Card>
  </div>
)}
```

- [ ] **Step 4: Verify the page compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors in `app/(checker)/checker/history/page.tsx`

- [ ] **Step 5: Commit**

```bash
git add "app/(checker)/checker/history/page.tsx"
git commit -m "feat: add weekly summary stats to verifier history page"
```

---

## Chunk 5: Final verification

### Task 5: Verify everything works together

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run dev server and smoke test**

Run: `npm run dev`
Navigate to:
- `/admin/visits` — should show stat cards, daily volume bar chart, payer breakdown table, and verifier activity horizontal bar chart
- `/checker/history` — should show weekly summary stat cards above the date header, then the existing day navigation and check-in list

- [ ] **Step 3: Final commit if any fixes needed**

Only if type errors or rendering issues were found and fixed.
