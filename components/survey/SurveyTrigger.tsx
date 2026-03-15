"use client";

import { useEffect } from "react";
import { useSurveyContext } from "@/components/survey/SurveyProvider";

export function SurveyTrigger({ triggerPoint, delay = 0 }: { triggerPoint: string; delay?: number }) {
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
