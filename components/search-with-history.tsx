"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface SearchWithHistoryProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  storageKey?: string;
}

const MAX_HISTORY = 8;

export function SearchWithHistory({
  value,
  onChange,
  onSearch,
  placeholder = "Search…",
  storageKey = "search_history",
}: SearchWithHistoryProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveToHistory = (query: string) => {
    if (!query.trim()) return;
    const updated = [
      query,
      ...history.filter((h) => h !== query),
    ].slice(0, MAX_HISTORY);
    setHistory(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeFromHistory = (entry: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== entry);
    setHistory(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      saveToHistory(value.trim());
      onSearch(value.trim());
      setOpen(false);
    }
  };

  const handleHistoryClick = (entry: string) => {
    onChange(entry);
    saveToHistory(entry);
    onSearch(entry);
    setOpen(false);
  };

  const showPopover = open && history.length > 0;

  return (
    <div className="relative w-full">
      <Popover open={showPopover} onOpenChange={setOpen}>
        {/* Invisible trigger anchors the popover to this container */}
        <PopoverTrigger className="absolute inset-0 pointer-events-none opacity-0" aria-hidden />

        <form onSubmit={handleSubmit} className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (history.length > 0) setOpen(true);
            }}
            onBlur={() => {
              // Delay to allow click on history items
              setTimeout(() => setOpen(false), 150);
            }}
            placeholder={placeholder}
            className="pl-9"
          />
        </form>

        <PopoverContent
          className="p-1"
          align="start"
          style={{ width: "var(--available-width, 100%)" }}
        >
          <p className="text-xs text-gray-500 px-2 py-1">Recent searches</p>
          {history.map((entry) => (
            <div
              key={entry}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer group"
              onMouseDown={(e) => {
                e.preventDefault();
                handleHistoryClick(entry);
              }}
            >
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="truncate">{entry}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
                onClick={(e) => removeFromHistory(entry, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
