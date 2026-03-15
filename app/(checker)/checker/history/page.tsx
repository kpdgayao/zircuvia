"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GiveFeedbackButton } from "@/components/survey/GiveFeedbackButton";
import { handleAuthError } from "@/lib/checker-utils";
import {
  ChevronLeft, ChevronRight, Loader2, WifiOff, ClipboardList,
  Users, TrendingUp, CalendarCheck, ArrowUp, ArrowDown, Minus,
} from "lucide-react";

interface HistoryCheckIn {
  id: string;
  verifiedAt: string;
  totalPersons: number;
  feePayment: {
    referenceId: string;
    user: { firstName: string; lastName: string };
  };
}

interface HistorySummary {
  totalPersons: number;
  checkInCount: number;
}

interface WeeklySummary {
  totalPersons: number;
  checkInCount: number;
  dailyAverage: number;
  todayPersons: number;
  todayVsAverage: "above" | "below" | "equal";
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  return target.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [summary, setSummary] = useState<HistorySummary>({ totalPersons: 0, checkInCount: 0 });
  const [checkIns, setCheckIns] = useState<HistoryCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);

  const fetchHistory = useCallback(async (date: Date) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/checker/history?date=${toDateString(date)}`);
      if (handleAuthError(res, router)) return;
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data.summary);
      setCheckIns(data.checkIns);
      setWeeklySummary(data.weeklySummary ?? null);
    } catch {
      setError(true);
      setSummary({ totalPersons: 0, checkInCount: 0 });
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHistory(currentDate);
  }, [currentDate, fetchHistory]);

  function goToPreviousDay() {
    setCurrentDate((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  }

  function goToNextDay() {
    if (isToday(currentDate)) return;
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Weekly Summary */}
      {weeklySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-gray-500">This Week</CardTitle>
              <Users className="h-4 w-4 text-[#2E7D32]" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{weeklySummary.totalPersons}</div>
              <p className="text-[10px] text-gray-400">{weeklySummary.checkInCount} check-in(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-gray-500">Daily Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#2E7D32]" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{weeklySummary.dailyAverage}</div>
              <p className="text-[10px] text-gray-400">visitors / day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-gray-500">Today</CardTitle>
              <CalendarCheck className="h-4 w-4 text-[#2E7D32]" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold">{weeklySummary.todayPersons}</span>
                {weeklySummary.todayVsAverage === "above" && (
                  <ArrowUp className="h-4 w-4 text-green-600" />
                )}
                {weeklySummary.todayVsAverage === "below" && (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
                {weeklySummary.todayVsAverage === "equal" && (
                  <Minus className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <p className="text-[10px] text-gray-400">vs. daily average</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date header + summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-800">
          {formatDateLabel(currentDate)} — {formatFullDate(currentDate)}
        </p>
        {!loading && !error && (
          <p className="text-xs text-gray-500 mt-1">
            {summary.totalPersons} visitor(s) verified &middot; {summary.checkInCount} check-in(s)
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading check-ins...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-8 space-y-3">
          <WifiOff className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-500">Connection error. Check your signal and try again.</p>
          <Button variant="outline" size="sm" onClick={() => fetchHistory(currentDate)}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && checkIns.length === 0 && (
        <div className="text-center py-8">
          <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No check-ins recorded for this day</p>
        </div>
      )}

      {/* Check-in list */}
      {!loading && !error && checkIns.length > 0 && (
        <div className="space-y-2">
          {checkIns.map((ci) => (
            <Card key={ci.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {ci.feePayment.user.firstName} {ci.feePayment.user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ci.totalPersons} person(s) &middot; {ci.feePayment.referenceId}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatTime(ci.verifiedAt)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Day navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={goToPreviousDay}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous Day
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          disabled={isToday(currentDate)}
        >
          Next Day <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Feedback button (moved from header) */}
      <div className="pt-4 border-t">
        <GiveFeedbackButton />
      </div>
    </div>
  );
}
