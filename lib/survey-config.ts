import type { Role } from "@prisma/client";

/** Shared type for a single question-answer pair in a survey response JSON */
export interface SurveyResponseItem {
  questionId: string;
  questionText: string;
  type: string;
  value: string | number | string[];
}

/** Compute NPS score from an array of 0-10 ratings */
export function computeNps(scores: number[]): number {
  if (scores.length === 0) return 0;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

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
