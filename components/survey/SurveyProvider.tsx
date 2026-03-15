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
