"use client";

import { useState } from "react";

type MessageType =
  | "booking_confirmation"
  | "team_on_the_way"
  | "night_before_reminder"
  | "post_groom_care"
  | "review_request";

const MESSAGE_OPTIONS: Array<{ value: MessageType; label: string; hint: string }> = [
  {
    value: "booking_confirmation",
    label: "Booking confirmation",
    hint: "Confirms service, slot, payment, and next steps.",
  },
  {
    value: "team_on_the_way",
    label: "Team on the way",
    hint: "Lets the customer know the grooming team is travelling to the booking.",
  },
  {
    value: "night_before_reminder",
    label: "Night-before reminder",
    hint: "Reminds the customer about tomorrow's booking and prep.",
  },
  {
    value: "post_groom_care",
    label: "Post-groom care guide",
    hint: "Shares aftercare instructions once service is completed.",
  },
  {
    value: "review_request",
    label: "Review request",
    hint: "Asks the customer for feedback after the session.",
  },
];

export function AdminCustomerMessageModal({
  isOpen,
  bookingLabel,
  message,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  bookingLabel?: string;
  message: {
    content: string;
    actionUrl: string | null;
    status: string;
    preparedAt: string;
  } | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { messageType: MessageType }) => void;
}) {
  const [messageType, setMessageType] = useState<MessageType>("booking_confirmation");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-[24px] bg-white p-6 shadow-2xl">
        <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Customer message</h3>
        {bookingLabel ? (
          <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">{bookingLabel}</p>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-3">
            {MESSAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMessageType(option.value)}
                className={`w-full rounded-[16px] border p-4 text-left transition-colors ${
                  messageType === option.value
                    ? "border-[#6d5bd0] bg-[#faf7ff]"
                    : "border-[#ece8f5] hover:bg-[#faf9fd]"
                }`}
              >
                <div className="text-[13px] font-semibold text-[#1f1f2c]">{option.label}</div>
                <div className="mt-1 text-[12px] leading-[1.5] text-[#6b7280]">{option.hint}</div>
              </button>
            ))}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onSubmit({ messageType })}
              className="w-full rounded-[14px] bg-[#6d5bd0] px-4 py-3 text-[13px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-60"
            >
              {isSubmitting ? "Preparing…" : "Prepare WhatsApp message"}
            </button>
          </div>

          <div className="rounded-[18px] border border-[#ece5ff] bg-[#faf9fd] p-4">
            {!message ? (
              <p className="text-[13px] leading-[1.7] text-[#7c8499]">
                Choose a message type and prepare it. The bilingual preview will appear here, and you can open the customer’s WhatsApp chat directly.
              </p>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4338ca]">
                    {message.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-[#8a90a6]">
                    Prepared {new Date(message.preparedAt).toLocaleString("en-IN")}
                  </span>
                </div>

                <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[14px] border border-[#ece5ff] bg-white p-4 text-[12px] leading-[1.7] text-[#374151]">
                  {message.content}
                </pre>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(message.content);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    }}
                    className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd]"
                  >
                    {copied ? "Copied" : "Copy text"}
                  </button>
                  {message.actionUrl ? (
                    <a
                      href={message.actionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#5b4ab5]"
                    >
                      Open WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
