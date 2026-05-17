"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Gift,
  Home,
  Lock,
  LogOut,
  ReceiptText,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
  Zap,
  BookOpen,
  UserPlus,
  CircleDollarSign,
} from "lucide-react";
import type { serializeGroomerHome } from "../../../../lib/groomerHome";
import { PACER_CARDS, PHASE_LABELS, PHASE_EMOJI, getCardsForService, getBreedTrimNote, buildPacerContext, type PacerCard, type PacerPhase, type PacerContext } from "../../../../lib/pacerCards";

type GroomerHomeView = NonNullable<Awaited<ReturnType<typeof serializeGroomerHome>>>;
type Tab = "ghar" | "taarein" | "inam" | "maango";
type LeaveStep = "policy" | "dates" | "details";

// Map English DB rank names → Hindi display names
const RANK_HINDI: Record<string, string> = {
  "Groomer Trainee": "Naya Saathi 🌱",
  "Junior Pet Groomer": "Seekhne Wala 📚",
  "Pet Groomer": "Kabil Haath ✂️",
  "Senior Pet Groomer": "Bharosemand Groomer 💎",
  "Lead Groomer": "Ustaad 🏆",
  "Master Groomer": "All Tails Star ⭐",
  "Grooming Captain": "Champion 👑",
  "Grooming Mentor": "Hall of Fame 🏅",
};

// Badge Hindi names
const BADGE_HINDI: Record<string, { emoji: string; title: string; detail: string }> = {
  "First Four": { emoji: "💪", title: "Kaam Karne Wala", detail: "25 se zyada bookings complete ki hain" },
  "Pawfect Finish": { emoji: "⭐", title: "Sabka Pasandida", detail: "20 se zyada reviews mile hain" },
  "Clockwork": { emoji: "⏰", title: "Time ka Pakka", detail: "21 baar time par pahuncha" },
  "No Excuses": { emoji: "🛡️", title: "Mazboot Insaan", detail: "90 din bina chhuti ke kaam kiya" },
};

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AT";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function formatTime(minutes: number | null | undefined) {
  if (minutes == null) return "";
  if (minutes < 0) return `${Math.abs(minutes)} min der ho gayi`;
  if (minutes === 0) return "Abhi shuru karo";
  if (minutes < 60) return `${minutes} min mein`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ghante mein` : `${h}h ${m}m mein`;
}

// Glassy bottom-sheet modal
function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-end justify-center bg-black/50 px-0 pb-0"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="w-full max-w-lg rounded-t-[32px] bg-white px-5 pb-10 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e5e7eb]" />
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// Big tap button
function BigBtn({
  children,
  onClick,
  disabled,
  color = "purple",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: "purple" | "green" | "orange" | "red" | "dark" | "gold";
  className?: string;
}) {
  const colors = {
    purple: "bg-[#5b4bc2] active:bg-[#4a3aa0] text-white",
    green: "bg-[#15803d] active:bg-[#166534] text-white",
    orange: "bg-[#d97706] active:bg-[#b45309] text-white",
    red: "bg-[#dc2626] active:bg-[#b91c1c] text-white",
    dark: "bg-[#1f1a33] active:bg-[#171330] text-white",
    gold: "bg-[#f59e0b] active:bg-[#d97706] text-[#1f1a33]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[18px] px-5 py-4 text-[17px] font-black tracking-[-0.01em] transition-all active:scale-[0.98] disabled:opacity-40 ${colors[color]} ${className}`}
    >
      {children}
    </button>
  );
}

// Simple progress bar
function Bar({ value, color = "#5b4bc2" }: { value: number; color?: string }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[#f0eeff]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

// Card wrapper
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[24px] bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)] ${className}`}>
      {children}
    </div>
  );
}

// Section heading
function SectionHead({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 text-[18px] font-black tracking-[-0.02em] text-[#1a1630]">{children}</div>;
}

// Celebration confetti overlay
function CelebrationOverlay({
  title,
  detail,
  emoji,
  onClose,
}: {
  title: string;
  detail: string;
  emoji: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 280 }}
        className="w-full max-w-sm rounded-[32px] bg-[linear-gradient(135deg,#fff9e8_0%,#fff2c2_100%)] p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[64px] leading-none">{emoji}</div>
        <div className="mt-4 text-[26px] font-black tracking-[-0.02em] text-[#1a1630]">{title}</div>
        <div className="mt-2 text-[16px] leading-[1.6] text-[#6b5c2e]">{detail}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-[18px] bg-[#1a1630] py-4 text-[17px] font-black text-white active:scale-[0.98]"
        >
          Shukriya! 🙏
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── PACER FLOW ──────────────────────────────────────────────────────────────
function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="my-3 flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-[#c4b5fd] bg-[#f5f3ff] px-4 py-5">
      <div className="text-[28px]">🖼️</div>
      <div className="text-center text-[13px] font-semibold leading-snug text-[#7c3aed]">{label}</div>
      <div className="text-[11px] text-[#a78bfa]">Image yahan aayegi</div>
    </div>
  );
}

function PacerFlow({
  cards,
  context,
  onClose,
}: {
  cards: PacerCard[];
  context: PacerContext | null;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [checks, setChecks] = useState<Record<string, Set<number>>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const [nervousMode, setNervousMode] = useState(context?.isNervous ?? false);

  const card = cards[idx];
  if (!card) return null;

  const total = cards.length;
  const cardChecks = checks[card.id] ?? new Set<number>();
  const allChecked = card.doneChecks.length === 0 || cardChecks.size >= card.doneChecks.length;
  const phasesInDeck = Array.from(new Set(cards.map((c) => c.phase))) as PacerPhase[];
  const completedCardIds = new Set(
    cards
      .filter((c) => {
        const s = checks[c.id];
        return c.doneChecks.length > 0 && s && s.size >= c.doneChecks.length;
      })
      .map((c) => c.id)
  );
  const completedCount = cards.filter((c) => {
    const s = checks[c.id];
    return c.doneChecks.length > 0 && s && s.size >= c.doneChecks.length;
  }).length;
  const isLastCard = idx === total - 1;

  const toggleCheck = (i: number) => {
    setChecks((prev) => {
      const next = new Set(prev[card.id] ?? []);
      if (next.has(i)) next.delete(i); else next.add(i);
      return { ...prev, [card.id]: next };
    });
  };

  const advance = () => {
    if (idx < total - 1) { setIdx(idx + 1); setDetailsOpen(false); setFlagOpen(false); }
  };

  const markDone = () => {
    if (!allChecked && card.doneChecks.length > 0) return;
    advance();
  };

  const breedNote = (card.id === "hygiene_cut" || card.id === "full_body_styling")
    ? getBreedTrimNote(context?.petBreed ?? "") : null;

  const allDone = isLastCard && allChecked;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[450] flex flex-col bg-[#f0eeff]"
    >
      {/* ── PET CONTEXT BAR ── */}
      <div className={`px-4 pb-2 pt-3 ${nervousMode ? "bg-[#7f1d1d]" : "bg-[#1a1030]"}`}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            {context ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[16px] font-black text-white">{context.petName ?? "Pet"}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white/80">{context.petBreed}</span>
                <span className="rounded-full bg-[#5b4bc2]/70 px-2 py-0.5 text-[11px] font-bold text-white/80">{context.serviceName}</span>
              </div>
            ) : (
              <span className="text-[16px] font-black text-white">Session Guide</span>
            )}
            {context?.temperament ? (
              <div className="mt-0.5 text-[12px] text-white/60 truncate">Mizaaj: {context.temperament}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setNervousMode((v) => !v)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              nervousMode ? "bg-[#fca5a5] text-[#7f1d1d]" : "bg-white/10 text-white/50"
            }`}
          >
            {nervousMode ? "😨 Nervous" : "😊 Normal"}
          </button>
        </div>

        {nervousMode ? (
          <div className="mt-2 rounded-[10px] bg-[#fca5a5]/20 px-3 py-2 text-[12px] font-semibold text-[#fca5a5]">
            ⚠️ Nervous dog mode — har step mein extra patience, least restraint
          </div>
        ) : null}

        {context?.groomingNotes ? (
          <div className="mt-2 rounded-[10px] bg-white/10 px-3 py-2 text-[12px] text-white/70">
            📋 {context.groomingNotes}
          </div>
        ) : null}

        <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {phasesInDeck.map((ph) => {
            const phCards = cards.filter((c) => c.phase === ph);
            const phDone = phCards.every((c) => c.doneChecks.length > 0 && (checks[c.id]?.size ?? 0) >= c.doneChecks.length);
            const phActive = card.phase === ph;
            return (
              <button
                key={ph}
                type="button"
                onClick={() => { const f = cards.findIndex((c) => c.phase === ph); if (f >= 0) { setIdx(f); setDetailsOpen(false); setFlagOpen(false); } }}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  phActive ? "bg-[#f8d66d] text-[#1a1030]" : phDone ? "bg-[#dcfce7] text-[#166534]" : "bg-white/10 text-white/60"
                }`}
              >
                {PHASE_EMOJI[ph]} {PHASE_LABELS[ph]}{phDone ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-[#3b2d8a]/20">
        <motion.div animate={{ width: `${Math.round((completedCount / total) * 100)}%` }} transition={{ duration: 0.4 }} className="h-full bg-[#f8d66d]" />
      </div>
      <div className="flex items-center justify-between bg-white/70 px-4 py-1.5 text-[11px] text-[#6b7280]">
        <span>Step {idx + 1} / {total}</span>
        <span>{completedCount} complete</span>
      </div>

      {/* ── CARD ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#7c3aed]">
              {PHASE_EMOJI[card.phase]} {PHASE_LABELS[card.phase]} · {card.timeLabel}
            </div>
            <div className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[#1a1630]">
              {card.titleHindi}
            </div>

            {/* PRIMARY ACTION */}
            <div className="rounded-[20px] bg-[#1a1030] px-5 py-5 shadow-[0_4px_24px_rgba(26,16,48,0.22)]">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#f8d66d]">Abhi karo 👇</div>
              <div className="mt-2 text-[17px] font-bold leading-snug text-white">{card.primaryAction}</div>
            </div>

            {/* Breed note */}
            {breedNote ? (
              <div className="flex gap-2 rounded-[14px] bg-[#fef3c7] px-4 py-3">
                <span className="text-[15px]">🐾</span>
                <span className="text-[13px] font-bold leading-snug text-[#92400e]">{breedNote}</span>
              </div>
            ) : null}

            {/* Styling notes on styling card */}
            {card.id === "full_body_styling" && context?.stylingNotes ? (
              <div className="flex gap-2 rounded-[14px] bg-[#ede9fe] px-4 py-3">
                <span className="text-[15px]">✂️</span>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#5b4bc2]">Styling notes</div>
                  <div className="mt-0.5 text-[13px] text-[#1a1630]">{context.stylingNotes}</div>
                </div>
              </div>
            ) : null}

            {/* Nervous tip */}
            {nervousMode && card.nervousTip ? (
              <div className="flex gap-2 rounded-[14px] border border-[#fca5a5] bg-[#fef2f2] px-4 py-3">
                <span className="text-[15px]">😨</span>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#b91c1c]">Nervous dog</div>
                  <div className="mt-0.5 text-[13px] leading-snug text-[#991b1b]">{card.nervousTip}</div>
                </div>
              </div>
            ) : null}

            {card.imageSlot ? <ImagePlaceholder label={card.imageSlot} /> : null}

            {/* Collapsible details */}
            {card.details.length > 0 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-[14px] bg-white px-4 py-3 text-[14px] font-bold text-[#5b4bc2] shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
                >
                  <span>📖 Details ({card.details.length})</span>
                  <span className="text-[12px]">{detailsOpen ? "▲" : "▼"}</span>
                </button>
                <AnimatePresence>
                  {detailsOpen ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="mt-1 space-y-1.5 rounded-[14px] bg-white p-3 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                        {card.details.map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="mt-0.5 shrink-0 text-[12px] text-[#5b4bc2]">•</span>
                            <span className="text-[13px] leading-snug text-[#374151]">{d}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}

            {/* DONE CHECKS */}
            <div className="rounded-[18px] bg-[#f0fdf4] p-4">
              <div className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#15803d]">
                ✅ Sahi hua? Tick karo pehle:
              </div>
              <div className="space-y-2.5">
                {card.doneChecks.map((check, i) => {
                  const checked = cardChecks.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleCheck(i)}
                      className={`flex w-full items-start gap-3 rounded-[14px] px-3 py-3 text-left transition-all active:scale-[0.98] ${
                        checked ? "bg-[#dcfce7]" : "bg-white shadow-[0_1px_6px_rgba(0,0,0,0.07)]"
                      }`}
                    >
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-black transition-all ${
                        checked ? "bg-[#15803d] text-white" : "border-2 border-[#bbf7d0]"
                      }`}>
                        {checked ? "✓" : ""}
                      </div>
                      <span className={`text-[14px] leading-snug ${checked ? "font-semibold text-[#166534]" : "text-[#374151]"}`}>
                        {check}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FLAG PANEL */}
            {card.flagOptions?.length ? (
              <div>
                <button
                  type="button"
                  onClick={() => setFlagOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-[14px] border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-[14px] font-bold text-[#b91c1c]"
                >
                  <span>⚠️ Koi problem mili? Flag karo</span>
                  <span className="text-[12px]">{flags.length > 0 ? `${flags.length} flagged` : flagOpen ? "▲" : "▼"}</span>
                </button>
                <AnimatePresence>
                  {flagOpen ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="mt-1 grid grid-cols-2 gap-2 rounded-[14px] bg-[#fff1f2] p-3">
                        {card.flagOptions.map((opt) => {
                          const active = flags.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFlags((prev) => active ? prev.filter((f) => f !== opt) : [...prev, opt])}
                              className={`rounded-[12px] px-3 py-2.5 text-[12px] font-bold text-left transition-all active:scale-[0.97] ${active ? "bg-[#b91c1c] text-white" : "bg-white text-[#b91c1c]"}`}
                            >
                              {active ? "✓ " : ""}{opt}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}

            <div className="h-2" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div className="border-t border-[#e5e7eb] bg-white px-4 pb-8 pt-3">
        {allDone ? (
          <div className="space-y-2">
            <div className="rounded-[16px] bg-[#f0fdf4] py-4 text-center text-[17px] font-black text-[#15803d]">
              Saara kaam ho gaya! 🎉
            </div>
            <BigBtn color="dark" onClick={onClose}>Band karo ✕</BigBtn>
          </div>
        ) : (
          <div className="flex gap-3">
            {idx > 0 ? (
              <button
                type="button"
                onClick={() => { setIdx(idx - 1); setDetailsOpen(false); setFlagOpen(false); }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#f4f1fb] text-[#5b4bc2]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            <BigBtn color={allChecked ? "green" : "dark"} disabled={!allChecked} onClick={advance}>
              {allChecked
                ? isLastCard ? "Khatam karo 🎉" : "Agla step →"
                : `${cardChecks.size}/${card.doneChecks.length} check karo pehle`}
            </BigBtn>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function GroomerHomeClient({
  initialHome,
  token,
  bookingId,
  mode = "token",
}: {
  initialHome: GroomerHomeView;
  token?: string;
  bookingId?: string;
  mode?: "token" | "session";
}) {
  const [home, setHome] = useState(initialHome);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("ghar");
  const [celebration, setCelebration] = useState<{ title: string; detail: string; emoji: string } | null>(null);
  const [checkinDone, setCheckinDone] = useState(home.gamification.checkedInToday ?? false);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [pacerOpen, setPacerOpen] = useState(false);
  const [pacerCards, setPacerCards] = useState<PacerCard[]>([]);
  const [pacerContext, setPacerContext] = useState<PacerContext | null>(null);

  // Modal states
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [selectedRewardKey, setSelectedRewardKey] = useState<string>("");
  const [rewardNote, setRewardNote] = useState("");

  // Form states
  const [leaveStep, setLeaveStep] = useState<LeaveStep>("policy");
  const [leaveForm, setLeaveForm] = useState({ leaveType: "planned_leave", startDate: "", endDate: "", reason: "", emergencyFlag: false });
  const [advanceForm, setAdvanceForm] = useState({ amount: "", reason: "" });
  const [referralForm, setReferralForm] = useState({ candidateName: "", candidatePhone: "", role: "groomer", notes: "" });
  const [trainingInterestNote, setTrainingInterestNote] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("");
  const [profileForm, setProfileForm] = useState({
    aadhaarNumber: home.member.profile.aadhaarNumber,
    panNumber: home.member.profile.panNumber,
    bankAccountName: home.member.profile.bankAccountName,
    bankAccountNumber: home.member.profile.bankAccountNumber,
    bankIfsc: home.member.profile.bankIfsc,
    bankName: home.member.profile.bankName,
    upiId: home.member.profile.upiId,
    emergencyContactName: home.member.profile.emergencyContactName,
    emergencyContactPhone: home.member.profile.emergencyContactPhone,
    yearsExperience: home.member.profile.yearsExperience ? String(home.member.profile.yearsExperience) : "",
    experienceNotes: home.member.profile.experienceNotes,
  });
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const sessionMode = mode === "session";

  const apiBase = sessionMode
    ? ""
    : `/api/groomer/home/${home.member.id}?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`;

  function apiUrl(path: string) {
    return sessionMode
      ? `/api/groomer/me/${path}`
      : `/api/groomer/home/${home.member.id}/${path}?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`;
  }

  const readUrl = sessionMode
    ? "/api/groomer/me"
    : `/api/groomer/home/${home.member.id}?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`;

  const refresh = async () => {
    const res = await fetch(readUrl, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Dobara load nahi ho paaya.");
    setHome(data.home);
  };

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuch galat ho gaya.");
    } finally {
      setBusy(null);
    }
  };

  // Derived values
  const firstName = getFirstName(home.member.name);
  const initials = getInitials(home.member.name);
  const rankHindi = RANK_HINDI[home.gamification.baseRank] ?? home.member.currentRank;
  const sikke = home.member.currentXp; // "Sikke" = XP in display
  const stars = home.gamification.prestigeCredits; // "Stars" = prestige credits
  const rankPct = home.gamification.progress.rankProgressPercent;
  const nextRankSikkeNeeded = home.gamification.nextRank?.xpRemaining ?? 0;
  const nextAction = home.nextAction;
  const sessionJobHref = (id: string) =>
    sessionMode ? `/groomer/jobs/${id}` : `/groomer/jobs/${id}?token=${encodeURIComponent(token ?? "")}`;

  // Today's Sikke earned — sum today's reward events
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySikke = useMemo(
    () =>
      home.recentRewards
        .filter((r: (typeof home.recentRewards)[number]) => r.createdAt.slice(0, 10) === todayStr)
        .reduce((sum: number, r: (typeof home.recentRewards)[number]) => sum + r.xpAwarded, 0),
    [home, todayStr]
  );

  // Check if a lucky booking happened today
  const luckyBookingToday = useMemo(
    () =>
      home.recentRewards.find(
        (r: (typeof home.recentRewards)[number]) =>
          r.eventType === "lucky_booking" && r.createdAt.slice(0, 10) === todayStr
      ),
    [home, todayStr]
  );

  // Today's completed bookings
  const todayDoneCount = home.todayBookings.filter(
    (b: (typeof home.todayBookings)[number]) => b.status === "completed"
  ).length;

  // Closest eligible reward
  const closestEligibleReward = home.rewardStore.find(
    (r: (typeof home.rewardStore)[number]) =>
      r.eligible && r.currentStatus !== "pending" && r.currentStatus !== "approved"
  );
  const selectedReward =
    home.rewardStore.find(
      (r: (typeof home.rewardStore)[number]) => r.key === selectedRewardKey
    ) ?? null;

  const leaveWarning =
    leaveForm.emergencyFlag || leaveForm.leaveType === "emergency_leave"
      ? home.leavePolicy.sameDayImpactWarning
      : home.leavePolicy.advanceNoticeHint;
  const leaveImpactSeverity =
    (leaveForm.emergencyFlag || leaveForm.leaveType === "emergency_leave") && home.leavePolicy.sameDayImpactCount > 0
      ? "high"
      : leaveForm.startDate === new Date().toISOString().slice(0, 10)
        ? "medium"
        : "low";

  return (
    <div className="min-h-screen bg-[#f4f1fb] pb-28">
      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <div className="bg-[linear-gradient(160deg,#1a1030_0%,#3b2d8a_55%,#5b4bc2_100%)] px-4 pb-6 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          {/* Top row: avatar + name + logout */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-[18px] font-black">
                {initials}
              </div>
              <div>
                <div className="text-[22px] font-black leading-tight tracking-[-0.02em]">{firstName} 👋</div>
                <div className="mt-0.5 text-[14px] font-semibold text-[#c4b8f7]">{rankHindi}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {sessionMode ? (
                <>
                  <Link href="/groomer/finance" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <ReceiptText className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void run("logout", async () => {
                      const res = await fetch("/api/groomer/logout", { method: "POST" });
                      if (!res.ok) throw new Error("Logout fail ho gaya.");
                      window.location.href = "/groomer-login";
                    })}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Link
                  href={sessionJobHref(bookingId ?? "")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Sikke + Stars + Streak row */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[18px] bg-white/10 px-3 py-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Mere Sikke 🪙</div>
              <div className="mt-1 text-[22px] font-black leading-none">{sikke.toLocaleString("en-IN")}</div>
            </div>
            <div className="rounded-[18px] bg-white/10 px-3 py-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Aaj Mile ✨</div>
              <div className="mt-1 text-[22px] font-black leading-none">{todaySikke > 0 ? `+${todaySikke}` : "—"}</div>
            </div>
            <div className="rounded-[18px] bg-white/10 px-3 py-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">🔥 Lagaataar</div>
              <div className="mt-1 text-[22px] font-black leading-none">{home.gamification.streaks.punctuality} din</div>
            </div>
          </div>

          {/* Rank progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[13px] text-white/70">
              <span>Agla rank</span>
              <span>{nextRankSikkeNeeded > 0 ? `${nextRankSikkeNeeded.toLocaleString("en-IN")} Sikke aur` : "Top rank ✅"}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, rankPct)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#f8d66d,#fff6ca)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── ERROR BANNER ────────────────────────────────────────── */}
      {error ? (
        <div className="mx-auto mt-3 max-w-lg px-4">
          <div className="rounded-[16px] bg-[#fee2e2] px-4 py-3 text-[14px] font-semibold text-[#b91c1c]">{error}</div>
        </div>
      ) : null}

      {/* ─── LUCKY BOOKING BANNER ────────────────────────────────── */}
      <AnimatePresence>
        {luckyBookingToday ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto mt-3 max-w-lg px-4"
          >
            <button
              type="button"
              onClick={() => setCelebration({
                title: "Lucky Booking! ⭐",
                detail: luckyBookingToday.summary,
                emoji: "🌟",
              })}
              className="w-full rounded-[22px] bg-[linear-gradient(135deg,#fef3c7,#fde68a)] px-5 py-4 text-left shadow-[0_4px_20px_rgba(251,191,36,0.4)]"
            >
              <div className="flex items-center gap-3">
                <div className="text-[36px]">⭐</div>
                <div>
                  <div className="text-[17px] font-black text-[#78350f]">Lucky Booking mili aaj! 3× Sikke</div>
                  <div className="text-[13px] text-[#92400e]">Tap karke dekho kya mila</div>
                </div>
              </div>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-lg space-y-3 px-4 pt-3">

        {/* ══════════════════ GHAR TAB ══════════════════════════════ */}
        {activeTab === "ghar" ? (
          <>
            {/* Daily check-in */}
            <AnimatePresence>
              {!checkinDone ? (
                <motion.button
                  key="checkin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  type="button"
                  disabled={checkinBusy}
                  onClick={async () => {
                    setCheckinBusy(true);
                    try {
                      await fetch(apiUrl("daily-checkin"), { method: "POST" });
                      setCheckinDone(true);
                      await refresh();
                      setCelebration({ title: "Aaj ka bonus mila! 🎁", detail: "+10 Sikke sirf app kholne ke liye", emoji: "🎁" });
                    } catch { /* silent */ } finally {
                      setCheckinBusy(false);
                    }
                  }}
                  className="w-full rounded-[22px] bg-[linear-gradient(135deg,#f59e0b,#fbbf24)] px-5 py-5 text-left shadow-[0_4px_20px_rgba(245,158,11,0.35)] active:scale-[0.98] disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[20px] font-black text-[#1a1030]">
                        {checkinBusy ? "Mil raha hai..." : "Aaj ka bonus lo 🎁"}
                      </div>
                      <div className="mt-0.5 text-[14px] font-semibold text-[#78350f]">+10 Sikke — sirf ek tap mein</div>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/40 text-[28px]">
                      {checkinBusy ? <Zap className="h-7 w-7 animate-pulse text-[#1a1030]" /> : "🪙"}
                    </div>
                  </div>
                </motion.button>
              ) : (
                <motion.div
                  key="checkin-done"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 rounded-[18px] bg-[#dcfce7] px-4 py-3"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#15803d]" />
                  <span className="text-[15px] font-semibold text-[#15803d]">Aaj ka bonus mil gaya — +10 Sikke ✅</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next booking — MOST IMPORTANT CARD */}
            {nextAction ? (
              <Card className={`overflow-hidden ${
                nextAction.tone === "urgent"
                  ? "border-2 border-[#fca5a5] bg-[linear-gradient(135deg,#fff5f5,#fee2e2)]"
                  : nextAction.tone === "soon"
                    ? "border-2 border-[#fcd34d] bg-[linear-gradient(135deg,#fffbeb,#fef3c7)]"
                    : nextAction.tone === "active"
                      ? "border-2 border-[#86efac] bg-[linear-gradient(135deg,#f0fdf4,#dcfce7)]"
                      : "border-2 border-[#c4b5fd] bg-[linear-gradient(135deg,#f5f3ff,#ede9fe)]"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-bold uppercase tracking-wide text-[#6b7280]">
                      {nextAction.tone === "urgent" ? "🚨 Abhi nikalo" : nextAction.tone === "soon" ? "⏰ Jaldi nikalna hoga" : nextAction.tone === "active" ? "✅ Kaam chal raha hai" : "📋 Agli booking"}
                    </div>
                    <div className="mt-1.5 text-[22px] font-black leading-tight tracking-[-0.02em] text-[#1a1630]">
                      {nextAction.title}
                    </div>
                    {nextAction.minutesAway != null ? (
                      <div className={`mt-2 inline-block rounded-full px-3 py-1 text-[13px] font-bold ${
                        nextAction.tone === "urgent" ? "bg-[#dc2626] text-white" :
                        nextAction.tone === "soon" ? "bg-[#d97706] text-white" :
                        "bg-white/60 text-[#374151]"
                      }`}>
                        {formatTime(nextAction.minutesAway)}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-[40px] leading-none">
                    {nextAction.tone === "urgent" ? "🚨" : nextAction.tone === "soon" ? "⏰" : nextAction.tone === "active" ? "💪" : "📋"}
                  </div>
                </div>
                <Link
                  href={sessionJobHref(nextAction.bookingId)}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-[16px] py-4 text-[17px] font-black text-white ${
                    nextAction.tone === "urgent" ? "bg-[#dc2626]" :
                    nextAction.tone === "soon" ? "bg-[#d97706]" :
                    nextAction.tone === "active" ? "bg-[#15803d]" :
                    "bg-[#5b4bc2]"
                  }`}
                >
                  {nextAction.ctaLabel}
                  <ChevronRight className="h-5 w-5" />
                </Link>
                {/* Session guide trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const booking = home.todayBookings.find(
                      (b: (typeof home.todayBookings)[number]) => b.id === nextAction.bookingId
                    );
                    const ctx = booking ? buildPacerContext({ serviceName: booking.serviceName, customerName: booking.customerName, pet: booking.pet ?? null }) : null;
                    const cards = getCardsForService(booking?.serviceName ?? nextAction.title);
                    setPacerContext(ctx);
                    setPacerCards(cards.length ? cards : PACER_CARDS);
                    setPacerOpen(true);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#c4b5fd] bg-white py-3 text-[15px] font-bold text-[#5b4bc2] active:bg-[#ede9fe]"
                >
                  <BookOpen className="h-4 w-4" />
                  Session Guide dekho 📋
                </button>
              </Card>
            ) : null}

            {/* Aaj ki kamaai strip */}
            {(todayDoneCount > 0 || todaySikke > 0) ? (
              <Card className="bg-[linear-gradient(135deg,#1a1030,#3b2d8a)] text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-white/65">Aaj ka haasil</div>
                    <div className="mt-1 text-[28px] font-black tracking-[-0.02em]">+{todaySikke} Sikke 🪙</div>
                    <div className="text-[14px] text-white/70">{todayDoneCount} booking{todayDoneCount !== 1 ? "s" : ""} complete</div>
                  </div>
                  <div className="text-[52px] leading-none">🏅</div>
                </div>
              </Card>
            ) : null}

            {/* Aaj ki bookings */}
            {home.todayBookings.length > 0 ? (
              <Card>
                <SectionHead>Aaj ki Bookings 📋</SectionHead>
                <div className="space-y-2">
                  {home.todayBookings.map((booking: (typeof home.todayBookings)[number]) => (
                    <Link
                      key={booking.id}
                      href={sessionJobHref(booking.id)}
                      className="flex items-center justify-between rounded-[16px] border border-[#ede9fe] bg-[#faf8ff] px-4 py-3"
                    >
                      <div>
                        <div className="text-[16px] font-black text-[#1a1630]">{booking.serviceName}</div>
                        <div className="mt-0.5 text-[13px] text-[#6b7280]">{booking.customerName} · {booking.city}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-bold text-[#5b4bc2]">
                          {booking.startTime
                            ? new Date(booking.startTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
                            : "—"}
                        </div>
                        <div className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          booking.status === "completed" ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#ede9fe] text-[#5b4bc2]"
                        }`}>
                          {booking.status === "completed" ? "Ho gaya ✅" : "Baaki hai"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="text-center">
                <div className="py-4 text-[40px]">📭</div>
                <div className="text-[16px] font-bold text-[#6b7280]">Aaj koi booking nahi</div>
                <div className="mt-1 text-[13px] text-[#9ca3af]">Kal ki booking ready karo</div>
              </Card>
            )}

            {/* Daily missions */}
            <Card>
              <SectionHead>Aaj ke Kaam 🎯</SectionHead>
              <div className="space-y-3">
                {home.gamification.dailyMissions.map((mission: (typeof home.gamification.dailyMissions)[number]) => {
                  const pct = mission.percentMode
                    ? Math.min(100, mission.current)
                    : Math.min(100, Math.round((mission.current / Math.max(1, mission.target)) * 100));
                  const done = pct >= 100;
                  return (
                    <div key={mission.key} className={`rounded-[18px] px-4 py-3 ${done ? "bg-[#dcfce7]" : "bg-[#f5f3ff]"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-[15px] font-bold ${done ? "text-[#15803d]" : "text-[#1a1630]"}`}>
                          {done ? "✅ " : ""}{mission.title}
                        </div>
                        <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#5b4bc2]">
                          {mission.reward.replace("XP", "Sikke")}
                        </div>
                      </div>
                      {!done ? (
                        <>
                          <div className="mt-2">
                            <Bar value={pct} />
                          </div>
                          <div className="mt-1 text-[12px] text-[#6b7280]">
                            {mission.percentMode ? `${mission.current}%` : `${mission.current} / ${mission.target}`}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Closest reward teaser */}
            {closestEligibleReward ? (
              <button
                type="button"
                onClick={() => setActiveTab("inam")}
                className="w-full rounded-[22px] bg-[linear-gradient(135deg,#dcfce7,#bbf7d0)] px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-[36px]">{closestEligibleReward.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-[#15803d]">🎁 Le sakte ho abhi!</div>
                    <div className="text-[17px] font-black text-[#1a1630]">{closestEligibleReward.titleHindi}</div>
                    <div className="text-[12px] text-[#4b5563]">{closestEligibleReward.detail}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#15803d]" />
                </div>
              </button>
            ) : null}
          </>
        ) : null}

        {/* ══════════════════ TAAREIN TAB (Growth) ══════════════════ */}
        {activeTab === "taarein" ? (
          <>
            {/* Hike readiness meter */}
            {home.gamification.hikeReadiness ? (
              <Card className={home.gamification.hikeReadiness.allMet ? "border-2 border-[#86efac]" : ""}>
                <SectionHead>
                  {home.gamification.hikeReadiness.allMet ? "💰 Hike ke liye Ready ho!" : "💰 Hike kitni door hai?"}
                </SectionHead>
                {home.gamification.hikeReadiness.allMet ? (
                  <div className="mb-3 rounded-[16px] bg-[#dcfce7] px-4 py-3 text-[15px] font-bold text-[#15803d]">
                    ✅ Sab conditions poori ho gayi hain — admin se hike review maango!
                  </div>
                ) : null}
                <div className="space-y-2">
                  {home.gamification.hikeReadiness.gates.map((gate: (typeof home.gamification.hikeReadiness.gates)[number]) => {
                    const pct = Math.min(100, Math.round((gate.current / Math.max(1, gate.target)) * 100));
                    return (
                      <div key={gate.key} className={`rounded-[18px] px-4 py-3 ${gate.met ? "bg-[#f0fdf4]" : "bg-[#fafafa]"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[20px]">{gate.met ? "✅" : "⏳"}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="text-[15px] font-bold text-[#1a1630]">{gate.label}</div>
                              <div className={`text-[13px] font-semibold ${gate.met ? "text-[#15803d]" : "text-[#5b4bc2]"}`}>
                                {gate.met ? "Clear" : `${gate.current} / ${gate.target}`}
                              </div>
                            </div>
                            {!gate.met ? (
                              <div className="mt-1.5">
                                <Bar value={pct} color={pct > 70 ? "#15803d" : "#5b4bc2"} />
                              </div>
                            ) : null}
                            <div className="mt-1 text-[12px] text-[#6b7280]">{gate.detail}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {/* Streaks + Shield */}
            <Card>
              <SectionHead>🔥 Streaks aur Shield</SectionHead>

              {/* Streak shield */}
              <div className={`mb-3 flex items-center gap-3 rounded-[18px] px-4 py-3 ${
                (home.gamification.streakShieldCount ?? 0) > 0 ? "bg-[#eff6ff]" : "bg-[#fff1f2]"
              }`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[24px] ${
                  (home.gamification.streakShieldCount ?? 0) > 0 ? "bg-[#2563eb]" : "bg-[#fee2e2]"
                }`}>
                  🛡️
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-black text-[#1a1630]">Streak Shield</div>
                  <div className="text-[13px] text-[#4b5563]">
                    {(home.gamification.streakShieldCount ?? 0) > 0
                      ? "Ek baar use karo — streak toot ne se bachao"
                      : "Is mahine shield khatam — agla mahine milega"}
                  </div>
                </div>
                {(home.gamification.streakShieldCount ?? 0) > 0 ? (
                  <button
                    type="button"
                    onClick={() => void run("shield", async () => {
                      const res = await fetch(apiUrl("use-streak-shield"), { method: "POST" });
                      if (!res.ok) {
                        const d = await res.json().catch(() => ({}));
                        throw new Error(d?.error ?? "Shield kaam nahi kiya");
                      }
                      setCelebration({ title: "Shield use ho gaya! 🛡️", detail: "Teri streak safe hai. Kal wapas time par aa.", emoji: "🛡️" });
                    })}
                    disabled={busy === "shield"}
                    className="shrink-0 rounded-[14px] bg-[#2563eb] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    Use karo
                  </button>
                ) : (
                  <div className="shrink-0 rounded-[14px] bg-[#fee2e2] px-3 py-2 text-[12px] font-bold text-[#b91c1c]">
                    0 bachaa
                  </div>
                )}
              </div>

              {/* Streak rows */}
              {home.gamification.streakFamilies.map((streak: (typeof home.gamification.streakFamilies)[number]) => {
                const emoji = streak.key === "punctuality" ? "⏰" : streak.key === "review" ? "⭐" : "💪";
                return (
                  <div key={streak.key} className="mb-2 flex items-center gap-3 rounded-[18px] bg-[#faf8ff] px-4 py-3">
                    <div className="text-[28px]">{emoji}</div>
                    <div className="flex-1">
                      <div className="text-[15px] font-black text-[#1a1630]">{streak.label}</div>
                      <div className="text-[12px] text-[#6b7280]">Agla milestone: {streak.nextMilestone}</div>
                    </div>
                    <div className="text-[24px] font-black text-[#5b4bc2]">{streak.current}</div>
                  </div>
                );
              })}
            </Card>

            {/* Badges */}
            {home.gamification.badges.length > 0 ? (
              <Card>
                <SectionHead>🏅 Mere Badges</SectionHead>
                <div className="space-y-2">
                  {home.gamification.badges.map((badge: (typeof home.gamification.badges)[number]) => {
                    const meta = BADGE_HINDI[badge] ?? { emoji: "🏆", title: badge, detail: "" };
                    return (
                      <div key={badge} className="flex items-center gap-3 rounded-[18px] bg-[linear-gradient(135deg,#fef9e7,#fffdf5)] px-4 py-3">
                        <div className="text-[36px]">{meta.emoji}</div>
                        <div>
                          <div className="text-[16px] font-black text-[#1a1630]">{meta.title}</div>
                          <div className="text-[13px] text-[#6b7280]">{meta.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {/* Recent Sikke earned */}
            <Card>
              <SectionHead>Haal ke Sikke 🪙</SectionHead>
              <div className="space-y-2">
                {home.recentRewards.slice(0, 8).map((r: (typeof home.recentRewards)[number]) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-[16px] bg-[#faf8ff] px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#1a1630]">{r.summary}</div>
                      <div className="mt-0.5 text-[11px] text-[#9ca3af]">
                        {new Date(r.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="shrink-0 text-[16px] font-black text-[#5b4bc2]">+{r.xpAwarded} 🪙</div>
                  </div>
                ))}
                {home.recentRewards.length === 0 ? (
                  <div className="rounded-[16px] bg-[#faf8ff] px-4 py-4 text-center text-[14px] text-[#9ca3af]">
                    Pehli booking karoge to Sikke milenge!
                  </div>
                ) : null}
              </div>
            </Card>

            {/* Training modules */}
            {home.trainingModules.length > 0 ? (
              <Card>
                <SectionHead>📚 Seekhna aur Badhna</SectionHead>
                <div className="space-y-2">
                  {home.trainingModules.map((module: (typeof home.trainingModules)[number]) => (
                    <div key={module.id} className="rounded-[18px] border border-[#ede9fe] bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[15px] font-black text-[#1a1630]">{module.title}</div>
                        <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          module.completed ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#ede9fe] text-[#5b4bc2]"
                        }`}>
                          {module.completed ? "Ho gaya ✅" : "Baaki hai"}
                        </div>
                      </div>
                      <div className="mt-1 text-[13px] text-[#6b7280]">{module.description || "Training module"}</div>
                      <div className="mt-2 text-[13px] font-bold text-[#5b4bc2]">
                        +{module.xpReward} Sikke 🪙 · +{module.rewardPointsReward} Stars ⭐
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </>
        ) : null}

        {/* ══════════════════ INAM TAB (Rewards) ═══════════════════ */}
        {activeTab === "inam" ? (
          <>
            {/* Stars balance */}
            <Card className="bg-[linear-gradient(135deg,#1a1030,#3b2d8a)] text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] text-white/65">Mere Stars</div>
                  <div className="mt-1 text-[36px] font-black leading-none">⭐ {stars}</div>
                  <div className="mt-1 text-[13px] text-white/65">100 Sikke = 1 Star</div>
                </div>
                <div className="text-[52px] leading-none">🎁</div>
              </div>
            </Card>

            {/* Eligible now */}
            {home.rewardStore.filter((r: (typeof home.rewardStore)[number]) => r.eligible).length > 0 ? (
              <Card>
                <SectionHead>Le sakte ho ABHI ✅</SectionHead>
                <div className="space-y-2">
                  {home.rewardStore.filter((r: (typeof home.rewardStore)[number]) => r.eligible).map((reward: (typeof home.rewardStore)[number]) => {
                    const isPending = reward.currentStatus === "pending";
                    const isApproved = reward.currentStatus === "approved";
                    return (
                      <div key={reward.key} className="rounded-[20px] border-2 border-[#86efac] bg-[#f0fdf4] px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[28px] shadow-sm">
                            {reward.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[17px] font-black text-[#1a1630]">{reward.titleHindi}</div>
                            <div className="text-[12px] text-[#4b5563]">{reward.detail}</div>
                            <div className="mt-1 text-[13px] font-bold text-[#15803d]">⭐ {reward.creditsCost} Stars</div>
                          </div>
                          {!isPending && !isApproved ? (
                            <button
                              type="button"
                              onClick={() => { setSelectedRewardKey(reward.key); setRewardOpen(true); }}
                              className="shrink-0 rounded-[14px] bg-[#15803d] px-4 py-3 text-[14px] font-black text-white active:scale-[0.97]"
                            >
                              Claim
                            </button>
                          ) : (
                            <div className={`shrink-0 rounded-[14px] px-3 py-2 text-[12px] font-bold ${isApproved ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fef3c7] text-[#92400e]"}`}>
                              {isApproved ? "Milega! ✅" : "Pending ⏳"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {/* Coming soon (locked) */}
            <Card>
              <SectionHead>Jaldi Milega 🔒</SectionHead>
              <div className="space-y-2">
                {home.rewardStore
                  .filter((r: (typeof home.rewardStore)[number]) => !r.eligible)
                  .slice(0, 12)
                  .map((reward: (typeof home.rewardStore)[number]) => {
                    const starsNeeded = Math.max(0, reward.creditsCost - stars);
                    const pct = Math.min(100, Math.round((stars / Math.max(1, reward.creditsCost)) * 100));
                    return (
                      <div key={reward.key} className="rounded-[18px] bg-[#faf8ff] px-4 py-3 opacity-80">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f0eeff] text-[24px]">
                            {reward.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-black text-[#1a1630]">{reward.titleHindi}</div>
                            <div className="mt-1">
                              <Bar value={pct} color="#5b4bc2" />
                            </div>
                            <div className="mt-1 text-[11px] text-[#6b7280]">
                              {starsNeeded > 0 ? `${starsNeeded} Stars aur chahiye` : reward.requiredSalaryStage > home.member.salaryHikeStage ? "Rank badho pehle" : "Unlock ho raha hai"}
                            </div>
                          </div>
                          <Lock className="h-4 w-4 shrink-0 text-[#9ca3af]" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </>
        ) : null}

        {/* ══════════════════ MAANGO TAB (Requests) ═════════════════ */}
        {activeTab === "maango" ? (
          <>
            {/* Quick action buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setLeaveOpen(true); setLeaveStep("policy"); }}
                className="flex w-full items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,#5b4bc2,#7c6de0)] px-5 py-5 text-left text-white active:scale-[0.98]"
              >
                <div className="text-[32px]">📅</div>
                <div>
                  <div className="text-[18px] font-black">Chhuti Maango</div>
                  <div className="text-[13px] text-white/70">Planned / sick / emergency leave</div>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-white/60" />
              </button>

              <button
                type="button"
                onClick={() => setSalaryOpen(true)}
                className="flex w-full items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,#12926d,#1bbf88)] px-5 py-5 text-left text-white active:scale-[0.98]"
              >
                <div className="text-[32px]">💵</div>
                <div>
                  <div className="text-[18px] font-black">Advance Maango</div>
                  <div className="text-[13px] text-white/70">
                    {home.salaryAdvanceEligibility.eligible ? "Abhi eligible ho ✅" : "Eligibility check karo"}
                  </div>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-white/60" />
              </button>

              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex w-full items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,#1a1030,#3b2d8a)] px-5 py-5 text-left text-white active:scale-[0.98]"
              >
                <div className="text-[32px]">👤</div>
                <div>
                  <div className="text-[18px] font-black">Meri Jaankari</div>
                  <div className="text-[13px] text-white/70">
                    Profile: {home.gamification.profileCompletionPercent}% complete
                  </div>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-white/60" />
              </button>

              <button
                type="button"
                onClick={() => setReferralOpen(true)}
                className="flex w-full items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,#1e3a5f,#2563eb)] px-5 py-5 text-left text-white active:scale-[0.98]"
              >
                <div className="text-[32px]">🤝</div>
                <div>
                  <div className="text-[18px] font-black">Kisi ko Refer Karo</div>
                  <div className="text-[13px] text-white/70">Naya groomer laao, bonus pao</div>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-white/60" />
              </button>

              <button
                type="button"
                onClick={() => setTrainingOpen(true)}
                className="flex w-full items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,#0f4c3b,#0f766e)] px-5 py-5 text-left text-white active:scale-[0.98]"
              >
                <div className="text-[32px]">📚</div>
                <div>
                  <div className="text-[18px] font-black">Training Join Karo</div>
                  <div className="text-[13px] text-white/70">Naye module, zyada Sikke</div>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-white/60" />
              </button>
            </div>

            {/* Recent requests status */}
            {(home.leaveRequests.length > 0 || home.salaryAdvanceRequests.length > 0 || home.referrals.length > 0) ? (
              <Card>
                <SectionHead>Maange hue cheezon ka haal</SectionHead>
                <div className="space-y-2">
                  {home.leaveRequests.slice(0, 3).map((item: (typeof home.leaveRequests)[number]) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-[16px] bg-[#faf8ff] px-4 py-3">
                      <div>
                        <div className="text-[14px] font-bold text-[#1a1630]">
                          {item.leaveType === "planned_leave" ? "📅 Planned chhuti" : item.leaveType === "sick_leave" ? "🤒 Sick chhuti" : "🚨 Emergency chhuti"}
                        </div>
                        <div className="text-[12px] text-[#6b7280]">{item.reason}</div>
                      </div>
                      <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        item.status === "approved" ? "bg-[#dcfce7] text-[#15803d]" :
                        item.status === "rejected" ? "bg-[#fee2e2] text-[#b91c1c]" :
                        "bg-[#fef3c7] text-[#92400e]"
                      }`}>
                        {item.status === "approved" ? "Maan liya ✅" : item.status === "rejected" ? "Nahi mana ❌" : "Dekh rahe hain ⏳"}
                      </div>
                    </div>
                  ))}
                  {home.salaryAdvanceRequests.slice(0, 2).map((item: (typeof home.salaryAdvanceRequests)[number]) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-[16px] bg-[#f0fdf4] px-4 py-3">
                      <div>
                        <div className="text-[14px] font-bold text-[#1a1630]">💵 Advance ₹{item.amount.toLocaleString("en-IN")}</div>
                        <div className="text-[12px] text-[#6b7280]">{item.reason}</div>
                      </div>
                      <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        item.status === "approved" ? "bg-[#dcfce7] text-[#15803d]" :
                        item.status === "rejected" ? "bg-[#fee2e2] text-[#b91c1c]" :
                        "bg-[#fef3c7] text-[#92400e]"
                      }`}>
                        {item.status === "approved" ? "Maan liya ✅" : item.status === "rejected" ? "Nahi mana ❌" : "Dekh rahe hain ⏳"}
                      </div>
                    </div>
                  ))}
                  {home.referrals.slice(0, 2).map((item: (typeof home.referrals)[number]) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-[16px] bg-[#eff6ff] px-4 py-3">
                      <div>
                        <div className="text-[14px] font-bold text-[#1a1630]">🤝 {item.candidateName}</div>
                        <div className="text-[12px] text-[#6b7280]">{item.role} · {item.candidatePhone || "Phone pending"}</div>
                      </div>
                      <div className="shrink-0 rounded-full bg-[#dbeafe] px-2.5 py-1 text-[11px] font-bold text-[#1e40af]">
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>

      {/* ─── BOTTOM NAV ──────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] border-t border-[#e5e7eb] bg-white/95 px-3 py-2 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {[
            { key: "ghar" as const, emoji: "🏠", label: "Ghar" },
            { key: "taarein" as const, emoji: "🌟", label: "Taarein" },
            { key: "inam" as const, emoji: "🎁", label: "Inam" },
            { key: "maango" as const, emoji: "📋", label: "Maango" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-1 rounded-[16px] px-2 py-2.5 transition-colors ${
                activeTab === tab.key
                  ? "bg-[#5b4bc2] text-white"
                  : "text-[#6b7280] active:bg-[#f5f3ff]"
              }`}
            >
              <span className="text-[20px] leading-none">{tab.emoji}</span>
              <span className="text-[12px] font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────── */}

      {/* Leave */}
      <Sheet open={leaveOpen} onClose={() => setLeaveOpen(false)}>
        <div className="text-[22px] font-black text-[#1a1630]">Chhuti Maango 📅</div>
        <div className="mt-1 mb-4 flex gap-2">
          {(["policy", "dates", "details"] as LeaveStep[]).map((step, i) => (
            <div key={step} className={`h-1.5 flex-1 rounded-full ${leaveStep === step ? "bg-[#5b4bc2]" : i < ["policy", "dates", "details"].indexOf(leaveStep) ? "bg-[#86efac]" : "bg-[#e5e7eb]"}`} />
          ))}
        </div>

        {leaveStep === "policy" ? (
          <div className="space-y-3">
            <div className="rounded-[16px] bg-[#f5f3ff] px-4 py-3 text-[14px] text-[#4b5563]">
              Pehle se planned chhuti sabse acchi hoti hai. Emergency sirf zaroorat mein.
            </div>
            <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm((p) => ({ ...p, leaveType: e.target.value }))}
              className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] bg-white px-4 text-[16px] font-semibold outline-none">
              <option value="planned_leave">Planned chhuti</option>
              <option value="sick_leave">Bimari chhuti</option>
              <option value="emergency_leave">Emergency chhuti</option>
            </select>
            <div className={`rounded-[16px] px-4 py-3 text-[13px] ${leaveImpactSeverity === "high" ? "bg-[#fee2e2] text-[#b91c1c]" : leaveImpactSeverity === "medium" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#f0fdf4] text-[#166534]"}`}>
              {leaveWarning}
            </div>
            <BigBtn onClick={() => setLeaveStep("dates")}>Aage badhein →</BigBtn>
          </div>
        ) : null}

        {leaveStep === "dates" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[13px] font-semibold text-[#6b7280]">Shuru ki taareekh</div>
                <input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] px-4 text-[15px] outline-none" />
              </div>
              <div>
                <div className="mb-1 text-[13px] font-semibold text-[#6b7280]">Khatam ki taareekh</div>
                <input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] px-4 text-[15px] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLeaveStep("policy")} className="rounded-[16px] border-2 border-[#ede9fe] py-4 text-[15px] font-bold text-[#5b4bc2]">← Wapas</button>
              <BigBtn onClick={() => setLeaveStep("details")}>Aage →</BigBtn>
            </div>
          </div>
        ) : null}

        {leaveStep === "details" ? (
          <div className="space-y-3">
            <textarea rows={4} value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
              className="w-full rounded-[16px] border-2 border-[#ede9fe] px-4 py-3 text-[15px] outline-none" placeholder="Chhuti ki wajah likhein..." />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLeaveStep("dates")} className="rounded-[16px] border-2 border-[#ede9fe] py-4 text-[15px] font-bold text-[#5b4bc2]">← Wapas</button>
              <BigBtn
                color="green"
                onClick={() => void run("leave", async () => {
                  const res = await fetch(apiUrl("leave-request"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(leaveForm) });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data?.error ?? "Chhuti request fail ho gaya.");
                  setLeaveForm({ leaveType: "planned_leave", startDate: "", endDate: "", reason: "", emergencyFlag: false });
                  setLeaveOpen(false);
                  setLeaveStep("policy");
                  setCelebration({ title: "Chhuti request gayi! ✅", detail: "Admin check karenge aur batayenge.", emoji: "📅" });
                })}
                disabled={busy !== null}
              >
                {busy === "leave" ? "Ja rahi hai..." : "Chhuti bhejein ✅"}
              </BigBtn>
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* Salary advance */}
      <Sheet open={salaryOpen} onClose={() => setSalaryOpen(false)}>
        <div className="text-[22px] font-black text-[#1a1630]">Advance Maango 💵</div>
        <div className={`mt-3 mb-4 rounded-[16px] px-4 py-3 text-[14px] font-semibold ${home.salaryAdvanceEligibility.eligible ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fef3c7] text-[#92400e]"}`}>
          {home.salaryAdvanceEligibility.eligible ? "✅ Eligible ho abhi" : `⏳ ${home.salaryAdvanceEligibility.tenureMonths} mahine ho gaye — policy check karo`}
        </div>
        <div className="space-y-3">
          <input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm((p) => ({ ...p, amount: e.target.value }))}
            className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] px-4 text-[17px] font-semibold outline-none" placeholder="Kitna chahiye? (₹)" />
          <textarea rows={3} value={advanceForm.reason} onChange={(e) => setAdvanceForm((p) => ({ ...p, reason: e.target.value }))}
            className="w-full rounded-[16px] border-2 border-[#ede9fe] px-4 py-3 text-[15px] outline-none" placeholder="Kisliye chahiye?" />
          <BigBtn color="green" disabled={busy !== null} onClick={() => void run("advance", async () => {
            const res = await fetch(apiUrl("salary-advance-request"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(advanceForm.amount), reason: advanceForm.reason }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error ?? "Advance request fail ho gaya.");
            setAdvanceForm({ amount: "", reason: "" });
            setSalaryOpen(false);
            setCelebration({ title: "Advance request gayi! ✅", detail: "Admin approve karenge aur batayenge.", emoji: "💵" });
          })}>
            {busy === "advance" ? "Ja rahi hai..." : "Request bhejein ✅"}
          </BigBtn>
        </div>
      </Sheet>

      {/* Referral */}
      <Sheet open={referralOpen} onClose={() => setReferralOpen(false)}>
        <div className="text-[22px] font-black text-[#1a1630]">Kisi ko Refer Karo 🤝</div>
        <div className="mt-2 mb-4 rounded-[16px] bg-[#eff6ff] px-4 py-3 text-[14px] text-[#1e40af]">
          Accha candidate bhejo aur reward track unlock karo. Naam, phone aur role sahi likhna zaroori hai.
        </div>
        <div className="space-y-3">
          <input value={referralForm.candidateName} onChange={(e) => setReferralForm((p) => ({ ...p, candidateName: e.target.value }))}
            className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] px-4 text-[16px] outline-none" placeholder="Naam" />
          <input value={referralForm.candidatePhone} onChange={(e) => setReferralForm((p) => ({ ...p, candidatePhone: e.target.value }))}
            className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] px-4 text-[16px] outline-none" placeholder="Phone number" />
          <select value={referralForm.role} onChange={(e) => setReferralForm((p) => ({ ...p, role: e.target.value }))}
            className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] bg-white px-4 text-[16px] outline-none">
            <option value="groomer">Groomer</option>
            <option value="helper">Helper</option>
            <option value="team_lead">Team Lead</option>
          </select>
          <textarea rows={2} value={referralForm.notes} onChange={(e) => setReferralForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full rounded-[16px] border-2 border-[#ede9fe] px-4 py-3 text-[15px] outline-none" placeholder="Iske baare mein thoda batao" />
          <BigBtn disabled={busy !== null} onClick={() => void run("referral", async () => {
            const res = await fetch(apiUrl("referral"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(referralForm) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error ?? "Referral save nahi ho paaya.");
            setReferralForm({ candidateName: "", candidatePhone: "", role: "groomer", notes: "" });
            setReferralOpen(false);
            setCelebration({ title: "Referral bhej diya! 🤝", detail: "Admin ko dikh raha hai. Shukriya!", emoji: "🤝" });
          })}>
            {busy === "referral" ? "Ja raha hai..." : "Referral bhejein ✅"}
          </BigBtn>
        </div>
      </Sheet>

      {/* Training */}
      <Sheet open={trainingOpen} onClose={() => setTrainingOpen(false)}>
        <div className="text-[22px] font-black text-[#1a1630]">Training Join Karo 📚</div>
        <div className="mt-2 mb-4 text-[14px] text-[#6b7280]">Module complete karo, Sikke kamao, rank badhao.</div>
        <div className="space-y-3">
          {home.trainingModules.map((module: (typeof home.trainingModules)[number]) => (
            <div key={module.id} className="rounded-[18px] border-2 border-[#e0f2fe] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-[16px] font-black text-[#1a1630]">{module.title}</div>
                  <div className="text-[13px] text-[#6b7280]">{module.description || "Training module"}</div>
                  <div className="mt-2 text-[13px] font-bold text-[#0f766e]">+{module.xpReward} Sikke 🪙</div>
                </div>
                <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${module.completed ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#cffafe] text-[#0f766e]"}`}>
                  {module.completed ? "Ho gaya ✅" : "Khula hai"}
                </div>
              </div>
              {!module.completed ? (
                selectedTrainingId === module.id ? (
                  <div className="mt-3 space-y-2 rounded-[14px] bg-[#f0fdfa] p-3">
                    <textarea rows={2} value={trainingInterestNote} onChange={(e) => setTrainingInterestNote(e.target.value)}
                      className="w-full rounded-[12px] border border-[#99f6e4] px-3 py-2 text-[14px] outline-none" placeholder="Kyun join karna chahte ho?" />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setSelectedTrainingId(""); setTrainingInterestNote(""); }}
                        className="rounded-[12px] border-2 border-[#99f6e4] py-2.5 text-[13px] font-bold text-[#0f766e]">Cancel</button>
                      <button type="button" disabled={busy !== null}
                        onClick={() => void run("training-interest", async () => {
                          const res = await fetch(apiUrl("training-interest"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleId: module.id, note: trainingInterestNote }) });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data?.error ?? "Training interest fail ho gaya.");
                          setSelectedTrainingId(""); setTrainingInterestNote("");
                          setCelebration({ title: "Training interest gaya! 📚", detail: `${module.title} ke liye interest diya hai.`, emoji: "📚" });
                        })}
                        className="rounded-[12px] bg-[#0f766e] py-2.5 text-[13px] font-bold text-white disabled:opacity-50">
                        {busy === "training-interest" ? "Ja raha hai..." : "Interest bhejein"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setSelectedTrainingId(module.id)}
                    className="mt-3 w-full rounded-[14px] bg-[#f0fdfa] py-3 text-[14px] font-bold text-[#0f766e]">
                    {module.interestStatus === "interested" ? "Interest already bheja ✅" : "Join karna chahta hoon"}
                  </button>
                )
              ) : null}
            </div>
          ))}
        </div>
      </Sheet>

      {/* Reward claim */}
      <Sheet open={rewardOpen} onClose={() => setRewardOpen(false)}>
        {selectedReward ? (
          <>
            <div className="text-center">
              <div className="text-[56px] leading-none">{selectedReward.emoji}</div>
              <div className="mt-3 text-[22px] font-black text-[#1a1630]">{selectedReward.titleHindi}</div>
              <div className="mt-1 text-[14px] text-[#6b7280]">{selectedReward.detail}</div>
              <div className="mt-2 inline-block rounded-full bg-[#f5f3ff] px-4 py-1.5 text-[14px] font-bold text-[#5b4bc2]">
                ⭐ {selectedReward.creditsCost} Stars lagenge
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <textarea rows={3} value={rewardNote} onChange={(e) => setRewardNote(e.target.value)}
                className="w-full rounded-[16px] border-2 border-[#ede9fe] px-4 py-3 text-[15px] outline-none" placeholder="Koi baat bolni ho to likhein (zaroori nahi)" />
              <BigBtn color="green" disabled={busy !== null}
                onClick={() => void run("reward-redemption", async () => {
                  const res = await fetch(apiUrl("reward-redemption"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rewardKey: selectedReward.key, note: rewardNote }) });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data?.error ?? "Reward request fail ho gaya.");
                  setRewardNote(""); setRewardOpen(false);
                  setCelebration({ title: "Reward request gayi! 🎁", detail: `${selectedReward.titleHindi} — admin approve karenge aur batayenge.`, emoji: selectedReward.emoji });
                })}>
                {busy === "reward-redemption" ? "Ja rahi hai..." : `${selectedReward.titleHindi} maango ✅`}
              </BigBtn>
            </div>
          </>
        ) : null}
      </Sheet>

      {/* Profile */}
      <Sheet open={profileOpen} onClose={() => setProfileOpen(false)}>
        <div className="text-[22px] font-black text-[#1a1630]">Meri Jaankari 👤</div>
        <div className="mt-1 mb-4 text-[14px] text-[#6b7280]">Profile complete karo — +80 Sikke milenge 🪙</div>
        <div className="space-y-3">
          {[
            { field: "aadhaarNumber" as const, placeholder: "Aadhaar number" },
            { field: "panNumber" as const, placeholder: "PAN number" },
            { field: "bankAccountName" as const, placeholder: "Bank mein naam" },
            { field: "bankAccountNumber" as const, placeholder: "Bank account number" },
            { field: "bankIfsc" as const, placeholder: "IFSC code" },
            { field: "bankName" as const, placeholder: "Bank ka naam" },
            { field: "upiId" as const, placeholder: "UPI ID" },
            { field: "emergencyContactName" as const, placeholder: "Emergency contact naam" },
            { field: "emergencyContactPhone" as const, placeholder: "Emergency contact phone" },
          ].map(({ field, placeholder }) => (
            <input key={field} value={profileForm[field]} onChange={(e) => setProfileForm((p) => ({ ...p, [field]: e.target.value }))}
              className="h-14 w-full rounded-[16px] border-2 border-[#ede9fe] px-4 text-[15px] outline-none" placeholder={placeholder} />
          ))}
          <label className="block rounded-[16px] border-2 border-dashed border-[#c4b5fd] bg-[#faf8ff] px-4 py-3 text-[14px] text-[#5b4bc2]">
            Aadhaar ki photo
            <input type="file" accept="image/*,.pdf" className="mt-1 block w-full text-[13px]" onChange={(e) => setAadhaarFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="block rounded-[16px] border-2 border-dashed border-[#c4b5fd] bg-[#faf8ff] px-4 py-3 text-[14px] text-[#5b4bc2]">
            PAN ki photo
            <input type="file" accept="image/*,.pdf" className="mt-1 block w-full text-[13px]" onChange={(e) => setPanFile(e.target.files?.[0] ?? null)} />
          </label>
          <BigBtn color="dark" disabled={busy !== null}
            onClick={() => void run("profile", async () => {
              const fd = new FormData();
              Object.entries(profileForm).forEach(([k, v]) => fd.set(k, v));
              if (aadhaarFile) fd.set("aadhaarFile", aadhaarFile);
              if (panFile) fd.set("panFile", panFile);
              const res = await fetch(apiUrl("profile"), { method: "POST", body: fd });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data?.error ?? "Profile save nahi ho paaya.");
              setProfileOpen(false); setAadhaarFile(null); setPanFile(null);
              setCelebration({ title: "Profile save ho gaya! 👤", detail: data?.rewardsDelta?.length ? data.rewardsDelta.map((x: { summary: string }) => x.summary).join(". ") : "Tera kaam mahfooz hai.", emoji: "✅" });
            })}>
            {busy === "profile" ? "Save ho raha hai..." : "Save karo ✅"}
          </BigBtn>
        </div>
      </Sheet>

      {/* Pacer flow */}
      <AnimatePresence>
        {pacerOpen ? (
          <PacerFlow cards={pacerCards} context={pacerContext} onClose={() => setPacerOpen(false)} />
        ) : null}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebration ? (
          <CelebrationOverlay
            title={celebration.title}
            detail={celebration.detail}
            emoji={celebration.emoji}
            onClose={() => setCelebration(null)}
          />
        ) : null}
      </AnimatePresence>

      {/* suppress unused import warnings */}
      <span className="hidden">
        <Home /><Star /><Gift /><Shield /><Sparkles /><Crown /><Flame />
        <TrendingUp /><UserCircle /><CalendarClock /><CheckCircle2 /><Lock /><Zap />
        <BookOpen /><UserPlus /><CircleDollarSign /><ReceiptText /><ArrowLeft />
      </span>
    </div>
  );
}
