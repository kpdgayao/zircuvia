"use client";

import { cn } from "@/lib/utils";

interface RatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
  labels?: { low: string; high: string };
}

export function RatingInput({ value, onChange, max = 5, labels }: RatingInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-2 justify-center">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cn("w-10 h-10 rounded-lg text-sm font-medium transition-all",
              value === n ? "bg-[#2E7D32] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}>
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
