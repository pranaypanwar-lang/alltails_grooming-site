"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  enqueueUpload,
  enqueueAction,
  getAllPending,
  removeItem,
  incrementRetry,
  dataUrlToFile,
  type OfflineQueueItem,
} from "../../../../../lib/groomer/offlineQueue";

export type SyncStatus = "idle" | "syncing" | "synced" | "failed";

export type StepSyncState = {
  pendingCount: number;
  status: SyncStatus;
};

const MAX_RETRIES = 5;

export function useOfflineQueue(bookingId: string, tokenQuery: string) {
  const [stepSyncMap, setStepSyncMap] = useState<Record<string, StepSyncState>>({});
  const [totalPending, setTotalPending] = useState(0);
  const syncingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    try {
      const items = await getAllPending();
      const mine = items.filter((item) => item.bookingId === bookingId);
      const map: Record<string, StepSyncState> = {};
      for (const item of mine) {
        const key = item.stepKey;
        map[key] = {
          pendingCount: (map[key]?.pendingCount ?? 0) + 1,
          status: "pending" in map ? map[key].status : "idle",
        };
      }
      setStepSyncMap(map);
      setTotalPending(mine.length);
    } catch {
      // IndexedDB unavailable (SSR or private mode)
    }
  }, [bookingId]);

  const runSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;

    try {
      const items = await getAllPending();
      const mine = items
        .filter((item) => item.bookingId === bookingId && item.retryCount < MAX_RETRIES)
        .sort((a, b) => a.createdAt - b.createdAt);

      if (!mine.length) { syncingRef.current = false; return; }

      // Mark all as syncing
      setStepSyncMap((prev) => {
        const next = { ...prev };
        for (const item of mine) {
          next[item.stepKey] = { pendingCount: next[item.stepKey]?.pendingCount ?? 1, status: "syncing" };
        }
        return next;
      });

      for (const item of mine) {
        try {
          if (item.type === "upload") {
            await replayUpload(item, tokenQuery);
          } else {
            await replayAction(item, tokenQuery);
          }
          await removeItem(item.id);
          setStepSyncMap((prev) => {
            const next = { ...prev };
            const remaining = (next[item.stepKey]?.pendingCount ?? 1) - 1;
            if (remaining <= 0) {
              next[item.stepKey] = { pendingCount: 0, status: "synced" };
            } else {
              next[item.stepKey] = { pendingCount: remaining, status: "syncing" };
            }
            return next;
          });
        } catch {
          await incrementRetry(item.id);
          setStepSyncMap((prev) => ({
            ...prev,
            [item.stepKey]: { pendingCount: prev[item.stepKey]?.pendingCount ?? 1, status: "failed" },
          }));
        }
      }
    } finally {
      syncingRef.current = false;
      await refreshCounts();
    }
  }, [bookingId, tokenQuery, refreshCounts]);

  useEffect(() => {
    void refreshCounts();

    const onOnline = () => { void runSync(); };
    window.addEventListener("online", onOnline);
    // Attempt sync on mount too (in case items queued from previous session)
    if (navigator.onLine) void runSync();

    return () => window.removeEventListener("online", onOnline);
  }, [refreshCounts, runSync]);

  const queueUpload = useCallback(
    async (stepKey: string, file: File): Promise<void> => {
      if (navigator.onLine) {
        // Caller should try the real upload first; this is only called on failure
      }
      await enqueueUpload(bookingId, stepKey, file);
      setStepSyncMap((prev) => ({
        ...prev,
        [stepKey]: { pendingCount: (prev[stepKey]?.pendingCount ?? 0) + 1, status: "idle" },
      }));
      setTotalPending((p) => p + 1);
    },
    [bookingId]
  );

  const queueAction = useCallback(
    async (stepKey: string, payload: Record<string, unknown>): Promise<void> => {
      await enqueueAction(bookingId, stepKey, payload);
      setStepSyncMap((prev) => ({
        ...prev,
        [stepKey]: { pendingCount: (prev[stepKey]?.pendingCount ?? 0) + 1, status: "idle" },
      }));
      setTotalPending((p) => p + 1);
    },
    [bookingId]
  );

  return { stepSyncMap, totalPending, queueUpload, queueAction, runSync };
}

async function replayUpload(item: OfflineQueueItem, tokenQuery: string) {
  const file = await dataUrlToFile(
    item.payload,
    item.fileName ?? "proof",
    item.mimeType ?? "image/jpeg"
  );
  const formData = new FormData();
  formData.set("stepKey", item.stepKey);
  formData.set("file", file, file.name);

  const res = await fetch(
    `/api/groomer/bookings/${item.bookingId}/sop/proof${tokenQuery}`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Upload failed");
  }
}

async function replayAction(item: OfflineQueueItem, tokenQuery: string) {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;
  const res = await fetch(
    `/api/groomer/bookings/${item.bookingId}/sop/step${tokenQuery}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Action failed");
  }
}
