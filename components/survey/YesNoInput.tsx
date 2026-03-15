"use client";

import { cn } from "@/lib/utils";

interface YesNoInputProps {
  value: string | null;
  onChange: (value: string) => void;
  includePartial?: boolean;
}

export function YesNoInput({ value, onChange, includePartial = false }: YesNoInputProps) {
  const options = includePartial ? ["Yes", "Partially", "No"] : ["Yes", "No"];
  return (
    <div className="flex gap-2 justify-center">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)}
          className={cn("px-5 py-2 rounded-full text-sm font-medium transition-all",
            value === option ? "bg-[#2E7D32] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}>
          {option}
        </button>
      ))}
    </div>
  );
}
