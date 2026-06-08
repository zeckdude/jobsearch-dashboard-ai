"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SetupStatus } from "@/lib/workflow-coach/setup-check";
import { DAILY_STEPS, SETUP_STEPS } from "@/lib/workflow-coach/steps";

export type SessionStep = {
  id: string;
  sessionId: string;
  stepKey: string;
  completedAt: string;
  durationSeconds: number | null;
  metadata: unknown;
};

export type WorkflowSession = {
  id: string;
  userId: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  completionPct: number;
  steps: SessionStep[];
};

type WorkflowCoachContextValue = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  session: WorkflowSession | null;
  setupStatus: SetupStatus | null;
  completedKeys: Set<string>;
  /** Mark a step done immediately (optimistic + API call) */
  markStepDone: (stepKey: string, durationSeconds?: number, metadata?: Record<string, unknown>) => Promise<void>;
  /** Remove a step's completion for today (optimistic + API call) */
  unmarkStepDone: (stepKey: string) => Promise<void>;
  /** Called by pages when user has been on the step page for the auto-complete threshold */
  autoCompleteStep: (stepKey: string) => void;
  loading: boolean;
  /** Spotlight/side-panel mode: "spotlight" | "panel" */
  guidanceMode: "spotlight" | "panel";
  setGuidanceMode: (mode: "spotlight" | "panel") => void;
  /** Whether the reminder nudge banner in the drawer has been dismissed */
  reminderNudgeDismissed: boolean;
  dismissReminderNudge: () => void;
  /** Refresh session from server */
  refreshSession: () => Promise<void>;
};

const WorkflowCoachContext = createContext<WorkflowCoachContextValue | null>(null);

const AUTO_COMPLETE_DELAY_MS = 30_000; // 30 seconds
const REMINDER_NUDGE_KEY = "wc-reminder-nudge-dismissed";
const GUIDANCE_MODE_KEY = "wc-guidance-mode";

export function WorkflowCoachProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [session, setSession] = useState<WorkflowSession | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [guidanceMode, setGuidanceModeState] = useState<"spotlight" | "panel">("spotlight");
  const [reminderNudgeDismissed, setReminderNudgeDismissed] = useState(false);

  const autoCompleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedMode = localStorage.getItem(GUIDANCE_MODE_KEY);
    if (storedMode === "panel" || storedMode === "spotlight") setGuidanceModeState(storedMode);
    const nudgeDismissed = localStorage.getItem(REMINDER_NUDGE_KEY);
    if (nudgeDismissed === "1") setReminderNudgeDismissed(true);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow-coach/session");
      if (res.ok) {
        const data = await res.json() as WorkflowSession;
        setSession(data);
      }
    } catch {
      // session fetch failure is non-fatal
    }
  }, []);

  const fetchSetupStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow-coach/setup-check");
      if (res.ok) {
        const data = await res.json() as SetupStatus;
        setSetupStatus(data);
      }
    } catch {
      // setup check failure is non-fatal
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSession(), fetchSetupStatus()]).finally(() => setLoading(false));
    // Refresh session every 5 minutes in case another tab completed steps
    const interval = setInterval(fetchSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSession, fetchSetupStatus]);

  const completedKeys = React.useMemo(
    () => new Set((session?.steps ?? []).map((s) => s.stepKey)),
    [session]
  );

  const markStepDone = useCallback(async (
    stepKey: string,
    durationSeconds?: number,
    metadata?: Record<string, unknown>
  ) => {
    // Optimistic update
    const fakeLog: SessionStep = {
      id: `optimistic-${Date.now()}`,
      sessionId: session?.id ?? "",
      stepKey,
      completedAt: new Date().toISOString(),
      durationSeconds: durationSeconds ?? null,
      metadata: metadata ?? null,
    };
    setSession((prev) =>
      prev ? { ...prev, steps: [...prev.steps, fakeLog] } : prev
    );

    try {
      await fetch("/api/workflow-coach/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepKey, durationSeconds, metadata }),
      });
      // Refresh to get accurate completionPct from server
      await fetchSession();
    } catch {
      // revert optimistic on failure
      setSession((prev) =>
        prev ? { ...prev, steps: prev.steps.filter((s) => s.id !== fakeLog.id) } : prev
      );
    }
  }, [session, fetchSession]);

  const unmarkStepDone = useCallback(async (stepKey: string) => {
    // Optimistic update — remove all logs for this stepKey
    setSession((prev) =>
      prev ? { ...prev, steps: prev.steps.filter((s) => s.stepKey !== stepKey) } : prev
    );

    try {
      await fetch("/api/workflow-coach/step", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepKey }),
      });
      await fetchSession();
    } catch {
      // revert optimistic on failure
      await fetchSession();
    }
  }, [fetchSession]);

  const autoCompleteStep = useCallback((stepKey: string) => {
    if (completedKeys.has(stepKey)) return;
    if (autoCompleteTimers.current.has(stepKey)) return;

    const timer = setTimeout(() => {
      autoCompleteTimers.current.delete(stepKey);
      void markStepDone(stepKey, AUTO_COMPLETE_DELAY_MS / 1000);
    }, AUTO_COMPLETE_DELAY_MS);

    autoCompleteTimers.current.set(stepKey, timer);

    return () => {
      clearTimeout(timer);
      autoCompleteTimers.current.delete(stepKey);
    };
  }, [completedKeys, markStepDone]);

  const setGuidanceMode = useCallback((mode: "spotlight" | "panel") => {
    setGuidanceModeState(mode);
    localStorage.setItem(GUIDANCE_MODE_KEY, mode);
  }, []);

  const dismissReminderNudge = useCallback(() => {
    setReminderNudgeDismissed(true);
    localStorage.setItem(REMINDER_NUDGE_KEY, "1");
  }, []);

  const value: WorkflowCoachContextValue = {
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    session,
    setupStatus,
    completedKeys,
    markStepDone,
    unmarkStepDone,
    autoCompleteStep,
    loading,
    guidanceMode,
    setGuidanceMode,
    reminderNudgeDismissed,
    dismissReminderNudge,
    refreshSession: fetchSession,
  };

  return (
    <WorkflowCoachContext.Provider value={value}>
      {children}
    </WorkflowCoachContext.Provider>
  );
}

export function useWorkflowCoach(): WorkflowCoachContextValue {
  const ctx = useContext(WorkflowCoachContext);
  if (!ctx) throw new Error("useWorkflowCoach must be used inside WorkflowCoachProvider");
  return ctx;
}

/** Returns how many daily (non-weekly) steps are done today and the total. */
export function useDailyProgress() {
  const { completedKeys } = useWorkflowCoach();
  const dailyNonWeekly = DAILY_STEPS.filter((s) => s.timing !== "weekly");
  const done = dailyNonWeekly.filter((s) => completedKeys.has(s.key)).length;
  return { done, total: dailyNonWeekly.length };
}

/** Returns whether setup is complete. */
export function useSetupComplete() {
  const { setupStatus } = useWorkflowCoach();
  return setupStatus?.allPassed ?? true;
}

export { DAILY_STEPS, SETUP_STEPS };
