import { useEffect, useState } from "react";

export type SessionState = {
  bookingId: string;
  status: "idle" | "en_route" | "arrived" | "session_active" | "review" | "complete";
  currentPhaseIndex: number;
  secondsElapsed: number;
  completedStepKeys: string[];
  startedAt: string | null; // ISO timestamp when session started
};

const SESSION_STORAGE_KEY = "groomer_session_state";

export function useSessionState(bookingId: string) {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionState;
        // Only restore if it's the same booking
        if (parsed.bookingId === bookingId) {
          setSessionState(parsed);
        } else {
          // Different booking, clear old session
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    setIsHydrated(true);
  }, [bookingId]);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (sessionState) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
    }
  }, [sessionState]);

  const updateStatus = (status: SessionState["status"]) => {
    setSessionState((prev) =>
      prev ? { ...prev, status } : null
    );
  };

  const startSession = () => {
    setSessionState((prev) =>
      prev
        ? {
            ...prev,
            status: "session_active",
            startedAt: new Date().toISOString(),
            secondsElapsed: 0,
          }
        : null
    );
  };

  const updatePhaseIndex = (phaseIndex: number) => {
    setSessionState((prev) =>
      prev ? { ...prev, currentPhaseIndex: phaseIndex } : null
    );
  };

  const updateSecondsElapsed = (seconds: number) => {
    setSessionState((prev) =>
      prev ? { ...prev, secondsElapsed: seconds } : null
    );
  };

  const completeStep = (stepKey: string) => {
    setSessionState((prev) =>
      prev
        ? {
            ...prev,
            completedStepKeys: [...new Set([...prev.completedStepKeys, stepKey])],
          }
        : null
    );
  };

  const initializeSession = () => {
    setSessionState({
      bookingId,
      status: "idle",
      currentPhaseIndex: 0,
      secondsElapsed: 0,
      completedStepKeys: [],
      startedAt: null,
    });
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionState(null);
  };

  return {
    sessionState,
    isHydrated,
    initializeSession,
    updateStatus,
    startSession,
    updatePhaseIndex,
    updateSecondsElapsed,
    completeStep,
    clearSession,
  };
}
