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
  ) => Promise<void> | void;
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
    await onComplete(participantName.trim() || undefined, responseItems);
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
                        : "\u2014"}
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
