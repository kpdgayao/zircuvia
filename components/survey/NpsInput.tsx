"use client";

import { cn } from "@/lib/utils";

interface NpsInputProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function NpsInput({ value, onChange }: NpsInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1 justify-center flex-wrap">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cn("w-10 h-10 rounded-lg text-xs font-medium transition-all",
              value === n ? "bg-[#2E7D32] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  );
}
