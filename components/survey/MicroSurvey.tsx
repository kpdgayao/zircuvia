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
  ) => Promise<void> | void;
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
    await onComplete(responseItems);
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
