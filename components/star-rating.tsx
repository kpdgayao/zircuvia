"use client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-6 h-6",
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "md",
  className,
}: StarRatingProps) {
  const isInteractive = typeof onChange === "function";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= value;
        return (
          <button
            key={i}
            type="button"
            disabled={!isInteractive}
            onClick={() => isInteractive && onChange(i + 1)}
            className={cn(
              "transition-transform",
              isInteractive
                ? "cursor-pointer hover:scale-110 focus:outline-none"
                : "cursor-default"
            )}
            aria-label={`${i + 1} star${i + 1 !== 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                SIZE_MAP[size],
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-300"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
