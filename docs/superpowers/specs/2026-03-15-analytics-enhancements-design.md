# Analytics Enhancements Design

**Date:** 2026-03-15
**Scope:** Enhance existing admin Visits page and verifier History page with basic analytics

## Context

The admin Visits page (`/admin/visits`) currently shows 3 stat cards (Total Visitors, Total Collected, Unique Payments), a Payer Type Breakdown table, and a Top 5 Places table. It has a DateRangeFilter with presets (7d, 30d, 3mo, 6mo, custom) and CSV export. No charts exist on this page.

The verifier History page (`/checker/history`) shows a day-by-day check-in log with date navigation (prev/next day), a summary (total persons, check-in count), and a list of individual check-in cards. No weekly/monthly context is provided.

The codebase already uses recharts (v3.8.0) on the admin feedback page with BarChart and PieChart patterns. Brand green is `#2E7D32`.

## Changes

### 1. Admin Visits Page — Daily Visitor Volume Chart

**API change** (`app/api/visits/stats/route.ts`):
- Add `dailyVolume` field to the response
- Query: Group `CheckIn` records by `checkDate` within the date range, sum `totalPersons` per day
- Date filter: `{ checkDate: { gte: fromDate, lte: toDate } }` — converts the from/to params to CheckIn.checkDate filter
- Response shape: `dailyVolume: { date: string; visitors: number }[]`
- Sort by date ascending
- Empty state: if no data, return empty array; UI conditionally renders chart only when `dailyVolume.length > 0`

**UI change** (`app/(admin)/admin/visits/page.tsx`):
- Add a full-width Card titled "Daily Visitor Volume" between the stat cards row and the existing tables
- Contains a `ResponsiveContainer` (height 300) with a recharts `BarChart`
- XAxis: date labels (formatted as "Mar 15" via date-fns `format(date, "MMM d")`)
- YAxis: visitor count
- Bar fill: `#2E7D32`, radius `[4, 4, 0, 0]`
- CartesianGrid with `strokeDasharray="3 3"`
- Tooltip showing date and visitor count
- Update the `VisitStats` interface to include `dailyVolume`

### 2. Admin Visits Page — Verifier Activity Comparison

**API change** (`app/api/visits/stats/route.ts`):
- Add `verifierActivity` field to the response
- The existing top-5 verifier groupBy query already runs — extend it to return verifier name and location name instead of just mapping to `topPlaces`
- Date filter: apply the same `{ checkDate: { gte: fromDate, lte: toDate } }` filter (fixes existing bug where this query was unfiltered)
- Prisma include: `{ user: { select: { firstName: true, lastName: true } }, assignedLocation: { select: { name: true } } }`
- Response shape: `verifierActivity: { name: string; location: string; visitors: number }[]`
- Keep top 5 by visitor count descending
- Remove `topPlaces` and `visitsByCategory` from the response (both unused in the UI)

**UI change** (`app/(admin)/admin/visits/page.tsx`):
- Replace the "Top 5 Places" table card with a "Verifier Activity" card
- Contains a `ResponsiveContainer` (height 250) with a horizontal recharts `BarChart` (layout="vertical")
- YAxis: verifier names (type="category", dataKey="name", width=120)
- XAxis: visitor count (type="number")
- Bar fill: `#2E7D32`, radius `[0, 4, 4, 0]` (horizontal bars)
- Tooltip showing verifier name, location, and visitor count
- Update `VisitStats` interface: replace `topPlaces` with `verifierActivity`

### 3. Verifier History Page — Weekly Summary

**API change** (`app/api/checker/history/route.ts`):
- Add `weeklySummary` field to the response
- Query: Find all CheckIns for the current verifier in the current ISO week (Monday–Sunday), using `checkDate` (date-only field, avoids timezone issues)
- Compute: `totalPersons` (sum), `checkInCount`, `dailyAverage` (totalPersons / days elapsed in week inclusive of today, e.g. Wednesday = 3), `todayVsAverage` ("above" | "below" | "equal")
- The weekly summary always reflects the current calendar week, independent of the date navigator selection. The "Today" card always shows today's actual data.
- Response shape: `weeklySummary: { totalPersons: number; checkInCount: number; dailyAverage: number; todayVsAverage: "above" | "below" | "equal" }`

**UI change** (`app/(checker)/checker/history/page.tsx`):
- Add a row of 3 stat cards above the existing date navigator
- Card 1: "This Week" — `weeklySummary.totalPersons` visitors, icon Users
- Card 2: "Daily Average" — `weeklySummary.dailyAverage` (rounded to 1 decimal), icon TrendingUp
- Card 3: "Today" — today's `summary.totalPersons` with a subtle colored indicator (green up arrow if above average, red down arrow if below, gray dash if equal), icon CalendarCheck
- Uses the standard Card + CardHeader + CardContent stat card pattern
- Grid: `grid-cols-1 sm:grid-cols-3 gap-3`

## Files Modified

1. `app/api/visits/stats/route.ts` — add dailyVolume and verifierActivity queries
2. `app/(admin)/admin/visits/page.tsx` — add BarChart for daily volume, replace Top 5 Places with Verifier Activity chart
3. `app/api/checker/history/route.ts` — add weeklySummary computation
4. `app/(checker)/checker/history/page.tsx` — add weekly summary stat cards

## No New Files

All changes are enhancements to existing files. No new components or API routes needed.

## Dependencies

- recharts (already installed, v3.8.0)
- date-fns (already installed, used for date formatting)
- lucide-react (already installed, for icons)
