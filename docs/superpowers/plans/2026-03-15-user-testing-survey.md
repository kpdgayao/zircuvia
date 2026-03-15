# User Testing Survey System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a role-based in-app feedback collection system so demo testers (20-50 users across Tourist/Admin/Verifier roles on shared accounts) can provide structured survey responses, viewable and exportable by admins for stakeholder reports.

**Architecture:** Two survey types — contextual micro-surveys (1-2 questions, triggered after key actions) and session-end surveys (5-7 questions, available from profile/menu). A `SurveyProvider` context wraps each role layout, exposing `markAction()` to child pages. All responses stored in a single `SurveyResponse` Prisma model with JSON responses. Admin dashboard at `/admin/feedback` with overview charts, response table, text feedback view, and CSV export.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma 7.5 (PostgreSQL), shadcn/ui (Sheet, Dialog, Tabs, Select, Card, Table, Button), Recharts, Sonner, Zod, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-03-15-user-testing-survey-design.md`

---

## Chunk 1: Data Layer & Survey Config

### Task 1: Prisma Schema — SurveyResponse Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add SurveyResponse model and User back-relation**

Add to the end of `prisma/schema.prisma` (before the closing of the file):

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

  @@index([role])
  @@index([triggerPoint])
  @@index([createdAt])
}
```

Add to the `User` model (after the `savedBusinesses` line):

```prisma
  surveyResponses SurveyResponse[]
```

- [ ] **Step 2: Generate Prisma client and apply migration**

Run:
```bash
npx prisma migrate dev --name add-survey-response
```

Expected: Migration applied successfully, `SurveyResponse` table created.

- [ ] **Step 3: Verify by running Prisma generate**

Run:
```bash
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add SurveyResponse model to Prisma schema"
```

---

### Task 2: Survey Config & Types

**Files:**
- Create: `lib/survey-config.ts`

- [ ] **Step 1: Create the survey types and config file**

Create `lib/survey-config.ts` with all type definitions and survey configurations:

```typescript
import type { Role } from "@prisma/client";

export type SurveyQuestionType =
  | "rating"
  | "likert"
  | "nps"
  | "yes_no"
  | "yes_no_partial"
  | "multi_select"
  | "text";

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[];
  required: boolean;
  showIf?: "previous_positive" | "previous_negative";
}

export interface SurveyConfig {
  id: string;
  surveyType: "micro" | "session";
  triggerPoint: string;
  role: Role | "ALL";
  title: string;
  questions: SurveyQuestion[];
  cooldownMinutes: number;
  maxShowsPerDay: number;
}

/**
 * showIf semantics:
 *   "previous_negative" → show if prior answer is: rating/likert <= 2, "No", or "Partially"
 *   "previous_positive" → show if prior answer is: rating/likert >= 4, "Yes"
 *   Rating of 3 is neutral and does NOT trigger either condition
 */
export function shouldShowConditional(
  showIf: "previous_positive" | "previous_negative",
  previousValue: string | number | string[]
): boolean {
  if (typeof previousValue === "number") {
    if (showIf === "previous_negative") return previousValue <= 2;
    if (showIf === "previous_positive") return previousValue >= 4;
  }
  if (typeof previousValue === "string") {
    if (showIf === "previous_negative")
      return previousValue === "No" || previousValue === "Partially";
    if (showIf === "previous_positive") return previousValue === "Yes";
  }
  return false;
}

// ─── Micro-Surveys ────────────────────────────────────────────────

const MICRO_FEE_PAYMENT: SurveyConfig = {
  id: "micro_fee_payment",
  surveyType: "micro",
  triggerPoint: "fee_payment",
  role: "TOURIST",
  title: "Fee Payment Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "fee_ease",
      text: "How easy was it to pay your environmental fee?",
      type: "rating",
      required: true,
    },
    {
      id: "fee_improve",
      text: "What would you improve?",
      type: "text",
      required: false,
      showIf: "previous_negative",
    },
  ],
};

const MICRO_BUSINESS_REVIEW: SurveyConfig = {
  id: "micro_business_review",
  surveyType: "micro",
  triggerPoint: "business_review",
  role: "TOURIST",
  title: "Review Process Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "review_easy",
      text: "Was the review process straightforward?",
      type: "yes_no",
      required: true,
    },
    {
      id: "review_confusing",
      text: "What was confusing?",
      type: "text",
      required: false,
      showIf: "previous_negative",
    },
  ],
};

const MICRO_BUSINESS_SEARCH: SurveyConfig = {
  id: "micro_business_search",
  surveyType: "micro",
  triggerPoint: "business_search",
  role: "TOURIST",
  title: "Search Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "search_found",
      text: "Did you find what you were looking for?",
      type: "yes_no_partial",
      required: true,
    },
    {
      id: "search_looking_for",
      text: "What were you looking for?",
      type: "text",
      required: false,
      showIf: "previous_negative",
    },
  ],
};

const MICRO_BUSINESS_DETAIL: SurveyConfig = {
  id: "micro_business_detail",
  surveyType: "micro",
  triggerPoint: "business_detail",
  role: "TOURIST",
  title: "Business Info Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "detail_helpful",
      text: "Was this information helpful?",
      type: "yes_no",
      required: true,
    },
    {
      id: "detail_missing",
      text: "What's missing?",
      type: "text",
      required: false,
      showIf: "previous_negative",
    },
  ],
};

const MICRO_ECO_CERTIFICATION: SurveyConfig = {
  id: "micro_eco_certification",
  surveyType: "micro",
  triggerPoint: "eco_certification",
  role: "ADMIN",
  title: "Eco-Certification Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "eco_efficiency",
      text: "How efficient was this workflow?",
      type: "rating",
      required: true,
    },
    {
      id: "eco_missing",
      text: "What's missing?",
      type: "text",
      required: false,
    },
  ],
};

const MICRO_ANALYTICS_VIEW: SurveyConfig = {
  id: "micro_analytics_view",
  surveyType: "micro",
  triggerPoint: "analytics_view",
  role: "ADMIN",
  title: "Dashboard Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "analytics_helpful",
      text: "Does this data help your decision-making?",
      type: "yes_no_partial",
      required: true,
    },
    {
      id: "analytics_add",
      text: "What data would you add?",
      type: "text",
      required: false,
      showIf: "previous_negative",
    },
  ],
};

const MICRO_CHECK_IN: SurveyConfig = {
  id: "micro_check_in",
  surveyType: "micro",
  triggerPoint: "check_in",
  role: "VERIFIER",
  title: "Check-in Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "checkin_smooth",
      text: "How smooth was the verification process?",
      type: "rating",
      required: true,
    },
    {
      id: "checkin_slow",
      text: "What slowed you down?",
      type: "text",
      required: false,
      showIf: "previous_negative",
    },
  ],
};

const MICRO_FEE_SCAN: SurveyConfig = {
  id: "micro_fee_scan",
  surveyType: "micro",
  triggerPoint: "fee_scan",
  role: "VERIFIER",
  title: "Scan Feedback",
  cooldownMinutes: 5,
  maxShowsPerDay: 6,
  questions: [
    {
      id: "scan_first_try",
      text: "Did the scan work on the first try?",
      type: "yes_no",
      required: true,
    },
    {
      id: "scan_issue",
      text: "Describe the issue",
      type: "text",
      required: false,
      showIf: "previous_negative",
    },
  ],
};

// ─── Session-End Surveys ──────────────────────────────────────────

const SHARED_SESSION_QUESTIONS: SurveyQuestion[] = [
  {
    id: "overall_ease",
    text: "Overall, how easy was ZircuVia to use?",
    type: "rating",
    required: true,
  },
  {
    id: "confidence",
    text: "I felt confident navigating the app",
    type: "likert",
    required: true,
  },
  {
    id: "nps",
    text: "Would you recommend this to a colleague?",
    type: "nps",
    required: true,
  },
  {
    id: "one_change",
    text: "What's the ONE thing you'd change?",
    type: "text",
    required: true,
  },
];

const SESSION_TOURIST: SurveyConfig = {
  id: "session_tourist",
  surveyType: "session",
  triggerPoint: "session_end",
  role: "TOURIST",
  title: "Share Your Experience",
  cooldownMinutes: 0,
  maxShowsPerDay: 1,
  questions: [
    ...SHARED_SESSION_QUESTIONS,
    {
      id: "eco_badge_useful",
      text: "How useful was the eco-certification badge in your decisions?",
      type: "rating",
      required: false,
    },
    {
      id: "feature_used_most",
      text: "Which feature did you use most?",
      type: "multi_select",
      options: ["Map", "Search", "Events", "Fees", "Reviews"],
      required: false,
    },
    {
      id: "feature_missing",
      text: "What feature is missing?",
      type: "text",
      required: false,
    },
  ],
};

const SESSION_ADMIN: SurveyConfig = {
  id: "session_admin",
  surveyType: "session",
  triggerPoint: "session_end",
  role: "ADMIN",
  title: "Admin Experience Feedback",
  cooldownMinutes: 0,
  maxShowsPerDay: 1,
  questions: [
    ...SHARED_SESSION_QUESTIONS,
    {
      id: "dashboard_useful",
      text: "Which dashboard section is most useful?",
      type: "multi_select",
      options: [
        "Analytics",
        "Businesses",
        "Eco-Cert",
        "Fees",
        "Events",
        "Logs",
      ],
      required: false,
    },
    {
      id: "task_too_many_steps",
      text: "What task takes too many steps?",
      type: "text",
      required: false,
    },
  ],
};

const SESSION_VERIFIER: SurveyConfig = {
  id: "session_verifier",
  surveyType: "session",
  triggerPoint: "session_end",
  role: "VERIFIER",
  title: "Verifier Experience Feedback",
  cooldownMinutes: 0,
  maxShowsPerDay: 1,
  questions: [
    ...SHARED_SESSION_QUESTIONS,
    {
      id: "field_reliability",
      text: "How reliable is the check-in process in the field?",
      type: "rating",
      required: false,
    },
    {
      id: "connectivity_issues",
      text: "What connectivity issues did you face?",
      type: "text",
      required: false,
    },
  ],
};

// ─── Exports ──────────────────────────────────────────────────────

export const MICRO_SURVEYS: SurveyConfig[] = [
  MICRO_FEE_PAYMENT,
  MICRO_BUSINESS_REVIEW,
  MICRO_BUSINESS_SEARCH,
  MICRO_BUSINESS_DETAIL,
  MICRO_ECO_CERTIFICATION,
  MICRO_ANALYTICS_VIEW,
  MICRO_CHECK_IN,
  MICRO_FEE_SCAN,
];

export const SESSION_SURVEYS: SurveyConfig[] = [
  SESSION_TOURIST,
  SESSION_ADMIN,
  SESSION_VERIFIER,
];

export const ALL_SURVEYS: SurveyConfig[] = [
  ...MICRO_SURVEYS,
  ...SESSION_SURVEYS,
];

export function getSurveyForTrigger(
  triggerPoint: string,
  role: Role
): SurveyConfig | undefined {
  return MICRO_SURVEYS.find(
    (s) => s.triggerPoint === triggerPoint && (s.role === role || s.role === "ALL")
  );
}

export function getSessionSurvey(role: Role): SurveyConfig | undefined {
  return SESSION_SURVEYS.find(
    (s) => s.role === role || s.role === "ALL"
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `lib/survey-config.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/survey-config.ts
git commit -m "feat: add survey config with all micro and session survey definitions"
```

---

### Task 3: Zod Validation Schema for Survey Submission

**Files:**
- Modify: `lib/validations.ts`

- [ ] **Step 1: Add survey feedback validation schema**

Append to `lib/validations.ts`:

```typescript
export const surveyResponseItemSchema = z.object({
  questionId: z.string().min(1),
  questionText: z.string().min(1).max(200),
  type: z.enum(["rating", "likert", "nps", "yes_no", "yes_no_partial", "multi_select", "text"]),
  value: z.union([
    z.number().int().min(0).max(10),
    z.string().max(500),
    z.array(z.string().max(100)).max(10),
  ]),
});

export const surveyFeedbackSchema = z.object({
  surveyType: z.enum(["micro", "session"]),
  triggerPoint: z.string().min(1).max(50),
  participantName: z.string().max(100).optional(),
  responses: z.array(surveyResponseItemSchema).min(1).max(20),
});
```

- [ ] **Step 2: Verify Zod compatibility**

The project uses `zod@^4.3.6`. Verify the schema works by checking that the existing `validations.ts` import pattern (`import { z } from "zod"`) is compatible. If the project uses Zod v4 compat mode (`zod/v4`), adjust the import accordingly. Run:

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

If there are Zod-related type errors (e.g., `.safeParse()` or `.flatten()` not found), check `package.json` for the exact zod version and adjust. For Zod v4 with compat, use `import { z } from "zod/v4"` if the existing file uses that pattern.

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validations.ts
git commit -m "feat: add Zod validation schema for survey feedback submissions"
```

---

### Task 4: POST /api/feedback Route

**Files:**
- Create: `app/api/feedback/route.ts`

- [ ] **Step 1: Create the feedback submission API route**

Create `app/api/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { surveyFeedbackSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = surveyFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { surveyType, triggerPoint, participantName, responses } = parsed.data;

    const surveyResponse = await prisma.surveyResponse.create({
      data: {
        userId: session.userId,
        role: session.role,
        surveyType,
        triggerPoint,
        participantName: participantName || null,
        responses,
      },
    });

    return NextResponse.json({ success: true, id: surveyResponse.id });
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify the route compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/feedback/route.ts
git commit -m "feat: add POST /api/feedback route for survey submission"
```

---

## Chunk 2: Survey UI Components

### Task 5: RatingInput Component

**Files:**
- Create: `components/survey/RatingInput.tsx`

- [ ] **Step 1: Create the rating input component**

Create `components/survey/RatingInput.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

interface RatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
  labels?: { low: string; high: string };
}

export function RatingInput({
  value,
  onChange,
  max = 5,
  labels,
}: RatingInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-2 justify-center">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-10 h-10 rounded-lg text-sm font-medium transition-all",
              value === n
                ? "bg-[#2E7D32] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-gray-400 px-1">
          <span>{labels.low}</span>
          <span>{labels.high}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/survey/RatingInput.tsx
git commit -m "feat: add RatingInput component for survey ratings"
```

---

### Task 6: NpsInput Component

**Files:**
- Create: `components/survey/NpsInput.tsx`

- [ ] **Step 1: Create the NPS input component**

Create `components/survey/NpsInput.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

interface NpsInputProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function NpsInput({ value, onChange }: NpsInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1 justify-center flex-wrap">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-9 h-9 rounded-lg text-xs font-medium transition-all",
              value === n
                ? "bg-[#2E7D32] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/survey/NpsInput.tsx
git commit -m "feat: add NpsInput component for NPS question type"
```

---

### Task 7: YesNoInput Component

**Files:**
- Create: `components/survey/YesNoInput.tsx`

- [ ] **Step 1: Create the yes/no input component**

Create `components/survey/YesNoInput.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

interface YesNoInputProps {
  value: string | null;
  onChange: (value: string) => void;
  includePartial?: boolean;
}

export function YesNoInput({
  value,
  onChange,
  includePartial = false,
}: YesNoInputProps) {
  const options = includePartial
    ? ["Yes", "Partially", "No"]
    : ["Yes", "No"];

  return (
    <div className="flex gap-2 justify-center">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "px-5 py-2 rounded-full text-sm font-medium transition-all",
            value === option
              ? "bg-[#2E7D32] text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/survey/YesNoInput.tsx
git commit -m "feat: add YesNoInput component for yes/no/partial questions"
```

---

### Task 8: Shared QuestionInput Component

**Files:**
- Create: `components/survey/QuestionInput.tsx`

- [ ] **Step 1: Create the shared question input router**

Create `components/survey/QuestionInput.tsx`:

```tsx
"use client";

import { Textarea } from "@/components/ui/textarea";
import { RatingInput } from "./RatingInput";
import { NpsInput } from "./NpsInput";
import { YesNoInput } from "./YesNoInput";
import type { SurveyQuestion } from "@/lib/survey-config";

interface QuestionInputProps {
  question: SurveyQuestion;
  value: string | number | string[] | null;
  onChange: (value: string | number | string[]) => void;
}

export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.type) {
    case "rating":
      return (
        <RatingInput
          value={typeof value === "number" ? value : null}
          onChange={onChange}
          labels={{ low: "Poor", high: "Excellent" }}
        />
      );
    case "likert":
      return (
        <RatingInput
          value={typeof value === "number" ? value : null}
          onChange={onChange}
          labels={{ low: "Strongly disagree", high: "Strongly agree" }}
        />
      );
    case "nps":
      return (
        <NpsInput
          value={typeof value === "number" ? value : null}
          onChange={onChange}
        />
      );
    case "yes_no":
      return (
        <YesNoInput
          value={typeof value === "string" ? value : null}
          onChange={onChange}
        />
      );
    case "yes_no_partial":
      return (
        <YesNoInput
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          includePartial
        />
      );
    case "multi_select":
      return (
        <MultiSelectInput
          options={question.options ?? []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );
    case "text":
      return (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your feedback..."
          rows={3}
          maxLength={500}
          className="text-sm resize-none"
        />
      );
  }
}

function MultiSelectInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    );
  }

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={
            value.includes(option)
              ? "px-3 py-1.5 rounded-full text-xs font-medium bg-[#2E7D32] text-white"
              : "px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          }
        >
          {option}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/survey/QuestionInput.tsx
git commit -m "feat: add shared QuestionInput component for survey question rendering"
```

---

### Task 9: MicroSurvey Component

**Files:**
- Create: `components/survey/MicroSurvey.tsx`

- [ ] **Step 1: Create the micro survey component**

Create `components/survey/MicroSurvey.tsx` (uses shared `QuestionInput` from Task 8):

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuestionInput } from "./QuestionInput";
import type { SurveyConfig } from "@/lib/survey-config";
import { shouldShowConditional } from "@/lib/survey-config";

interface MicroSurveyProps {
  config: SurveyConfig;
  onComplete: (
    responses: Array<{
      questionId: string;
      questionText: string;
      type: string;
      value: string | number | string[];
    }>
  ) => void;
  onDismiss: () => void;
  variant: "sheet" | "dialog";
}

export function MicroSurvey({
  config,
  onComplete,
  onDismiss,
  variant,
}: MicroSurveyProps) {
  const [answers, setAnswers] = useState<
    Record<string, string | number | string[]>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const questions = config.questions;
  const q1 = questions[0];
  const q2 = questions[1];

  const q1Answered = answers[q1.id] !== undefined;
  const showQ2 =
    q2 &&
    q1Answered &&
    (!q2.showIf ||
      shouldShowConditional(q2.showIf, answers[q1.id]));

  const canSubmit =
    q1Answered && (!q2 || !showQ2 || !q2.required || answers[q2.id] !== undefined);

  async function handleSubmit() {
    setSubmitting(true);
    const responseItems = questions
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        value: answers[q.id],
      }));
    onComplete(responseItems);
    setSubmitting(false);
  }

  const content = (
    <div className="space-y-4 py-2">
      {/* Q1 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">{q1.text}</p>
        <QuestionInput
          question={q1}
          value={answers[q1.id] ?? null}
          onChange={(v) => setAnswers((a) => ({ ...a, [q1.id]: v }))}
        />
      </div>

      {/* Q2 (conditional) */}
      {showQ2 && q2 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm font-medium text-gray-700">{q2.text}</p>
          <QuestionInput
            question={q2}
            value={answers[q2.id] ?? null}
            onChange={(v) => setAnswers((a) => ({ ...a, [q2.id]: v }))}
          />
        </div>
      )}

      {/* Submit */}
      {q1Answered && (
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full bg-[#2E7D32] hover:bg-[#1B5E20]"
          size="sm"
        >
          {submitting ? "Sending..." : "Submit Feedback"}
        </Button>
      )}
    </div>
  );

  if (variant === "sheet") {
    return (
      <Sheet open onOpenChange={(open) => !open && onDismiss()}>
        <SheetContent side="bottom" className="max-w-lg mx-auto rounded-t-xl">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle className="text-sm">{config.title}</SheetTitle>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{config.title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/survey/MicroSurvey.tsx
git commit -m "feat: add MicroSurvey component with sheet/dialog variants"
```

---

### Task 9: SessionSurvey Component

**Files:**
- Create: `components/survey/SessionSurvey.tsx`

- [ ] **Step 1: Create the session survey component**

Create `components/survey/SessionSurvey.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionInput } from "./QuestionInput";
import type { SurveyConfig } from "@/lib/survey-config";

interface SessionSurveyProps {
  config: SurveyConfig;
  onComplete: (
    participantName: string | undefined,
    responses: Array<{
      questionId: string;
      questionText: string;
      type: string;
      value: string | number | string[];
    }>
  ) => void;
  onDismiss: () => void;
}

export function SessionSurvey({
  config,
  onComplete,
  onDismiss,
}: SessionSurveyProps) {
  const [step, setStep] = useState(0); // 0 = name, 1..N = questions, N+1 = summary
  const [participantName, setParticipantName] = useState("");
  const [answers, setAnswers] = useState<
    Record<string, string | number | string[]>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const questions = config.questions;
  const totalSteps = questions.length + 2; // name step + questions + summary step
  const isNameStep = step === 0;
  const isSummaryStep = step === questions.length + 1;
  const currentQuestion = !isNameStep && !isSummaryStep ? questions[step - 1] : null;

  function canAdvance(): boolean {
    if (isNameStep) return true; // name is optional
    if (isSummaryStep) return true;
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    return answers[currentQuestion.id] !== undefined &&
      answers[currentQuestion.id] !== "";
  }

  function handleNext() {
    if (step < totalSteps - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const responseItems = questions
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        value: answers[q.id],
      }));
    onComplete(participantName.trim() || undefined, responseItems);
    setSubmitting(false);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{config.title}</DialogTitle>
          <p className="text-xs text-gray-400">
            Step {step + 1} of {totalSteps}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-[#2E7D32] h-1.5 rounded-full transition-all"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Name step */}
          {isNameStep && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Your name or participant ID (optional)
                </Label>
                <p className="text-xs text-gray-400">
                  Helps us identify your feedback. You can skip this.
                </p>
              </div>
              <Input
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder='e.g., "Tester #3" or your name'
                maxLength={100}
              />
            </div>
          )}

          {/* Question step */}
          {currentQuestion && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {currentQuestion.text}
              </p>
              <QuestionInput
                question={currentQuestion}
                value={answers[currentQuestion.id] ?? null}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: v }))
                }
              />
            </div>
          )}

          {/* Summary step */}
          {isSummaryStep && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Review your answers
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {questions.map((q) => (
                  <div key={q.id} className="text-sm border-b pb-2">
                    <p className="text-gray-500 text-xs">{q.text}</p>
                    <p className="font-medium text-gray-900">
                      {answers[q.id] !== undefined
                        ? Array.isArray(answers[q.id])
                          ? (answers[q.id] as string[]).join(", ")
                          : String(answers[q.id])
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
            )}
            {!isSummaryStep ? (
              <Button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]"
              >
                {isNameStep ? "Start" : "Next"}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]"
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/survey/SessionSurvey.tsx
git commit -m "feat: add SessionSurvey multi-step dialog component"
```

---

## Chunk 3: Survey Trigger System & Provider

### Task 10: useSurveyTrigger Hook

**Files:**
- Create: `hooks/use-survey-trigger.ts`

- [ ] **Step 1: Create the survey trigger hook**

Create `hooks/use-survey-trigger.ts`:

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import type { Role } from "@prisma/client";
import type { SurveyConfig } from "@/lib/survey-config";
import { getSurveyForTrigger, getSessionSurvey } from "@/lib/survey-config";

const STORAGE_KEY_ACTIONS = "zv_survey_actions";
const STORAGE_KEY_COOLDOWN = "zv_survey_cooldown";
const STORAGE_KEY_DAILY = "zv_survey_daily";
const STORAGE_KEY_DISMISSED = "zv_survey_dismissed";

function getSessionStorage<T>(key: string, fallback: T): T {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setSessionStorage(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage unavailable — silent fail
  }
}

function getLocalStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable — silent fail
  }
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isCooldownActive(cooldownMinutes: number): boolean {
  if (cooldownMinutes <= 0) return false;
  const lastShown = getSessionStorage<number>(STORAGE_KEY_COOLDOWN, 0);
  if (!lastShown) return false;
  return Date.now() - lastShown < cooldownMinutes * 60 * 1000;
}

function getDailyCount(surveyId: string): number {
  const daily = getLocalStorage<Record<string, Record<string, number>>>(
    STORAGE_KEY_DAILY,
    {}
  );
  const today = getTodayKey();
  return daily[today]?.[surveyId] ?? 0;
}

function incrementDailyCount(surveyId: string): void {
  const daily = getLocalStorage<Record<string, Record<string, number>>>(
    STORAGE_KEY_DAILY,
    {}
  );
  const today = getTodayKey();
  if (!daily[today]) daily[today] = {};
  daily[today][surveyId] = (daily[today][surveyId] ?? 0) + 1;
  setLocalStorage(STORAGE_KEY_DAILY, daily);
}

function isDismissed(triggerPoint: string): boolean {
  const dismissed = getSessionStorage<string[]>(STORAGE_KEY_DISMISSED, []);
  return dismissed.includes(triggerPoint);
}

function markDismissed(triggerPoint: string): void {
  const dismissed = getSessionStorage<string[]>(STORAGE_KEY_DISMISSED, []);
  if (!dismissed.includes(triggerPoint)) {
    dismissed.push(triggerPoint);
    setSessionStorage(STORAGE_KEY_DISMISSED, dismissed);
  }
}

export interface UseSurveyTriggerReturn {
  activeSurvey: SurveyConfig | null;
  sessionSurveyReady: boolean;
  markAction: (triggerPoint: string) => void;
  openSessionSurvey: () => void;
  dismiss: () => void;
  complete: () => void;
}

export function useSurveyTrigger(role: Role): UseSurveyTriggerReturn {
  const [activeSurvey, setActiveSurvey] = useState<SurveyConfig | null>(null);
  const [sessionSurveyReady, setSessionSurveyReady] = useState(false);
  // Use ref to avoid stale closures in markAction
  const activeSurveyRef = useRef<SurveyConfig | null>(null);

  const updateActionCount = useCallback(() => {
    const actions = getSessionStorage<Record<string, boolean>>(
      STORAGE_KEY_ACTIONS,
      {}
    );
    const count = Object.keys(actions).length;
    if (count >= 3) {
      setSessionSurveyReady(true);
    }
  }, []);

  const markAction = useCallback(
    (triggerPoint: string) => {
      // Record the action
      const actions = getSessionStorage<Record<string, boolean>>(
        STORAGE_KEY_ACTIONS,
        {}
      );
      actions[triggerPoint] = true;
      setSessionStorage(STORAGE_KEY_ACTIONS, actions);
      updateActionCount();

      // Don't show survey if one is already active
      if (activeSurveyRef.current) return;

      // Don't show if dismissed this session
      if (isDismissed(triggerPoint)) return;

      // Find matching micro-survey
      const survey = getSurveyForTrigger(triggerPoint, role);
      if (!survey) return;

      // Don't show if cooldown active (uses survey-specific cooldownMinutes)
      if (isCooldownActive(survey.cooldownMinutes)) return;

      // Check daily cap
      if (getDailyCount(survey.id) >= survey.maxShowsPerDay) return;

      // Show the survey
      activeSurveyRef.current = survey;
      setActiveSurvey(survey);
    },
    [role, updateActionCount]
  );

  const openSessionSurvey = useCallback(() => {
    const survey = getSessionSurvey(role);
    if (!survey) return;
    if (getDailyCount(survey.id) >= survey.maxShowsPerDay) return;
    activeSurveyRef.current = survey;
    setActiveSurvey(survey);
  }, [role]);

  const dismiss = useCallback(() => {
    if (activeSurveyRef.current) {
      markDismissed(activeSurveyRef.current.triggerPoint);
    }
    activeSurveyRef.current = null;
    setActiveSurvey(null);
  }, []);

  const complete = useCallback(() => {
    if (activeSurveyRef.current) {
      incrementDailyCount(activeSurveyRef.current.id);
      setSessionStorage(STORAGE_KEY_COOLDOWN, Date.now());
    }
    activeSurveyRef.current = null;
    setActiveSurvey(null);
  }, []);

  return {
    activeSurvey,
    sessionSurveyReady,
    markAction,
    openSessionSurvey,
    dismiss,
    complete,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-survey-trigger.ts
git commit -m "feat: add useSurveyTrigger hook with rate limiting and session tracking"
```

---

### Task 11: SurveyProvider Context Component

**Files:**
- Create: `components/survey/SurveyProvider.tsx`

- [ ] **Step 1: Create the survey provider**

Create `components/survey/SurveyProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useCallback, useEffect } from "react";
import type { Role } from "@prisma/client";
import { toast } from "sonner";
import { useSurveyTrigger } from "@/hooks/use-survey-trigger";
import { MicroSurvey } from "./MicroSurvey";
import { SessionSurvey } from "./SessionSurvey";

interface SurveyContextValue {
  markAction: (triggerPoint: string) => void;
  sessionSurveyReady: boolean;
  openSessionSurvey: () => void;
}

const SurveyContext = createContext<SurveyContextValue>({
  markAction: () => {},
  sessionSurveyReady: false,
  openSessionSurvey: () => {},
});

export function useSurveyContext() {
  return useContext(SurveyContext);
}

const PENDING_FEEDBACK_KEY = "zv_pending_feedback";
const MAX_PENDING = 50;

async function submitFeedback(payload: {
  surveyType: string;
  triggerPoint: string;
  participantName?: string;
  responses: Array<{
    questionId: string;
    questionText: string;
    type: string;
    value: string | number | string[];
  }>;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function queuePendingFeedback(payload: unknown): void {
  try {
    const pending = JSON.parse(
      localStorage.getItem(PENDING_FEEDBACK_KEY) || "[]"
    );
    if (pending.length < MAX_PENDING) {
      pending.push(payload);
      localStorage.setItem(PENDING_FEEDBACK_KEY, JSON.stringify(pending));
    }
  } catch {
    // localStorage unavailable
  }
}

async function flushPendingFeedback(): Promise<void> {
  try {
    const pending = JSON.parse(
      localStorage.getItem(PENDING_FEEDBACK_KEY) || "[]"
    );
    if (pending.length === 0) return;

    const remaining = [];
    for (const payload of pending) {
      const ok = await submitFeedback(payload);
      if (!ok) remaining.push(payload);
      // 500ms delay between submissions
      await new Promise((r) => setTimeout(r, 500));
    }
    localStorage.setItem(PENDING_FEEDBACK_KEY, JSON.stringify(remaining));
  } catch {
    // silent
  }
}

interface SurveyProviderProps {
  role: Role;
  variant: "sheet" | "dialog";
  children: React.ReactNode;
}

export function SurveyProvider({
  role,
  variant,
  children,
}: SurveyProviderProps) {
  const {
    activeSurvey,
    sessionSurveyReady,
    markAction,
    openSessionSurvey,
    dismiss,
    complete,
  } = useSurveyTrigger(role);

  // Flush pending feedback on mount and on reconnect
  useEffect(() => {
    flushPendingFeedback();
    const handler = () => flushPendingFeedback();
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, []);

  const handleMicroComplete = useCallback(
    async (
      responses: Array<{
        questionId: string;
        questionText: string;
        type: string;
        value: string | number | string[];
      }>
    ) => {
      if (!activeSurvey) return;
      const payload = {
        surveyType: activeSurvey.surveyType,
        triggerPoint: activeSurvey.triggerPoint,
        responses,
      };
      const ok = await submitFeedback(payload);
      if (ok) {
        toast.success("Thanks for your feedback!");
      } else {
        queuePendingFeedback(payload);
        toast.info("Feedback saved — we'll submit it when you're back online.");
      }
      complete();
    },
    [activeSurvey, complete]
  );

  const handleSessionComplete = useCallback(
    async (
      participantName: string | undefined,
      responses: Array<{
        questionId: string;
        questionText: string;
        type: string;
        value: string | number | string[];
      }>
    ) => {
      if (!activeSurvey) return;
      const payload = {
        surveyType: activeSurvey.surveyType,
        triggerPoint: activeSurvey.triggerPoint,
        participantName,
        responses,
      };
      const ok = await submitFeedback(payload);
      if (ok) {
        toast.success("Thanks for your detailed feedback!");
      } else {
        queuePendingFeedback(payload);
        toast.info("Feedback saved — we'll submit it when you're back online.");
      }
      complete();
    },
    [activeSurvey, complete]
  );

  return (
    <SurveyContext.Provider
      value={{ markAction, sessionSurveyReady, openSessionSurvey }}
    >
      {children}
      {activeSurvey?.surveyType === "micro" && (
        <MicroSurvey
          config={activeSurvey}
          onComplete={handleMicroComplete}
          onDismiss={dismiss}
          variant={variant}
        />
      )}
      {activeSurvey?.surveyType === "session" && (
        <SessionSurvey
          config={activeSurvey}
          onComplete={handleSessionComplete}
          onDismiss={dismiss}
        />
      )}
    </SurveyContext.Provider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/survey/SurveyProvider.tsx
git commit -m "feat: add SurveyProvider context with offline queue and flush"
```

---

## Chunk 4: Layout Integration & Action Triggers

### Task 12: Integrate SurveyProvider into Layouts

**Files:**
- Modify: `app/(tourist)/layout.tsx`
- Modify: `app/(admin)/admin/layout.tsx`
- Modify: `app/(checker)/checker/layout.tsx`

- [ ] **Step 1: Add SurveyProvider to tourist layout**

In `app/(tourist)/layout.tsx`, add import at top:
```typescript
import { SurveyProvider } from "@/components/survey/SurveyProvider";
```

Wrap `{children}` inside `<main>` with SurveyProvider. The layout is a server component, so pass role as a literal. Change the `<main>` block from:
```tsx
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        {children}
      </main>
```
To:
```tsx
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        <SurveyProvider role="TOURIST" variant="sheet">
          {children}
        </SurveyProvider>
      </main>
```

- [ ] **Step 2: Add SurveyProvider to admin layout**

In `app/(admin)/admin/layout.tsx`, add import at top:
```typescript
import { SurveyProvider } from "@/components/survey/SurveyProvider";
```

Change the `<main>` from:
```tsx
      <main className="flex-1 ml-64 p-8">{children}</main>
```
To:
```tsx
      <main className="flex-1 ml-64 p-8">
        <SurveyProvider role="ADMIN" variant="dialog">
          {children}
        </SurveyProvider>
      </main>
```

- [ ] **Step 3: Add SurveyProvider to checker layout**

In `app/(checker)/checker/layout.tsx`, add import at top:
```typescript
import { SurveyProvider } from "@/components/survey/SurveyProvider";
```

Change the `<main>` from:
```tsx
      <main className="w-full max-w-md px-4 py-6">{children}</main>
```
To:
```tsx
      <main className="w-full max-w-md px-4 py-6">
        <SurveyProvider role="VERIFIER" variant="dialog">
          {children}
        </SurveyProvider>
      </main>
```

- [ ] **Step 4: Verify the app builds**

Run:
```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add app/(tourist)/layout.tsx app/(admin)/admin/layout.tsx app/(checker)/checker/layout.tsx
git commit -m "feat: integrate SurveyProvider into all three role layouts"
```

---

### Task 13: Add markAction Calls to Trigger Points

**Files:**
- Modify: `app/(tourist)/fees/success/page.tsx`
- Modify: `app/(tourist)/listings/[id]/review-form.tsx`
- Modify: `app/(tourist)/listings/page.tsx`
- Modify: `app/(tourist)/listings/[id]/page.tsx`
- Modify: `app/(admin)/admin/eco-business/page.tsx`
- Modify: `app/(admin)/admin/page.tsx`
- Modify: `app/(checker)/checker/verify/page.tsx`

- [ ] **Step 1: Add trigger to fee payment success page**

In `app/(tourist)/fees/success/page.tsx`, add import:
```typescript
import { useSurveyContext } from "@/components/survey/SurveyProvider";
```

Inside the `SuccessContent` component (after the existing `const` declarations at the top), add:
```typescript
  const { markAction } = useSurveyContext();
```

Add a `useEffect` after the existing one (after the confetti timer cleanup):
```typescript
  useEffect(() => {
    if (payment) {
      markAction("fee_payment");
    }
  }, [payment, markAction]);
```

- [ ] **Step 2: Add trigger to review form**

In `app/(tourist)/listings/[id]/review-form.tsx`, add import:
```typescript
import { useSurveyContext } from "@/components/survey/SurveyProvider";
```

Inside `ReviewForm`, add after existing state declarations:
```typescript
  const { markAction } = useSurveyContext();
```

In `handleSubmit`, after `setSubmitted(true)` (around line 45), add:
```typescript
      markAction("business_review");
```

- [ ] **Step 3: Add trigger to listings search page**

In `app/(tourist)/listings/page.tsx`, add import:
```typescript
import { useSurveyContext } from "@/components/survey/SurveyProvider";
```

Inside `ListingsPage`, add after existing state declarations:
```typescript
  const { markAction } = useSurveyContext();
```

Add a `useEffect` that fires when search results load (after the `fetchBusinesses` `useEffect`):
```typescript
  useEffect(() => {
    if (data && data.businesses.length > 0 && search) {
      markAction("business_search");
    }
  }, [data, search, markAction]);
```

- [ ] **Step 4: Add trigger to business detail page**

Read `app/(tourist)/listings/[id]/page.tsx` to understand its structure, then add the `useSurveyContext` import and a `useEffect` that calls `markAction("business_detail")` with a 3-second delay after the business data loads. If the page is a server component, add the trigger via a small client component wrapper or use the layout-level approach described in the spec.

Note: The business detail page at `app/(tourist)/listings/[id]/page.tsx` may be a server component. If so, create a tiny client component `components/survey/SurveyTrigger.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useSurveyContext } from "@/components/survey/SurveyProvider";

export function SurveyTrigger({
  triggerPoint,
  delay = 0,
}: {
  triggerPoint: string;
  delay?: number;
}) {
  const { markAction } = useSurveyContext();

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => markAction(triggerPoint), delay);
      return () => clearTimeout(timer);
    }
    markAction(triggerPoint);
  }, [triggerPoint, delay, markAction]);

  return null;
}
```

Then add `<SurveyTrigger triggerPoint="business_detail" delay={3000} />` in the server component's JSX.

- [ ] **Step 5: Add trigger to eco-business page**

In `app/(admin)/admin/eco-business/page.tsx`, add import:
```typescript
import { useSurveyContext } from "@/components/survey/SurveyProvider";
```

Inside `EcoBusinessPage`, add:
```typescript
  const { markAction } = useSurveyContext();
```

In `handleStatusChange`, after `fetchData()` (line 59, on success), add:
```typescript
        markAction("eco_certification");
```

- [ ] **Step 6: Add trigger to admin dashboard page**

The admin dashboard (`app/(admin)/admin/page.tsx`) is a server component. Add the `SurveyTrigger` component:

Add import and render `<SurveyTrigger triggerPoint="analytics_view" delay={2000} />` in the JSX (e.g., at the end of the outer `<div>`).

```tsx
import { SurveyTrigger } from "@/components/survey/SurveyTrigger";
```

Add at the end of the return JSX, before the closing `</div>`:
```tsx
      <SurveyTrigger triggerPoint="analytics_view" delay={2000} />
```

- [ ] **Step 7: Add triggers to checker verify page**

In `app/(checker)/checker/verify/page.tsx`, add import:
```typescript
import { useSurveyContext } from "@/components/survey/SurveyProvider";
```

Inside `VerifyPage`, add:
```typescript
  const { markAction } = useSurveyContext();
```

In `handleSearch`, after `setResults(data.results || [])` (line 63), add:
```typescript
      markAction("fee_scan");
```

In `handleVerify`, inside the success branch (after `setVerifyResult({ success: true, ...})` at line 93), add:
```typescript
        markAction("check_in");
```

- [ ] **Step 8: Verify the app builds**

Run:
```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add components/survey/SurveyTrigger.tsx app/(tourist)/fees/success/page.tsx app/(tourist)/listings/\[id\]/review-form.tsx app/(tourist)/listings/page.tsx app/(tourist)/listings/\[id\]/page.tsx app/(admin)/admin/eco-business/page.tsx app/(admin)/admin/page.tsx app/(checker)/checker/verify/page.tsx
git commit -m "feat: add survey triggers to all 8 integration points"
```

---

### Task 14: Add "Give Feedback" Link to Tourist Profile

**Files:**
- Modify: `app/(tourist)/profile/page.tsx`

- [ ] **Step 1: Add the feedback link and session survey trigger**

In `app/(tourist)/profile/page.tsx`, add imports:
```typescript
import { MessageSquare } from "lucide-react";
import { useSurveyContext } from "@/components/survey/SurveyProvider";
```

Inside `ProfilePage`, add after existing state/effects:
```typescript
  const { sessionSurveyReady, openSessionSurvey } = useSurveyContext();
```

Add a new Card after the existing "Links" Card (after the `</Card>` at approximately line 130, before the Sign out button), add:

```tsx
      {/* Feedback */}
      {sessionSurveyReady && (
        <Card className="border-[#2E7D32]/30 bg-green-50/50">
          <CardContent className="p-0">
            <button
              onClick={openSessionSurvey}
              className="flex items-center justify-between px-4 py-3 hover:bg-green-50 transition w-full text-left"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-[#2E7D32]" />
                <div>
                  <span className="text-sm font-medium text-[#2E7D32]">Give Feedback</span>
                  <p className="text-xs text-gray-500">Help us improve ZircuVia</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#2E7D32]" />
            </button>
          </CardContent>
        </Card>
      )}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add app/(tourist)/profile/page.tsx
git commit -m "feat: add Give Feedback button to tourist profile page"
```

---

### Task 15: Add "Give Feedback" Button for Admin and Verifier

**Files:**
- Modify: `app/(admin)/admin/layout.tsx`
- Modify: `app/(checker)/checker/layout.tsx`

- [ ] **Step 1: Add session survey button to admin sidebar**

In `app/(admin)/admin/layout.tsx`, the sidebar already has `SurveyProvider` wrapping `{children}`. We need to add a "Give Feedback" button in the sidebar. However, the sidebar is rendered in the server component while `useSurveyContext` is client-side.

Create a small client component `components/survey/GiveFeedbackButton.tsx`:

```tsx
"use client";

import { useSurveyContext } from "@/components/survey/SurveyProvider";
import { MessageSquare } from "lucide-react";

export function GiveFeedbackButton() {
  const { sessionSurveyReady, openSessionSurvey } = useSurveyContext();

  if (!sessionSurveyReady) return null;

  return (
    <button
      onClick={openSessionSurvey}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#2E7D32] bg-green-50 hover:bg-green-100 transition text-sm w-full"
    >
      <MessageSquare className="w-5 h-5" />
      Give Feedback
    </button>
  );
}
```

- [ ] **Step 2: Add the button to admin sidebar**

In `app/(admin)/admin/layout.tsx`, add import:
```typescript
import { GiveFeedbackButton } from "@/components/survey/GiveFeedbackButton";
```

Inside the sidebar, after the `</nav>` closing tag (before the border-t sign out section), add:
```tsx
        <div className="mt-2">
          <GiveFeedbackButton />
        </div>
```

- [ ] **Step 3: Add the button to checker layout**

In `app/(checker)/checker/layout.tsx`, add import:
```typescript
import { GiveFeedbackButton } from "@/components/survey/GiveFeedbackButton";
```

Inside the header, after the `SignOutButton` div, add:
```tsx
        <div className="mt-2">
          <GiveFeedbackButton />
        </div>
```

Note: This component is inside `<main>` where `SurveyProvider` wraps children. The header is outside `<main>`, so for the checker layout, move `<GiveFeedbackButton />` inside the `<main>` tag at the top:
```tsx
      <main className="w-full max-w-md px-4 py-6">
        <SurveyProvider role="VERIFIER" variant="dialog">
          <GiveFeedbackButton />
          {children}
        </SurveyProvider>
      </main>
```

- [ ] **Step 4: Verify build**

Run:
```bash
npx next build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add components/survey/GiveFeedbackButton.tsx app/(admin)/admin/layout.tsx app/(checker)/checker/layout.tsx
git commit -m "feat: add Give Feedback button for admin sidebar and verifier layout"
```

---

## Chunk 5: Admin API & Dashboard

### Task 16: GET /api/admin/feedback Route (was Task 15)

**Files:**
- Create: `app/api/admin/feedback/route.ts`

- [ ] **Step 1: Create the admin feedback API route**

Create `app/api/admin/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import type { Prisma, Role } from "@prisma/client";

interface ResponseItem {
  questionId: string;
  questionText: string;
  type: string;
  value: string | number | string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role") as Role | null;
    const surveyTypeFilter = searchParams.get("surveyType");
    const triggerPointFilter = searchParams.get("triggerPoint");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const dateFilter = parseDateRangeFilter(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const where: Prisma.SurveyResponseWhereInput = {
      ...(roleFilter && { role: roleFilter }),
      ...(surveyTypeFilter && { surveyType: surveyTypeFilter }),
      ...(triggerPointFilter && { triggerPoint: triggerPointFilter }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const [totalCount, responses, allForAggregation] = await Promise.all([
      prisma.surveyResponse.count({ where }),
      prisma.surveyResponse.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.surveyResponse.findMany({
        where,
        select: { role: true, surveyType: true, triggerPoint: true, responses: true },
      }),
    ]);

    // Compute aggregations
    const byRole: Record<string, number> = {};
    const bySurveyType: Record<string, number> = {};
    const ratingsByTrigger: Record<string, { sum: number; count: number }> = {};
    const npsScores: number[] = [];

    for (const r of allForAggregation) {
      byRole[r.role] = (byRole[r.role] ?? 0) + 1;
      bySurveyType[r.surveyType] = (bySurveyType[r.surveyType] ?? 0) + 1;

      const items = r.responses as ResponseItem[];
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        if (
          (item.type === "rating" || item.type === "likert") &&
          typeof item.value === "number"
        ) {
          if (!ratingsByTrigger[r.triggerPoint]) {
            ratingsByTrigger[r.triggerPoint] = { sum: 0, count: 0 };
          }
          ratingsByTrigger[r.triggerPoint].sum += item.value;
          ratingsByTrigger[r.triggerPoint].count += 1;
        }
        if (item.questionId === "nps" && typeof item.value === "number") {
          npsScores.push(item.value);
        }
      }
    }

    const averageRatings: Record<string, { avg: number; count: number }> = {};
    for (const [trigger, data] of Object.entries(ratingsByTrigger)) {
      averageRatings[trigger] = {
        avg: Math.round((data.sum / data.count) * 10) / 10,
        count: data.count,
      };
    }

    // NPS = (promoters - detractors) / total * 100
    let npsScore = 0;
    if (npsScores.length > 0) {
      const promoters = npsScores.filter((s) => s >= 9).length;
      const detractors = npsScores.filter((s) => s <= 6).length;
      npsScore = Math.round(
        ((promoters - detractors) / npsScores.length) * 100
      );
    }

    return NextResponse.json({
      summary: {
        totalResponses: totalCount,
        byRole,
        bySurveyType,
        averageRatings,
        npsScore,
      },
      responses,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/feedback/route.ts
git commit -m "feat: add GET /api/admin/feedback with aggregation and pagination"
```

---

### Task 17: GET /api/export/feedback Route

**Files:**
- Create: `app/api/export/feedback/route.ts`

- [ ] **Step 1: Create the feedback export route**

Create `app/api/export/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import type { Prisma, Role } from "@prisma/client";

interface ResponseItem {
  questionId: string;
  questionText: string;
  type: string;
  value: string | number | string[];
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type") || "raw";
    const roleFilter = searchParams.get("role") as Role | null;
    const triggerPointFilter = searchParams.get("triggerPoint");
    const dateFilter = parseDateRangeFilter(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const where: Prisma.SurveyResponseWhereInput = {
      ...(roleFilter && { role: roleFilter }),
      ...(triggerPointFilter && { triggerPoint: triggerPointFilter }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const responses = await prisma.surveyResponse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    let csvContent: string;
    const dateStr = new Date().toISOString().slice(0, 10);

    if (exportType === "summary") {
      // Summary export
      const byRole: Record<string, number> = {};
      const ratingsByTrigger: Record<string, { sum: number; count: number }> = {};
      const npsScores: number[] = [];

      for (const r of responses) {
        byRole[r.role] = (byRole[r.role] ?? 0) + 1;
        const items = r.responses as ResponseItem[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if ((item.type === "rating" || item.type === "likert") && typeof item.value === "number") {
            if (!ratingsByTrigger[r.triggerPoint]) ratingsByTrigger[r.triggerPoint] = { sum: 0, count: 0 };
            ratingsByTrigger[r.triggerPoint].sum += item.value;
            ratingsByTrigger[r.triggerPoint].count += 1;
          }
          if (item.questionId === "nps" && typeof item.value === "number") {
            npsScores.push(item.value);
          }
        }
      }

      const promoters = npsScores.filter((s) => s >= 9).length;
      const detractors = npsScores.filter((s) => s <= 6).length;
      const nps = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0;

      const rows = [
        ["Metric", "Value"],
        ["Total Responses", String(responses.length)],
        ["NPS Score", String(nps)],
        ...Object.entries(byRole).map(([role, count]) => [`Responses (${role})`, String(count)]),
        ...Object.entries(ratingsByTrigger).map(([trigger, data]) => [
          `Avg Rating (${trigger})`,
          (data.sum / data.count).toFixed(1),
        ]),
      ];
      csvContent = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    } else {
      // Raw export
      const headers = ["Timestamp", "Role", "Participant", "Survey Type", "Trigger Point", "Question", "Type", "Answer"];
      const rows: string[][] = [];

      for (const r of responses) {
        const items = r.responses as ResponseItem[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          rows.push([
            new Date(r.createdAt).toISOString(),
            r.role,
            r.participantName || "",
            r.surveyType,
            r.triggerPoint,
            item.questionText,
            item.type,
            Array.isArray(item.value) ? item.value.join("; ") : String(item.value),
          ]);
        }
      }

      csvContent = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\n");
    }

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feedback-${exportType}-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/export/feedback/route.ts
git commit -m "feat: add GET /api/export/feedback CSV export route"
```

---

### Task 18: Admin Feedback Dashboard Page

**Files:**
- Create: `app/(admin)/admin/feedback/page.tsx`
- Modify: `app/(admin)/admin/layout.tsx`

- [ ] **Step 1: Add Feedback to admin sidebar navigation**

In `app/(admin)/admin/layout.tsx`, add `MessageSquare` to the lucide-react import:
```typescript
import {
  LayoutDashboard, Building2, Leaf, Receipt, Users, Calendar,
  ScrollText, Settings, MessageSquare,
} from "lucide-react";
```

Add a new entry to the `NAV_ITEMS` array literal (insert before the Settings entry). Note: the array uses `as const` — add the item inside the array literal, not via `.push()`:
```typescript
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, permission: null },
```

- [ ] **Step 2: Create the admin feedback dashboard page**

Create `app/(admin)/admin/feedback/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { MessageSquare, TrendingUp, Users, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { subDays } from "date-fns";

interface ResponseItem {
  questionId: string;
  questionText: string;
  type: string;
  value: string | number | string[];
}

interface SurveyResponseRow {
  id: string;
  role: string;
  participantName: string | null;
  surveyType: string;
  triggerPoint: string;
  responses: ResponseItem[];
  createdAt: string;
}

interface FeedbackSummary {
  totalResponses: number;
  byRole: Record<string, number>;
  bySurveyType: Record<string, number>;
  averageRatings: Record<string, { avg: number; count: number }>;
  npsScore: number;
}

interface FeedbackData {
  summary: FeedbackSummary;
  responses: SurveyResponseRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const ROLE_COLORS: Record<string, string> = {
  TOURIST: "#2E7D32",
  ADMIN: "#1565C0",
  VERIFIER: "#E65100",
};

const PIE_COLORS = ["#2E7D32", "#1565C0", "#E65100"];

export default function FeedbackDashboardPage() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [surveyTypeFilter, setSurveyTypeFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (surveyTypeFilter !== "all") params.set("surveyType", surveyTypeFilter);
      if (triggerFilter !== "all") params.set("triggerPoint", triggerFilter);
      if (dateRange) {
        params.set("from", dateRange.from.toISOString());
        params.set("to", dateRange.to.toISOString());
      }
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/feedback?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roleFilter, surveyTypeFilter, triggerFilter, dateRange, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport(type: "summary" | "raw") {
    const params = new URLSearchParams();
    params.set("type", type);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (triggerFilter !== "all") params.set("triggerPoint", triggerFilter);
    if (dateRange) {
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
    }
    window.open(`/api/export/feedback?${params}`, "_blank");
  }

  const summary = data?.summary;

  // Prepare chart data
  const barData = summary
    ? Object.entries(summary.averageRatings).map(([trigger, d]) => ({
        name: trigger.replace(/_/g, " "),
        avg: d.avg,
        count: d.count,
      }))
    : [];

  const pieData = summary
    ? Object.entries(summary.byRole).map(([role, count]) => ({
        name: role,
        value: count,
      }))
    : [];

  // Fetch ALL responses for text feedback tab (bypasses pagination)
  const [allTextResponses, setAllTextResponses] = useState<Array<{
    question: string;
    answer: string;
    role: string;
    participant: string | null;
    date: string;
    triggerPoint: string;
  }>>([]);

  useEffect(() => {
    async function fetchTextFeedback() {
      try {
        const params = new URLSearchParams();
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (triggerFilter !== "all") params.set("triggerPoint", triggerFilter);
        if (dateRange) {
          params.set("from", dateRange.from.toISOString());
          params.set("to", dateRange.to.toISOString());
        }
        params.set("page", "1");
        params.set("limit", "100"); // Fetch up to 100 for text tab

        const res = await fetch(`/api/admin/feedback?${params}`);
        if (res.ok) {
          const json = await res.json();
          const texts: typeof allTextResponses = [];
          for (const r of json.responses) {
            for (const item of r.responses) {
              if (item.type === "text" && typeof item.value === "string" && item.value.trim()) {
                texts.push({
                  question: item.questionText,
                  answer: item.value,
                  role: r.role,
                  participant: r.participantName,
                  date: r.createdAt,
                  triggerPoint: r.triggerPoint,
                });
              }
            }
          }
          setAllTextResponses(texts);
        }
      } catch {
        // silent
      }
    }
    fetchTextFeedback();
  }, [roleFilter, triggerFilter, dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-[#2E7D32]" />
          <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("summary")}>
              Export Summary (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("raw")}>
              Export All Responses (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="TOURIST">Tourist</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="VERIFIER">Verifier</SelectItem>
          </SelectContent>
        </Select>

        <Select value={surveyTypeFilter} onValueChange={(v) => { setSurveyTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="micro">Micro</SelectItem>
            <SelectItem value="session">Session</SelectItem>
          </SelectContent>
        </Select>

        <Select value={triggerFilter} onValueChange={(v) => { setTriggerFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Trigger" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            <SelectItem value="fee_payment">Fee Payment</SelectItem>
            <SelectItem value="business_review">Business Review</SelectItem>
            <SelectItem value="business_search">Business Search</SelectItem>
            <SelectItem value="business_detail">Business Detail</SelectItem>
            <SelectItem value="eco_certification">Eco Certification</SelectItem>
            <SelectItem value="analytics_view">Analytics View</SelectItem>
            <SelectItem value="check_in">Check-in</SelectItem>
            <SelectItem value="fee_scan">Fee Scan</SelectItem>
            <SelectItem value="session_end">Session End</SelectItem>
          </SelectContent>
        </Select>

        {/* "All time" toggle + DateRangeFilter */}
        <Button
          variant={dateRange === null ? "default" : "outline"}
          size="sm"
          className={dateRange === null ? "text-xs bg-[#2E7D32] hover:bg-[#1B5E20]" : "text-xs"}
          onClick={() => setDateRange(null)}
        >
          All time
        </Button>
        {dateRange !== null && (
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
          />
        )}
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-gray-500">Loading feedback data...</div>
      ) : !summary || summary.totalResponses === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No feedback collected yet.</p>
            <p className="text-sm mt-1">Surveys will appear for users as they interact with the app.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
            <TabsTrigger value="text">Text Feedback</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Responses</CardTitle>
                  <MessageSquare className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalResponses}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Avg Rating</CardTitle>
                  <TrendingUp className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {barData.length > 0
                      ? (barData.reduce((s, d) => s + d.avg * d.count, 0) / barData.reduce((s, d) => s + d.count, 0)).toFixed(1)
                      : "—"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">out of 5</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">NPS Score</CardTitle>
                  <TrendingUp className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.npsScore}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.npsScore >= 50 ? "Excellent" : summary.npsScore >= 0 ? "Good" : "Needs work"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">By Role</CardTitle>
                  <Users className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(summary.byRole).map(([role, count]) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {barData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Rating by Trigger</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="avg" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {pieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Responses by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Responses */}
          <TabsContent value="responses" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Responses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.responses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No responses match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.responses.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ color: ROLE_COLORS[r.role] }}
                        >
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.participantName || "—"}</TableCell>
                      <TableCell className="text-xs capitalize">{r.surveyType}</TableCell>
                      <TableCell className="text-xs">{r.triggerPoint.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {r.responses.map((item, i) => (
                          <div key={i} className="mb-1">
                            <span className="text-gray-400">{item.questionText}: </span>
                            <span className="font-medium">
                              {Array.isArray(item.value)
                                ? item.value.join(", ")
                                : String(item.value)}
                            </span>
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500 py-1.5">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Text Feedback */}
          <TabsContent value="text" className="space-y-4">
            {allTextResponses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No text feedback yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allTextResponses.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ color: ROLE_COLORS[item.role] }}
                        >
                          {item.role}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {item.participant || "Anonymous"} &middot; {formatDate(item.date)}
                        </span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {item.triggerPoint.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{item.question}</p>
                      <p className="text-sm text-gray-900">{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run:
```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/admin/feedback/page.tsx app/(admin)/admin/layout.tsx
git commit -m "feat: add admin feedback dashboard with overview, responses, and text tabs"
```

---

## Chunk 6: Final Verification & Cleanup

### Task 19: Full Build Verification

- [ ] **Step 1: Run full build**

Run:
```bash
npx next build 2>&1 | tail -40
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run TypeScript check**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | tail -20
```

Expected: No type errors.

- [ ] **Step 3: Test the dev server**

Run:
```bash
npx next dev
```

Manually verify:
1. Tourist app: Navigate to a business detail → micro-survey appears after delay
2. Admin dashboard: Check `/admin/feedback` page loads with empty state
3. Submit a fee payment → micro-survey appears on success page
4. After 3+ actions → "Give Feedback" appears on profile page
5. Admin: Verify the submitted responses appear in the dashboard

- [ ] **Step 4: Final commit**

If any fixes were needed, commit them:
```bash
git add -A
git commit -m "fix: address build issues from user testing survey integration"
```
