"use client";

import { useState, useCallback, useRef } from "react";
import type { Role } from "@prisma/client";
import type { SurveyConfig } from "@/lib/survey-config";
import { getSurveyForTrigger, getSessionSurvey } from "@/lib/survey-config";

const STORAGE_KEY_ACTIONS = "zv_survey_actions";
const STORAGE_KEY_COOLDOWN = "zv_survey_cooldown";
const STORAGE_KEY_DAILY = "zv_survey_daily";
const STORAGE_KEY_DISMISSED = "zv_survey_dismissed";

function getSessionStorage<T>(key: string, fallback: T): T {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setSessionStorage(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage unavailable — silent fail
  }
}

function getLocalStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable — silent fail
  }
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isCooldownActive(cooldownMinutes: number): boolean {
  if (cooldownMinutes <= 0) return false;
  const lastShown = getSessionStorage<number>(STORAGE_KEY_COOLDOWN, 0);
  if (!lastShown) return false;
  return Date.now() - lastShown < cooldownMinutes * 60 * 1000;
}

function getDailyCount(surveyId: string): number {
  const daily = getLocalStorage<Record<string, Record<string, number>>>(
    STORAGE_KEY_DAILY,
    {}
  );
  const today = getTodayKey();
  return daily[today]?.[surveyId] ?? 0;
}

function incrementDailyCount(surveyId: string): void {
  const daily = getLocalStorage<Record<string, Record<string, number>>>(
    STORAGE_KEY_DAILY,
    {}
  );
  const today = getTodayKey();
  if (!daily[today]) daily[today] = {};
  daily[today][surveyId] = (daily[today][surveyId] ?? 0) + 1;
  setLocalStorage(STORAGE_KEY_DAILY, daily);
}

function isDismissed(triggerPoint: string): boolean {
  const dismissed = getSessionStorage<string[]>(STORAGE_KEY_DISMISSED, []);
  return dismissed.includes(triggerPoint);
}

function markDismissed(triggerPoint: string): void {
  const dismissed = getSessionStorage<string[]>(STORAGE_KEY_DISMISSED, []);
  if (!dismissed.includes(triggerPoint)) {
    dismissed.push(triggerPoint);
    setSessionStorage(STORAGE_KEY_DISMISSED, dismissed);
  }
}

export interface UseSurveyTriggerReturn {
  activeSurvey: SurveyConfig | null;
  sessionSurveyReady: boolean;
  markAction: (triggerPoint: string) => void;
  openSessionSurvey: () => void;
  dismiss: () => void;
  complete: () => void;
}

export function useSurveyTrigger(role: Role): UseSurveyTriggerReturn {
  const [activeSurvey, setActiveSurvey] = useState<SurveyConfig | null>(null);
  const [sessionSurveyReady, setSessionSurveyReady] = useState(false);
  // Use ref to avoid stale closures in markAction
  const activeSurveyRef = useRef<SurveyConfig | null>(null);
  const sessionSurveyReadyRef = useRef(false);

  const updateActionCount = useCallback((actionCount: number) => {
    if (sessionSurveyReadyRef.current) return;
    if (actionCount >= 3) {
      sessionSurveyReadyRef.current = true;
      setSessionSurveyReady(true);
    }
  }, []);

  const markAction = useCallback(
    (triggerPoint: string) => {
      // Record the action
      const actions = getSessionStorage<Record<string, boolean>>(
        STORAGE_KEY_ACTIONS,
        {}
      );
      actions[triggerPoint] = true;
      setSessionStorage(STORAGE_KEY_ACTIONS, actions);
      updateActionCount(Object.keys(actions).length);

      // Don't show survey if one is already active
      if (activeSurveyRef.current) return;

      // Don't show if dismissed this session
      if (isDismissed(triggerPoint)) return;

      // Find matching micro-survey
      const survey = getSurveyForTrigger(triggerPoint, role);
      if (!survey) return;

      // Don't show if cooldown active (uses survey-specific cooldownMinutes)
      if (isCooldownActive(survey.cooldownMinutes)) return;

      // Check daily cap
      if (getDailyCount(survey.id) >= survey.maxShowsPerDay) return;

      // Show the survey
      activeSurveyRef.current = survey;
      setActiveSurvey(survey);
    },
    [role, updateActionCount]
  );

  const openSessionSurvey = useCallback(() => {
    const survey = getSessionSurvey(role);
    if (!survey) return;
    if (getDailyCount(survey.id) >= survey.maxShowsPerDay) return;
    activeSurveyRef.current = survey;
    setActiveSurvey(survey);
  }, [role]);

  const dismiss = useCallback(() => {
    if (activeSurveyRef.current) {
      markDismissed(activeSurveyRef.current.triggerPoint);
    }
    activeSurveyRef.current = null;
    setActiveSurvey(null);
  }, []);

  const complete = useCallback(() => {
    if (activeSurveyRef.current) {
      incrementDailyCount(activeSurveyRef.current.id);
      setSessionStorage(STORAGE_KEY_COOLDOWN, Date.now());
    }
    activeSurveyRef.current = null;
    setActiveSurvey(null);
  }, []);

  return {
    activeSurvey,
    sessionSurveyReady,
    markAction,
    openSessionSurvey,
    dismiss,
    complete,
  };
}
