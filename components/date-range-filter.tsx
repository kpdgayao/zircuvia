"use client";
import { useState } from "react";
import { format, subDays, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type Preset = "7d" | "30d" | "3mo" | "6mo" | "custom";

interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
}

const PRESETS: { label: string; value: Preset }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "3 months", value: "3mo" },
  { label: "6 months", value: "6mo" },
  { label: "Custom", value: "custom" },
];

function getPresetRange(preset: Preset): DateRangeValue {
  const now = new Date();
  switch (preset) {
    case "7d":
      return { from: subDays(now, 7), to: now };
    case "30d":
      return { from: subDays(now, 30), to: now };
    case "3mo":
      return { from: subMonths(now, 3), to: now };
    case "6mo":
      return { from: subMonths(now, 6), to: now };
    default:
      return { from: subDays(now, 30), to: now };
  }
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<Preset>("30d");
  const [calendarRange, setCalendarRange] = useState<DateRange>({
    from: value.from,
    to: value.to,
  });

  const handlePreset = (preset: Preset) => {
    setActivePreset(preset);
    if (preset !== "custom") {
      const range = getPresetRange(preset);
      onChange(range);
      setCalendarRange({ from: range.from, to: range.to });
    }
  };

  const handleCalendarChange = (range: DateRange | undefined) => {
    if (!range) return;
    setCalendarRange(range);
    if (range.from && range.to) {
      onChange({ from: range.from, to: range.to });
    }
  };

  const calendarLabel =
    calendarRange.from
      ? calendarRange.to
        ? `${format(calendarRange.from, "MMM d")} – ${format(calendarRange.to, "MMM d, yyyy")}`
        : format(calendarRange.from, "MMM d, yyyy")
      : "Pick dates";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.value}
            variant={activePreset === preset.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(preset.value)}
            className={cn(
              "text-xs",
              activePreset === preset.value && "bg-[#2E7D32] hover:bg-[#1B5E20]"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {activePreset === "custom" && (
        <Popover>
          <PopoverTrigger
            className="inline-flex items-center gap-1 text-xs border border-border rounded-lg px-2.5 h-7 bg-background hover:bg-muted transition-colors"
          >
            <CalendarIcon className="h-3 w-3" />
            {calendarLabel}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={calendarRange}
              onSelect={handleCalendarChange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
