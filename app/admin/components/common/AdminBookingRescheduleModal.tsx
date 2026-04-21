"use client";

import { useState } from "react";

type BookingWindow = {
  bookingWindowId: string;
  slotIds: string[];
  displayLabel: string;
  teamName: string;
};

type Props = {
  isOpen: boolean;
  bookingLabel?: string;
  initialDate?: string | null;
  city: string;
  petCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (slotIds: string[]) => Promise<void>;
};

export function AdminBookingRescheduleModal({
  isOpen,
  bookingLabel,
  initialDate,
  city,
  petCount,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [date, setDate] = useState(initialDate ?? "");
  const [windows, setWindows] = useState<BookingWindow[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const selectedWindow = windows.find((window) => window.bookingWindowId === selectedWindowId) ?? null;

  const loadAvailability = async () => {
    if (!date) {
      setError("Choose a date first.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSelectedWindowId("");
      const response = await fetch("/api/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          startDate: date,
          days: 1,
          petCount,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to fetch windows");

      const nextWindows = (data?.dates?.[0]?.bookingWindows ?? []) as BookingWindow[];
      setWindows(nextWindows);
      if (!nextWindows.length) setError("No booking windows available for that date.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch booking windows");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedWindow) {
      setError("Select a booking window first.");
      return;
    }
    try {
      setError("");
      await onSubmit(selectedWindow.slotIds);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to reschedule booking");
    }
  };

  return (
    <div className="fixed inset-0 z-[340] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[760px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">Reschedule booking</div>
        {bookingLabel ? <div className="mt-1 text-[13px] text-[#7c8499]">{bookingLabel}</div> : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-[46px] flex-1 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
          />
          <button
            type="button"
            onClick={() => void loadAvailability()}
            disabled={isLoading}
            className="h-[46px] rounded-[14px] border border-[#ddd1fb] bg-[#faf9fd] px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f0ecfa] disabled:opacity-60 transition-colors"
          >
            {isLoading ? "Checking…" : "Check availability"}
          </button>
        </div>

        <div className="mt-2 text-[12px] text-[#8a90a6]">
          {city} · {petCount} pet{petCount > 1 ? "s" : ""}
        </div>

        {error ? (
          <div className="mt-4 rounded-[14px] border border-[#f7d7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
            {error}
          </div>
        ) : null}

        <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto">
          {windows.map((window) => (
            <button
              key={window.bookingWindowId}
              type="button"
              onClick={() => setSelectedWindowId(window.bookingWindowId)}
              className={`w-full rounded-[16px] border px-4 py-3 text-left transition-colors ${
                selectedWindowId === window.bookingWindowId
                  ? "border-[#6d5bd0] bg-[#f6f4fd]"
                  : "border-[#ece5ff] bg-white hover:bg-[#faf9fd]"
              }`}
            >
              <div className="text-[14px] font-semibold text-[#2a2346]">{window.displayLabel}</div>
              <div className="mt-1 text-[12px] text-[#7c8499]">{window.teamName}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !selectedWindow}
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 hover:bg-[#5b4ab5] transition-colors"
          >
            {isSubmitting ? "Saving…" : "Confirm reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
