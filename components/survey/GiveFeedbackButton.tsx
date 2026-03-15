"use client";

import { useSurveyContext } from "@/components/survey/SurveyProvider";
import { MessageSquare, ChevronRight } from "lucide-react";

interface GiveFeedbackButtonProps {
  subtitle?: string;
  showChevron?: boolean;
}

export function GiveFeedbackButton({ subtitle, showChevron }: GiveFeedbackButtonProps) {
  const { openSessionSurvey } = useSurveyContext();
  return (
    <button onClick={openSessionSurvey}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#2E7D32] bg-green-50 hover:bg-green-100 transition text-sm w-full">
      <MessageSquare className="w-5 h-5 shrink-0" />
      <div className="flex-1 text-left">
        <span>Give Feedback</span>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {showChevron && <ChevronRight className="w-4 h-4 shrink-0" />}
    </button>
  );
}
