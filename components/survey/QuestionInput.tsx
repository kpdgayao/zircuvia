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
      return <RatingInput value={typeof value === "number" ? value : null} onChange={onChange} labels={{ low: "Poor", high: "Excellent" }} />;
    case "likert":
      return <RatingInput value={typeof value === "number" ? value : null} onChange={onChange} labels={{ low: "Strongly disagree", high: "Strongly agree" }} />;
    case "nps":
      return <NpsInput value={typeof value === "number" ? value : null} onChange={onChange} />;
    case "yes_no":
      return <YesNoInput value={typeof value === "string" ? value : null} onChange={onChange} />;
    case "yes_no_partial":
      return <YesNoInput value={typeof value === "string" ? value : null} onChange={onChange} includePartial />;
    case "multi_select":
      return <MultiSelectInput options={question.options ?? []} value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case "text":
      return <Textarea value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="Type your feedback..." rows={3} maxLength={500} className="text-sm resize-none" />;
  }
}

function MultiSelectInput({ options, value, onChange }: { options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => toggle(option)}
          className={value.includes(option)
            ? "px-3 py-1.5 rounded-full text-xs font-medium bg-[#2E7D32] text-white"
            : "px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          }>
          {option}
        </button>
      ))}
    </div>
  );
}
