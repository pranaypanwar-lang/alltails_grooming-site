"use client";

import { useState } from "react";

export function AdminPaymentLinkModal({
  isOpen,
  bookingId,
  paymentLinkUrl,
  expiresAt,
  onClose,
}: {
  isOpen: boolean;
  bookingId: string | null;
  paymentLinkUrl: string;
  expiresAt?: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl">
        <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Payment link ready</h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">
          Share this secure link with the customer so they can complete payment for booking{" "}
          <span className="font-mono text-[#2a2346]">{bookingId?.slice(0, 8)}</span>.
        </p>

        <div className="mt-4 rounded-[16px] border border-[#ece5ff] bg-[#faf9fd] p-4">
          <div className="break-all text-[13px] text-[#2a2346]">{paymentLinkUrl}</div>
          {expiresAt ? (
            <div className="mt-2 text-[11px] text-[#8a90a6]">
              Hold expires at {new Date(expiresAt).toLocaleString("en-IN")}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(paymentLinkUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#5b4ab5]"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
