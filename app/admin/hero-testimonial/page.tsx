"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPageHeader } from "../components/common/AdminPageHeader";

type HeroTestimonialForm = {
  quote: string;
  authorName: string;
  authorLocation: string;
  bookedAt: string; // YYYY-MM-DD or empty
  isActive: boolean;
};

const EMPTY: HeroTestimonialForm = {
  quote: "",
  authorName: "",
  authorLocation: "",
  bookedAt: "",
  isActive: true,
};

const formatRelativeBooking = (iso: string): string => {
  if (!iso) return "";
  const bookedDate = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(bookedDate.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - bookedDate.getTime()) / 86400000);

  if (days < 0) return "Booked recently";
  if (days === 0) return "Booked today";
  if (days === 1) return "Booked yesterday";
  if (days <= 6) return `Booked ${days} days ago`;
  if (days <= 13) return "Booked last week";
  if (days <= 30) return `Booked ${Math.floor(days / 7)} weeks ago`;
  return "Booked recently";
};

export default function AdminHeroTestimonialPage() {
  const [form, setForm] = useState<HeroTestimonialForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/hero-testimonials");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load hero testimonial.");
      const t = data.testimonial;
      if (t) {
        setForm({
          quote: t.quote ?? "",
          authorName: t.authorName ?? "",
          authorLocation: t.authorLocation ?? "",
          bookedAt: t.bookedAt ? new Date(t.bookedAt).toISOString().slice(0, 10) : "",
          isActive: t.isActive !== false,
        });
        if (t.updatedAt) {
          setSavedAt(new Date(t.updatedAt).toLocaleString());
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load hero testimonial.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/hero-testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bookedAt: form.bookedAt ? `${form.bookedAt}T00:00:00.000Z` : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save hero testimonial.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save hero testimonial.");
    } finally {
      setSaving(false);
    }
  };

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const relativeLabel = formatRelativeBooking(form.bookedAt);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Hero testimonial"
        subtitle="The quote shown directly in the homepage mobile hero. Update anytime to keep it fresh."
        onRefresh={() => void load()}
        isRefreshing={loading}
      />

      {error ? (
        <div className="rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="text-[18px] font-bold text-[#2a2346]">Edit testimonial</div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6a85]">Quote</span>
              <textarea
                value={form.quote}
                onChange={(e) => setForm((prev) => ({ ...prev, quote: e.target.value }))}
                placeholder="Excellent services by All Tails — perfect for grooming."
                maxLength={240}
                rows={4}
                className="rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] leading-[1.55] outline-none focus:border-[#6d5bd0]"
              />
              <span className="text-[11px] text-[#8a90a6]">{form.quote.length}/240 — keep it under 2 short sentences for mobile.</span>
            </label>

            <label className="grid gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6a85]">Author name</span>
              <input
                value={form.authorName}
                onChange={(e) => setForm((prev) => ({ ...prev, authorName: e.target.value }))}
                placeholder="Prabhneet Kohli"
                maxLength={60}
                className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6a85]">Author location / label</span>
              <input
                value={form.authorLocation}
                onChange={(e) => setForm((prev) => ({ ...prev, authorLocation: e.target.value }))}
                placeholder="Gurgaon"
                maxLength={60}
                className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6a85]">Booking date</span>
              <input
                type="date"
                value={form.bookedAt}
                max={today}
                onChange={(e) => setForm((prev) => ({ ...prev, bookedAt: e.target.value }))}
                className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
              />
              <span className="text-[11px] text-[#8a90a6]">
                {form.bookedAt
                  ? `Will display as: "${relativeLabel}"`
                  : "Optional — leave empty to skip the booking date label."}
              </span>
            </label>

            <label className="flex items-center gap-2.5 rounded-[14px] border border-[#ddd1fb] bg-[#faf8ff] px-4 py-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-[13px] font-semibold text-[#2a2346]">Show on homepage hero</span>
              <span className="ml-auto text-[11px] text-[#8a90a6]">Uncheck to temporarily hide.</span>
            </label>

            <button
              onClick={() => void save()}
              disabled={saving || !form.quote.trim() || !form.authorName.trim() || !form.authorLocation.trim()}
              className="inline-flex h-[44px] w-fit items-center rounded-[14px] bg-[#6d5bd0] px-5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save testimonial"}
            </button>

            {savedAt ? (
              <div className="text-[11px] text-[#8a90a6]">Last saved: {savedAt}</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="text-[18px] font-bold text-[#2a2346]">Preview</div>
          <div className="mt-4 rounded-[20px] bg-gradient-to-br from-[#1a1033] via-[#130726] to-[#0c041b] p-5">
            <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-sm">
              {/* stars + relative date */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="text-[14px] text-[#FACC15]">★</span>
                  ))}
                </div>
                {relativeLabel ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-semibold text-white/82">
                    {relativeLabel}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-[14px] leading-[1.55] text-white/90">
                {form.quote ? `“${form.quote}”` : <span className="italic text-white/45">Quote will appear here</span>}
              </p>

              <div className="mt-3 flex items-center gap-2.5 border-t border-white/10 pt-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5bd0] to-[#9a86e8] text-[12px] font-bold text-white">
                  {(form.authorName || "?").trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-semibold text-white">
                    {form.authorName || "Author"}
                  </span>
                  <span className="text-[10.5px] text-white/55">
                    {form.authorLocation || "Location"}
                  </span>
                </div>
              </div>
            </div>
            {!form.isActive ? (
              <div className="mt-3 rounded-[10px] bg-amber-500/15 px-3 py-2 text-[11.5px] text-amber-200">
                Currently hidden — homepage will show the default fallback.
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-[12px] leading-[1.6] text-[#8a90a6]">
            This is the exact card that appears on the homepage hero on mobile. Saved changes go live immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
