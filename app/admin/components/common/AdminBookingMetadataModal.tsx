"use client";

import { useState } from "react";
import type { AdminManualBookingSource } from "../../types";

const SOURCE_OPTIONS: Array<{ value: AdminManualBookingSource | "website"; label: string }> = [
  { value: "website", label: "Website" },
  { value: "call", label: "Call" },
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manual_internal", label: "Manual internal" },
];

export function AdminBookingMetadataModal({
  isOpen,
  bookingLabel,
  initialSource,
  initialNote,
  initialServiceAddress,
  initialServiceLandmark,
  initialServicePincode,
  initialServiceLocationUrl,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  bookingLabel?: string;
  initialSource: string;
  initialNote?: string | null;
  initialServiceAddress?: string | null;
  initialServiceLandmark?: string | null;
  initialServicePincode?: string | null;
  initialServiceLocationUrl?: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    bookingSource: string;
    adminNote: string;
    serviceAddress: string;
    serviceLandmark: string;
    servicePincode: string;
    serviceLocationUrl: string;
  }) => void;
}) {
  const [bookingSource, setBookingSource] = useState(initialSource);
  const [adminNote, setAdminNote] = useState(initialNote ?? "");
  const [serviceAddress, setServiceAddress] = useState(initialServiceAddress ?? "");
  const [serviceLandmark, setServiceLandmark] = useState(initialServiceLandmark ?? "");
  const [servicePincode, setServicePincode] = useState(initialServicePincode ?? "");
  const [serviceLocationUrl, setServiceLocationUrl] = useState(initialServiceLocationUrl ?? "");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl">
        <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Edit booking info</h3>
        {bookingLabel ? (
          <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">{bookingLabel}</p>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Source</div>
            <select
              value={bookingSource}
              onChange={(event) => setBookingSource(event.target.value)}
              className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Ops note</div>
            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              rows={5}
              className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
            />
          </label>

          <div className="rounded-[18px] border border-[#ece8f5] bg-[#faf9fd] p-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Address & location</div>

            <div className="space-y-4">
              <label className="block">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Service address</div>
                <textarea
                  value={serviceAddress}
                  onChange={(event) => setServiceAddress(event.target.value)}
                  rows={3}
                  placeholder="House / flat, street, area"
                  className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Landmark</div>
                  <input
                    type="text"
                    value={serviceLandmark}
                    onChange={(event) => setServiceLandmark(event.target.value)}
                    placeholder="Nearby landmark"
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Pin code</div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={servicePincode}
                    onChange={(event) => setServicePincode(event.target.value)}
                    placeholder="110001"
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Google Maps link</div>
                <input
                  type="url"
                  value={serviceLocationUrl}
                  onChange={(event) => setServiceLocationUrl(event.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              onSubmit({
                bookingSource,
                adminNote,
                serviceAddress,
                serviceLandmark,
                servicePincode,
                serviceLocationUrl,
              })
            }
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
