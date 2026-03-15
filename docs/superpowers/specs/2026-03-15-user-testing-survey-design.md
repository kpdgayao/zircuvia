# User Testing Survey System — Design Spec

**Date:** 2026-03-15
**Status:** Implemented
**Purpose:** Collect structured user feedback across all three roles (Tourist, Admin, Verifier) during demo testing to inform the 2nd iteration. Data must be presentable to stakeholders in formal reports.

---

## Context

ZircuVia is a Next.js 15 PWA for eco-tourism management in Puerto Princesa with three user roles: Tourist, Admin, and Verifier. This version is a demo aimed at collecting feedback. Test users (20-50 expected) will participate in both guided sessions and unguided exploration, using shared demo accounts per role.

### Constraints

- Shared demo accounts: multiple users per role share a single login
- Must work offline (PWA)
- Surveys must never block user workflows
- Data must be exportable for stakeholder reports (CSV)
- All surveys built into the app flow — no external triggers or facilitator controls
- Fully native implementation using existing stack (no third-party survey tools)

---

## 1. Data Model

A single new Prisma model stores all survey responses:

```prisma
model SurveyResponse {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  role            Role
  participantName String?
  surveyType      String
  triggerPoint    String
  responses       Json
  createdAt       DateTime @default(now())
}
```

**Required change to existing `User` model:** Add `surveyResponses SurveyResponse[]` back-relation field.

### Field Rationale

- **`responses` as JSON:** Stores an array of `{ questionId, questionText, type, value }`. Flexible enough for different question types without a join table. Performant at this scale (20-50 users).
- **`role` on the response:** Captured at submission time from the JWT session, not derived from User relation — important because shared demo accounts mean role is contextual.
- **`participantName` optional:** Self-reported identifier (e.g., "Tester #3") assigned by facilitator. Allows distinguishing individuals on shared accounts. Skippable.
- **No `Survey` definition table:** Survey configurations are hardcoded in TypeScript. This is a demo — a survey builder UI is unnecessary scope.

---

## 2. Survey Definitions

All surveys defined in `lib/survey-config.ts` as a static configuration array.

### Types

```typescript
type SurveyQuestion = {
  id: string
  text: string
  type: "rating" | "likert" | "nps" | "yes_no" | "yes_no_partial" | "multi_select" | "text"
  options?: string[]
  required: boolean
  showIf?: "previous_positive" | "previous_negative"
  // showIf semantics:
  //   "previous_negative" → show if prior answer is: rating <= 2, "No", or "Partially"
  //   "previous_positive" → show if prior answer is: rating >= 4, "Yes"
  //   Rating of 3 is treated as neutral and does NOT trigger either condition
}

type SurveyConfig = {
  id: string
  surveyType: "micro" | "session"
  triggerPoint: string
  role: Role | "ALL"
  title: string
  questions: SurveyQuestion[]
  cooldownMinutes: number
  maxShowsPerDay: number
}
```

### Micro-Surveys (1-2 questions each)

| Trigger Point | Role | Q1 (Quantitative) | Q2 (Qualitative, conditional) |
|---|---|---|---|
| `fee_payment` | TOURIST | "How easy was it to pay your environmental fee?" (1-5 rating) | "What would you improve?" (text) |
| `business_review` | TOURIST | "Was the review process straightforward?" (yes/no) | "What was confusing?" (text, shown if no) |
| `business_search` | TOURIST | "Did you find what you were looking for?" (yes/no/partially) | "What were you looking for?" (text, shown if no/partially) |
| `business_detail` | TOURIST | "Was this information helpful?" (yes/no) | "What's missing?" (text, shown if no) |
| `eco_certification` | ADMIN | "How efficient was this workflow?" (1-5 rating) | "What's missing?" (text) |
| `analytics_view` | ADMIN | "Does this data help your decision-making?" (yes/no/partially) | "What data would you add?" (text) |
| `check_in` | VERIFIER | "How smooth was the verification process?" (1-5 rating) | "What slowed you down?" (text) |
| `fee_scan` | VERIFIER | "Did the scan work on the first try?" (yes/no) | "Describe the issue" (text, shown if no) |

### Session-End Surveys (5-7 questions)

**Shared questions (all roles):**

1. "Overall, how easy was ZircuVia to use?" (1-5 rating, required)
2. "I felt confident navigating the app" (1-5 Likert, required)
3. "Would you recommend this to a colleague?" (0-10 NPS, required)
4. "What's the ONE thing you'd change?" (text, required)

**Tourist additions:**

5. "How useful was the eco-certification badge in your decisions?" (1-5 rating)
6. "Which feature did you use most?" (multi-select: Map, Search, Events, Fees, Reviews)
7. "What feature is missing?" (text)

**Admin additions:**

5. "Which dashboard section is most useful?" (multi-select: Analytics, Businesses, Eco-Cert, Fees, Events, Logs)
6. "What task takes too many steps?" (text)

**Verifier additions:**

5. "How reliable is the check-in process in the field?" (1-5 rating)
6. "What connectivity issues did you face?" (text)

### Rate Limiting Defaults

- Micro-surveys: `cooldownMinutes: 5`, `maxShowsPerDay: 6`
- Session-end: `maxShowsPerDay: 1`

---

## 3. Components

### New Files (`components/survey/`)

#### `MicroSurvey.tsx`

- Bottom sheet on tourist app (mobile), small dialog on admin/verifier (desktop)
- Receives a `SurveyConfig`, renders questions dynamically
- Progressive disclosure: shows Q1 first, conditionally shows Q2 based on `showIf`
- Always dismissable via X button
- On submit: calls API, shows "Thanks!" toast (Sonner), auto-closes

#### `SessionSurvey.tsx`

- Full dialog modal with multi-step form
- One question per step with progress indicator ("3 of 7")
- First step: optional participant name input
- Back/Next navigation between steps
- Final step: summary of all answers before submission
- Triggered via "Give Feedback" button on profile page, or auto-surfaced after 3+ actions via a badge/banner on profile tab

#### `RatingInput.tsx`

- Reusable 1-5 rating input (tappable numbers/stars)
- Visual highlight on selected value
- Supports both plain rating and Likert scale labels

#### `NpsInput.tsx`

- Horizontal 0-10 number selector
- "Not likely" / "Very likely" labels at ends
- Tappable number pills

#### `YesNoInput.tsx`

- Pill-style buttons for Yes / No (and optional Partially)
- Single-select behavior

### Survey Logic (`hooks/use-survey-trigger.ts`)

A hook that manages survey state and display:

- Tracks completed user actions in `sessionStorage` (e.g., `{ fee_payment: true, business_search: true }`)
- After a qualifying action, checks cooldown and daily cap
- Returns `{ activeSurvey: SurveyConfig | null, dismiss: () => void, complete: (responses) => void, markAction: (triggerPoint: string) => void }`
- Individual pages call `markAction()` after their respective user actions complete

### Layout Integration (`components/survey/SurveyProvider.tsx`)

A client component that wraps each role's layout and renders the active survey:

- Added as a child in `app/(tourist)/layout.tsx`, `app/(admin)/admin/layout.tsx`, and `app/(checker)/checker/layout.tsx`
- Uses `useSurveyTrigger` hook internally
- Provides `markAction` to child pages via React context
- Renders `<MicroSurvey>` (Sheet for tourist, Dialog for admin/checker) or `<SessionSurvey>` based on `activeSurvey`

### Integration Points

| Action | File | Mechanism |
|---|---|---|
| Fee payment success | `app/(tourist)/fees/success/page.tsx` | `markAction("fee_payment")` on success page load |
| Submit review | `app/(tourist)/listings/[id]/review-form.tsx` | After successful POST |
| Search businesses | `app/(tourist)/listings/page.tsx` | After search results render |
| View business detail | `app/(tourist)/listings/[id]/page.tsx` | After page load with delay |
| Eco-cert approval | `app/(admin)/admin/eco-business/page.tsx` | After status change |
| View analytics | `app/(admin)/admin/page.tsx` | After dashboard data loads |
| Complete check-in | `app/(checker)/checker/verify/page.tsx` | After successful check-in |
| Scan fee reference | `app/(checker)/checker/verify/page.tsx` | After scan result |

### Session-End Survey Trigger

- `useSurveyTrigger` counts distinct actions in `sessionStorage`
- When count >= 3, sets `sessionSurveyReady = true`
- Surfaced via a "Give Feedback" link/banner on the profile/settings page
- NOT shown as an unsolicited popup — available when ready

---

## 4. API Routes

### `POST /api/feedback`

**Auth:** Any authenticated user.

**Request body:**

```json
{
  "surveyType": "micro",
  "triggerPoint": "fee_payment",
  "participantName": "Tester #3",
  "responses": [
    { "questionId": "fee_ease", "questionText": "How easy was it...", "type": "rating", "value": 4 },
    { "questionId": "fee_improve", "questionText": "What would you improve?", "type": "text", "value": "Clearer breakdown" }
  ]
}
```

**Behavior:** Extracts `userId` and `role` from JWT session. Validates body with Zod schema (defined in `lib/validations.ts`). Creates `prisma.surveyResponse.create()`. Returns `{ success: true, id }`.

**Zod validation rules:**
- `surveyType`: enum `["micro", "session"]`
- `triggerPoint`: non-empty string, max 50 chars
- `participantName`: optional string, max 100 chars
- `responses`: array of 1-20 items, each with:
  - `questionId`: non-empty string
  - `questionText`: non-empty string, max 200 chars
  - `type`: enum matching `SurveyQuestion.type`
  - `value`: `string | number | string[]` — numbers must be 0-10 (covers both rating and NPS ranges), strings max 500 chars

### `GET /api/admin/feedback`

**Auth:** Admin only.

**Query params:** `role`, `surveyType`, `triggerPoint`, `from`, `to`, `page`, `limit`

**Response:**

```json
{
  "summary": {
    "totalResponses": 42,
    "byRole": { "TOURIST": 28, "ADMIN": 8, "VERIFIER": 6 },
    "bySurveyType": { "micro": 34, "session": 8 },
    "averageRatings": {
      "fee_payment": { "avg": 3.8, "count": 12 },
      "check_in": { "avg": 4.2, "count": 6 }
    },
    "npsScore": 72
  },
  "responses": [],
  "pagination": { "page": 1, "limit": 20, "total": 42 }
}
```

**Aggregation logic (all server-side):**

- Rating averages: group by `triggerPoint`, extract numeric values from JSON, compute mean
- NPS: count promoters (9-10), passives (7-8), detractors (0-6) from session-end Q3, compute `(promoters - detractors) / total * 100`
- Multi-select tallies: parse JSON, count each option occurrence
- Text responses: returned as flat list grouped by question

### `GET /api/export/feedback`

**Auth:** Admin only. (Follows existing export route pattern: `/api/export/fees`, `/api/export/visits`)

**Query params:** `type` (`summary` or `raw`), plus same filter params as above.

**Behavior:**

- **Summary export:** CSV with aggregated scores, role breakdowns, NPS, rating averages per trigger point
- **Raw export:** CSV with every response as a row — `timestamp, role, participantName, triggerPoint, questionText, value`
- CSV generated via string building (no extra dependencies, consistent with existing export routes)
- Returns file as download with `Content-Type: text/csv` and `Content-Disposition: attachment` headers

---

## 5. Admin Feedback Dashboard

New page at `/admin/feedback`. Added to admin sidebar navigation.

### Tab 1: Overview

- Stat cards: Total Responses, Avg Overall Rating, NPS Score, Response Rate by Role
- Bar chart (Recharts): average rating per trigger point, color-coded by role
- Pie chart: response distribution by role
- Date range filter at top (reuse `DateRangeFilter` component, add an "All time" preset that passes no date params to the API — falls back to unfiltered query)

### Tab 2: Responses

- Filterable table: Role, Survey Type, Trigger Point, Date Range dropdowns
- Columns: Timestamp, Role, Participant Name, Trigger Point, Response Summary
- Expandable rows for full response detail
- Pagination (20 per page)

### Tab 3: Text Feedback

- Open-text responses only, grouped by question
- Filterable by role and trigger point
- Simple scannable list format — optimized for stakeholder review and screenshots

### Export Controls

Dropdown button (top-right):
- Export Summary (CSV)
- Export All Responses (CSV)

### Access Control

Protected by admin middleware. Visible to all authenticated admins regardless of specific `AdminAccess` permission flags (same as the Home dashboard). Feedback review is relevant to all admin roles during the testing phase.

---

## 6. Error Handling & Edge Cases

### Survey Display

- API submit failure: toast "Couldn't save your feedback — we'll retry later", queue in `localStorage`
- `sessionStorage` unavailable: fall back to in-memory tracking. Surveys may re-appear across refreshes but no crash.
- User dismisses micro-survey: don't show same trigger point again for that session
- User navigates away mid-survey: discard partial responses (surveys are short enough to redo)

### Concurrent Users on Shared Accounts

- Display state is browser-local (`sessionStorage`): no cross-user interference
- Each submission is an independent INSERT: no race conditions
- Participant name is the distinguishing factor — if skipped, responses are still valid but grouped under the role

### Rate Limiting

- Cooldown timer: `sessionStorage` with timestamp, survives page navigation, resets on new tab
- Daily cap: `localStorage` with date key, resets at midnight
- Micro vs session conflict: micro-survey takes priority (shorter). Session survey queues for next qualifying moment.

### Admin Dashboard

- No responses: empty state message — "No feedback collected yet. Surveys will appear for users as they interact with the app."
- Date filter defaults to "All time"
- Export with zero responses: file with headers only, not an error

### Offline (PWA)

- Pending feedback queue in `localStorage`, capped at 50 entries
- Reconnection detected via `window.addEventListener("online", ...)` event listener
- On reconnect: sequential submission with 500ms delay between each
- Failed retry: stays in queue for next `online` event cycle

---

## 7. Scope Summary

| Category | Count | Details |
|---|---|---|
| Prisma models | 1 | `SurveyResponse` |
| Config files | 1 | `lib/survey-config.ts` |
| Components | 6 | SurveyProvider, MicroSurvey, SessionSurvey, RatingInput, NpsInput, YesNoInput |
| Hooks | 1 | `useSurveyTrigger` |
| API routes | 3 | POST `/api/feedback`, GET `/api/admin/feedback`, GET `/api/export/feedback` |
| Admin pages | 1 | Feedback dashboard (3 tabs) |
| Integration points | 8 | Across tourist, admin, and verifier flows |
| Existing page updates | 5 | Profile (Give Feedback link), Admin sidebar (Feedback nav item), 3 layout files (SurveyProvider wrapper) |

### Out of Scope

- Survey builder / admin editor for survey questions
- A/B testing or survey variants
- Real-time analytics or WebSocket updates
- NLP / sentiment analysis on text responses
- Email or push notification survey delivery
