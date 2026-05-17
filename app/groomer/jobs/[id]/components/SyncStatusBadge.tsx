"use client";

import { CheckCircle2, Clock, RefreshCw, WifiOff } from "lucide-react";
import type { SyncStatus } from "../hooks/useOfflineQueue";

type Props = {
  status: SyncStatus;
  pendingCount?: number;
  mode: "simple" | "hindi";
  onRetry?: () => void;
};

export function SyncStatusBadge({ status, pendingCount, mode, onRetry }: Props) {
  if (status === "idle" && (pendingCount ?? 0) > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[11px] font-semibold text-[#92400e]">
        <WifiOff className="h-3 w-3" />
        {mode === "simple" ? "Saved offline" : "ऑफलाइन सेव"}
      </span>
    );
  }

  if (status === "syncing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#dbeafe] px-2.5 py-1 text-[11px] font-semibold text-[#1e40af]">
        <Clock className="h-3 w-3 animate-spin" />
        {mode === "simple" ? "Syncing..." : "सिंक हो रहा है..."}
      </span>
    );
  }

  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 rounded-full bg-[#fee2e2] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c]"
      >
        <RefreshCw className="h-3 w-3" />
        {mode === "simple" ? "Retry" : "फिर कोशिश करें"}
      </button>
    );
  }

  if (status === "synced") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#15803d]">
        <CheckCircle2 className="h-3 w-3" />
        {mode === "simple" ? "Synced" : "सिंक हो गया"}
      </span>
    );
  }

  return null;
}
