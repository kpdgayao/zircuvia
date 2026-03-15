"use client";

import { useSurveyContext } from "@/components/survey/SurveyProvider";
import { MessageSquare } from "lucide-react";

export function GiveFeedbackButton() {
  const { sessionSurveyReady, openSessionSurvey } = useSurveyContext();
  if (!sessionSurveyReady) return null;
  return (
    <button onClick={openSessionSurvey}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#2E7D32] bg-green-50 hover:bg-green-100 transition text-sm w-full">
      <MessageSquare className="w-5 h-5" />
      Give Feedback
    </button>
  );
}
