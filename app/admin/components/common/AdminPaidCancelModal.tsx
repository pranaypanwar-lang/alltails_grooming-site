"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { PaidCancelPayload } from "../../lib/api";

type RefundMode = PaidCancelPayload["refundMode"];

const REFUND_MODES: { value: RefundMode; label: string; desc: string }[] = [
  { value: "manual_refund", label: "Manual refund", desc: "You'll process refund via bank transfer or UPI" },
  { value: "razorpay_refund", label: "Razorpay refund", desc: "Raise refund on Razorpay dashboard" },
  { value: "waived", label: "No refund (waived)", desc: "Cancel without issuing any refund" },
];

type Props = {
  isOpen: boolean;
  bookingLabel?: string;
  finalAmount?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: PaidCancelPayload) => void;
};

export function AdminPaidCancelModal({ isOpen, bookingLabel, finalAmount, isSubmitting, onClose, onSubmit }: Props) {
  const [refundMode, setRefundMode] = useState<RefundMode>("manual_refund");
  const [reason, setReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  if (!isOpen) return null;

  const canSubmit = reason.trim().length > 0 && !isSubmitting;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fef2f2]">
              <AlertTriangle className="w-4 h-4 text-[#b42318]" />
            </div>
            <h3 className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Cancel paid booking</h3>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {bookingLabel && <p className="mb-4 ml-10 text-[12px] text-[#6b7280]">{bookingLabel}</p>}
        {finalAmount != null && (
          <div className="mb-4 ml-10 rounded-[10px] border border-[#fee2e2] bg-[#fff5f5] px-3 py-2">
            <p className="text-[12px] font-semibold text-[#b42318]">
              Paid amount: ₹{finalAmount.toLocaleString("en-IN")} — select refund handling below
            </p>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {REFUND_MODES.map((m) => (
            <button key={m.value} type="button" onClick={() => setRefundMode(m.value)}
              className={`w-full text-left rounded-[12px] border px-3 py-2.5 transition-colors ${
                refundMode === m.value ? "border-[#6d5bd0] bg-[#f6f4fd]" : "border-[#ece8f5] hover:bg-[#faf9fd]"
              }`}>
              <p className={`text-[13px] font-semibold ${refundMode === m.value ? "text-[#1f1f2c]" : "text-[#374151]"}`}>{m.label}</p>
              <p className="text-[11px] text-[#9ca3af]">{m.desc}</p>
            </button>
          ))}
        </div>

        <div className="mb-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] mb-1">
            Cancellation reason <span className="text-[#b42318]">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this booking being cancelled?"
            rows={2}
            className="w-full rounded-[12px] border border-[#ece8f5] px-3 py-2 text-[13px] text-[#1f1f2c] placeholder:text-[#c4c9d4] focus:border-[#6d5bd0] focus:outline-none resize-none"
          />
        </div>

        {refundMode !== "waived" && (
          <div className="mb-4">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] mb-1">
              Refund notes (optional)
            </label>
            <input
              type="text"
              value={refundNotes}
              onChange={(e) => setRefundNotes(e.target.value)}
              placeholder="UTR / transaction ID / notes"
              className="w-full rounded-[12px] border border-[#ece8f5] px-3 py-2 text-[13px] text-[#1f1f2c] placeholder:text-[#c4c9d4] focus:border-[#6d5bd0] focus:outline-none"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]">
            Back
          </button>
          <button type="button" onClick={() => onSubmit({ refundMode, reason, refundNotes })}
            disabled={!canSubmit}
            className="rounded-[12px] bg-[#c24134] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50 hover:bg-[#a93528] transition-colors">
            {isSubmitting ? "Cancelling…" : "Cancel booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
