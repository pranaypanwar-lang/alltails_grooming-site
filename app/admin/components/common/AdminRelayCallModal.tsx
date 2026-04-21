"use client";

import { useState } from "react";
import { Phone, X } from "lucide-react";

const OUTCOMES = [
  { value: "connected", label: "Connected", desc: "Call went through and team answered" },
  { value: "no_answer", label: "No answer", desc: "Called but team did not pick up" },
  { value: "voicemail", label: "Voicemail", desc: "Left a voicemail" },
  { value: "failed", label: "Failed", desc: "Call could not be placed" },
] as const;

type Outcome = (typeof OUTCOMES)[number]["value"];

export type RelayCallSubmitPayload = { outcome: Outcome };

type Props = {
  isOpen: boolean;
  bookingLabel?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: RelayCallSubmitPayload) => void;
};

export function AdminRelayCallModal({ isOpen, bookingLabel, isSubmitting, onClose, onSubmit }: Props) {
  const [outcome, setOutcome] = useState<Outcome>("connected");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Log relay call</h3>
            {bookingLabel && (
              <p className="mt-0.5 text-[12px] text-[#6b7280]">{bookingLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2 mb-5">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              className={`w-full flex items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors ${
                outcome === o.value
                  ? "border-[#6d5bd0] bg-[#f6f4fd]"
                  : "border-[#ece8f5] bg-white hover:bg-[#faf9fd]"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                outcome === o.value ? "bg-[#6d5bd0] text-white" : "bg-[#f3f4f6] text-[#6b7280]"
              }`}>
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className={`text-[13px] font-semibold ${outcome === o.value ? "text-[#1f1f2c]" : "text-[#374151]"}`}>
                  {o.label}
                </p>
                <p className="text-[11px] text-[#9ca3af]">{o.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
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
            onClick={() => onSubmit({ outcome })}
            disabled={isSubmitting}
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50 hover:bg-[#5a4abf] transition-colors"
          >
            {isSubmitting ? "Logging…" : "Log call"}
          </button>
        </div>
      </div>
    </div>
  );
}
