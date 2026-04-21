"use client";

import { useState } from "react";
import { Clock3, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  date: string;
  teamName?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { startTime: string; endTime: string; reason: string }) => void;
};

export function AdminSlotRangeBlockModal({
  isOpen,
  date,
  teamName,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const canSubmit = !isSubmitting && reason.trim().length > 0 && startTime < endTime;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f4fd] text-[#6d5bd0]">
                <Clock3 className="h-4 w-4" />
              </div>
              <h3 className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Block time range</h3>
            </div>
            <p className="mt-1 text-[12px] text-[#6b7280]">
              {date} {teamName ? `· ${teamName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">Start time</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-[44px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">End time</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-[44px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Block reason <span className="text-[#b42318]">*</span>
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are these slots being blocked?"
            className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px] outline-none focus:border-[#6d5bd0] resize-none"
          />
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ startTime, endTime, reason })}
            disabled={!canSubmit}
            className="rounded-[12px] bg-[#c24134] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50 hover:bg-[#a93528] transition-colors"
          >
            {isSubmitting ? "Blocking…" : "Block range"}
          </button>
        </div>
      </div>
    </div>
  );
}
