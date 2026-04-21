"use client";

import { useState } from "react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { prepareAdminCampaign } from "../lib/api";

export default function AdminCampaignsPage() {
  const [messageType, setMessageType] = useState<"periodic_care_tip" | "custom_offer">("periodic_care_tip");
  const [city, setCity] = useState("");
  const [customText, setCustomText] = useState("");
  const [offerCode, setOfferCode] = useState("");
  const [limit, setLimit] = useState("50");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ audienceCount: number; preparedCount: number } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await prepareAdminCampaign({
        messageType,
        city,
        customText,
        offerCode,
        limit: Number(limit) || 50,
      });
      setResult({
        audienceCount: response.audienceCount,
        preparedCount: response.preparedCount,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to prepare campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1120px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Campaigns"
          subtitle="Prepare periodic care tips and custom offers for customer broadcast queues. Current launch-safe channel is WhatsApp-ready messaging."
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <AdminSummaryCard label="Last audience size" value={result?.audienceCount ?? "—"} />
          <AdminSummaryCard label="Messages prepared" value={result?.preparedCount ?? "—"} tone="success" />
        </div>

        <div className="rounded-[22px] border border-[#ece5ff] bg-white p-6 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Campaign type</span>
              <select
                value={messageType}
                onChange={(event) => setMessageType(event.target.value as "periodic_care_tip" | "custom_offer")}
                className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
              >
                <option value="periodic_care_tip">Periodic grooming care advice</option>
                <option value="custom_offer">Custom offer</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">City filter</span>
              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Optional city"
                className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Message body</span>
              <textarea
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                rows={5}
                placeholder={
                  messageType === "periodic_care_tip"
                    ? "Example: Brush the coat 2-3 times a week and keep ears dry after bath."
                    : "Example: Book this week and enjoy 10% off on your next grooming session."
                }
                className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Offer code</span>
              <input
                type="text"
                value={offerCode}
                onChange={(event) => setOfferCode(event.target.value)}
                placeholder="Optional"
                disabled={messageType !== "custom_offer"}
                className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none disabled:bg-[#f8f8fb]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Audience limit</span>
              <input
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-[14px] border border-[#f7d7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="rounded-[14px] bg-[#6d5bd0] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-60"
            >
              {isSubmitting ? "Preparing…" : "Prepare campaign"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-[12px] leading-[1.6] text-[#7c8499]">
          Note: this prepares booking-linked customer messages for the current launch-safe WhatsApp workflow. Instagram DM and Facebook broadcast automation would require a separate Meta-approved provider/channel integration layer.
        </p>
      </div>
    </div>
  );
}
