"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  mode: "simple" | "hindi";
  groomerName: string;
  totalXpAwarded: number;
  currentXp: number;
  currentRank: string;
  currentLevel: number;
  rankProgressPercent: number;
  nextRank: { label: string; xpRemaining: number } | null;
  nextSalaryHike: { label: string; xpRemaining: number } | null;
  rewardsDelta: Array<{ summary: string; xpAwarded: number; rewardPointsAwarded?: number }>;
  nextBooking: {
    id: string;
    serviceName: string;
    petName: string | null;
    petBreed: string | null;
    windowLabel: string | null;
  } | null;
  token: string;
  onClose: () => void;
};

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

// Deterministic sparkle positions so they don't re-render
const SPARKLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 60}%`,
  delay: `${(i * 0.13) % 1.2}s`,
  size: i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 5,
  color: i % 4 === 0 ? "#fbbf24" : i % 4 === 1 ? "#a78bfa" : i % 4 === 2 ? "#34d399" : "#f472b6",
}));

export function BookingCompletionCelebration({
  mode,
  groomerName,
  totalXpAwarded,
  currentXp,
  currentRank,
  currentLevel,
  rankProgressPercent,
  nextRank,
  nextSalaryHike,
  rewardsDelta,
  nextBooking,
  token,
  onClose,
}: Props) {
  const xpCount = useCountUp(totalXpAwarded, 1400);
  const [barVisible, setBarVisible] = useState(false);
  const [rewardsVisible, setRewardsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setBarVisible(true), 600);
    const t2 = setTimeout(() => setRewardsVisible(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const nextBookingHref = nextBooking
    ? `/groomer/jobs/${nextBooking.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`
    : null;

  const isHindi = mode === "hindi";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[400] overflow-y-auto bg-[#0e0824]"
    >
      {/* Sparkles layer */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {SPARKLES.map((s, i) => (
          <div
            key={i}
            className="absolute animate-ping"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              backgroundColor: s.color,
              animationDelay: s.delay,
              animationDuration: "1.8s",
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-sm px-4 pb-10 pt-8">

        {/* ── Hero: Booking done ──────────────────────────────── */}
        <div className="text-center">
          <div className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#16a34a] text-[36px] shadow-[0_0_40px_rgba(22,163,74,0.5)]">
            ✓
          </div>
          <div className="mt-3 text-[13px] font-bold uppercase tracking-[0.12em] text-[#a78bfa]">
            {isHindi ? "शानदार काम!" : "Zabardast kaam!"}
          </div>
          <h1 className="mt-1 text-[30px] font-black leading-tight tracking-[-0.03em] text-white">
            {isHindi ? "बुकिंग पूरी!" : "Booking complete!"}
          </h1>
          <div className="mt-1 text-[14px] text-white/50">
            {groomerName}
          </div>
        </div>

        {/* ── XP earned ──────────────────────────────────────── */}
        <div className="mt-6 rounded-[24px] bg-[#1a1535] border border-[#3b2f6e] p-5 text-center shadow-[0_8px_32px_rgba(109,91,208,0.25)]">
          <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#a78bfa]">
            {isHindi ? "इस बुकिंग में मिला" : "Is booking mein mila"}
          </div>
          <div className="mt-2 font-mono text-[52px] font-black leading-none tracking-[-0.04em] text-[#fbbf24]">
            +{xpCount}
          </div>
          <div className="text-[15px] font-semibold text-[#fbbf24]/70">XP</div>

          <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-white/50">
            <span className="rounded-full bg-white/8 px-3 py-1 font-semibold">
              {isHindi ? `लेवल ${currentLevel}` : `Level ${currentLevel}`}
            </span>
            <span className="text-white/30">·</span>
            <span className="rounded-full bg-white/8 px-3 py-1 font-semibold text-white/60">
              {currentRank}
            </span>
          </div>
        </div>

        {/* ── Rank progress bar ──────────────────────────────── */}
        {nextRank ? (
          <div className="mt-4 rounded-[20px] bg-[#1a1535] border border-[#3b2f6e] p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#a78bfa]">
                {isHindi ? "अगली रैंक तक" : "Agli rank tak"}
              </span>
              <span className="font-black text-white">
                {nextRank.xpRemaining.toLocaleString("en-IN")} XP {isHindi ? "बाकी" : "baaki"}
              </span>
            </div>
            <div className="mt-2.5 h-[8px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6d5bd0] to-[#a78bfa] transition-all duration-[1200ms] ease-out"
                style={{ width: barVisible ? `${rankProgressPercent}%` : "0%" }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/40">
              <span>{currentRank}</span>
              <span>{nextRank.label}</span>
            </div>
          </div>
        ) : null}

        {/* ── Salary hike indicator ──────────────────────────── */}
        {nextSalaryHike ? (
          <div className="mt-3 flex items-center gap-3 rounded-[16px] border border-[#fbbf24]/20 bg-[#fbbf24]/5 px-4 py-3">
            <span className="text-[20px]">💰</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-black text-[#fbbf24]">
                {isHindi ? "सैलरी हाइक" : "Salary hike"}
              </div>
              <div className="mt-0.5 text-[11px] text-[#fbbf24]/60">
                {nextSalaryHike.xpRemaining.toLocaleString("en-IN")} XP {isHindi ? "और चाहिए" : "aur chahiye"} — {nextSalaryHike.label}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Individual rewards breakdown ───────────────────── */}
        {rewardsVisible && rewardsDelta.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
              {isHindi ? "इस बार मिला" : "Is baar mila"}
            </div>
            {rewardsDelta.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-[14px] border border-white/8 bg-white/5 px-4 py-3"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="text-[13px] text-white/70">{r.summary}</span>
                <span className="ml-3 shrink-0 font-black text-[#34d399]">+{r.xpAwarded} XP</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Next booking ───────────────────────────────────── */}
        {nextBookingHref ? (
          <a
            href={nextBookingHref}
            className="mt-5 flex items-center gap-4 rounded-[22px] border border-[#16a34a]/40 bg-[#16a34a]/10 p-4 transition-colors active:bg-[#16a34a]/20"
          >
            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#16a34a] text-[22px]">
              📋
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#34d399]">
                {isHindi ? "अगली बुकिंग आज" : "Agli booking aaj"}
              </div>
              <div className="mt-0.5 truncate text-[15px] font-black text-white">
                {nextBooking!.petName
                  ? `${nextBooking!.petName} · ${nextBooking!.serviceName}`
                  : nextBooking!.serviceName}
              </div>
              {nextBooking!.windowLabel ? (
                <div className="mt-0.5 text-[12px] text-white/50">{nextBooking!.windowLabel}</div>
              ) : null}
            </div>
            <svg className="h-5 w-5 shrink-0 text-[#34d399]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ) : (
          <div className="mt-5 rounded-[20px] border border-white/8 bg-white/5 px-4 py-4 text-center">
            <div className="text-[20px]">🏠</div>
            <div className="mt-1 text-[14px] font-semibold text-white/60">
              {isHindi ? "आज की सभी बुकिंग पूरी — घर जाओ!" : "Aaj ki sab bookings complete — ghar jao!"}
            </div>
          </div>
        )}

        {/* ── Close ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-[18px] border border-white/12 bg-white/8 py-3.5 text-[14px] font-semibold text-white/60"
        >
          {isHindi ? "बंद करें" : "Close karein"}
        </button>
      </div>
    </div>
  );
}
