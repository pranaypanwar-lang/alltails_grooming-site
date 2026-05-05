"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  FileBadge2,
  Flame,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trophy,
  Siren,
  TimerReset,
  PartyPopper,
  Crown,
  UserPlus,
  BookOpen,
  TrendingUp,
  Medal,
  ReceiptText,
} from "lucide-react";
import type { serializeGroomerHome } from "../../../../lib/groomerHome";

type GroomerHomeView = NonNullable<Awaited<ReturnType<typeof serializeGroomerHome>>>;
type DashboardTab = "home" | "growth" | "requests" | "profile";
type LeaveStep = "policy" | "dates" | "details";

type CelebrationState = {
  title: string;
  detail: string;
} | null;

const BADGE_ART: Record<string, { accent: string; bg: string; icon: "crown" | "flame" | "award" | "spark"; label: string }> = {
  "First Four": { accent: "#6d5bd0", bg: "#f4f1ff", icon: "award", label: "Output" },
  "Pawfect Finish": { accent: "#d97706", bg: "#fff7e8", icon: "spark", label: "Quality" },
  "Clockwork": { accent: "#0f766e", bg: "#ecfdf5", icon: "flame", label: "Discipline" },
  "No Excuses": { accent: "#be123c", bg: "#fff1f2", icon: "crown", label: "Reliability" },
};

function Ring({
  value,
  size = 118,
  stroke = 12,
  accent = "#6d5bd0",
  track = "#ebe5fb",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  accent?: string;
  track?: string;
  children: React.ReactNode;
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  const inner = size - stroke * 2;

  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${accent} ${safeValue * 3.6}deg, ${track} 0deg)`,
      }}
    >
      <div
        className="grid place-items-center rounded-full bg-white text-center"
        style={{ width: inner, height: inner }}
      >
        {children}
      </div>
    </div>
  );
}

function AppCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`rounded-[28px] border border-[#ece3ff] bg-white/95 p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)] backdrop-blur ${className}`}
    >
      {children}
    </motion.div>
  );
}

function TinyLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{children}</div>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[18px] border border-[#ebe5fb] bg-[#fcfbff] px-3 py-3">
      <div className="flex items-center gap-2 text-[#6d5bd0]">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{label}</span>
      </div>
      <div className="mt-2 text-[18px] font-black tracking-[-0.02em] text-[#201d33]">{value}</div>
    </div>
  );
}

function DashboardSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AppCard>
      <div className="mb-3">
        <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">{title}</div>
        {subtitle ? <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">{subtitle}</div> : null}
      </div>
      {children}
    </AppCard>
  );
}

function FlowPill({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${done ? "bg-[#def7e8] text-[#15803d]" : active ? "bg-[#6d5bd0] text-white" : "bg-[#f1eefb] text-[#7c8499]"}`}>
      {label}
    </div>
  );
}

function RequestModal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[320] flex items-end justify-center bg-[rgba(20,14,35,0.42)] px-3 pb-4 pt-16">
      <div className="w-full max-w-md rounded-[30px] border border-[#ece3ff] bg-white p-4 shadow-[0_24px_70px_rgba(73,44,120,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[20px] font-black tracking-[-0.02em] text-[#1f1f2c]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e5dcff] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0]"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function formatMinutesAway(minutes: number | null | undefined) {
  if (minutes == null) return "Time update pending";
  if (minutes < 0) return `${Math.abs(minutes)} min late zone`;
  if (minutes < 60) return `${minutes} min bache hain`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} ghante bache hain` : `${hours}h ${mins}m bache hain`;
}

function BadgeGlyph({ kind, className = "h-5 w-5" }: { kind: "crown" | "flame" | "award" | "spark"; className?: string }) {
  if (kind === "crown") return <Crown className={className} />;
  if (kind === "flame") return <Flame className={className} />;
  if (kind === "spark") return <Sparkles className={className} />;
  return <Award className={className} />;
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AT";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
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
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [headerOpen, setHeaderOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationState>(null);
  const [leaveStep, setLeaveStep] = useState<LeaveStep>("policy");
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "planned_leave",
    startDate: "",
    endDate: "",
    reason: "",
    emergencyFlag: false,
  });
  const [advanceForm, setAdvanceForm] = useState({ amount: "", reason: "" });
  const [referralForm, setReferralForm] = useState({ candidateName: "", candidatePhone: "", role: "groomer", notes: "" });
  const [trainingInterestNote, setTrainingInterestNote] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("");
  const [rewardNote, setRewardNote] = useState("");
  const [selectedRewardKey, setSelectedRewardKey] = useState<string>("");
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
  const readUrl = sessionMode
    ? "/api/groomer/me"
    : `/api/groomer/home/${home.member.id}?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`;

  const refresh = async () => {
    const res = await fetch(readUrl, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Refresh nahi ho paaya.");
    setHome(data.home);
  };

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await action();
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Kuch galat ho gaya.");
    } finally {
      setBusy(null);
    }
  };

  const rankPercent = home.gamification.progress.rankProgressPercent;
  const levelPercent = Math.min(
    100,
    Math.round(
      ((home.member.currentXp - home.gamification.progress.currentLevelXpFloor) /
        Math.max(1, home.gamification.progress.nextLevelXpTarget - home.gamification.progress.currentLevelXpFloor)) *
        100
    )
  );

  const latestRecognition = useMemo(() => {
    const first = home.recentRewards[0];
    if (first) return first.summary;
    if (home.gamification.streaks.punctuality > 0) return `${home.gamification.streaks.punctuality} din punctuality streak chal rahi hai`;
    return "Aaj ka target clear karke apna next unlock pakdo";
  }, [home.recentRewards, home.gamification.streaks.punctuality]);

  const nextRewardCard = home.gamification.milestoneUnlocks.find((item) => !item.unlocked) ?? home.gamification.milestoneUnlocks[0];
  const teamLeaderboard = home.teamLeaderboard;
  const nextAction = home.nextAction;
  const leaderboardHistory = teamLeaderboard.history ?? [];
  const bestHistoryPosition = leaderboardHistory.length ? Math.min(...leaderboardHistory.map((item) => item.position)) : teamLeaderboard.currentPosition ?? 0;
  const latestHistoryPosition = leaderboardHistory.length ? leaderboardHistory[leaderboardHistory.length - 1].position : teamLeaderboard.currentPosition ?? 0;
  const historyTrend =
    leaderboardHistory.length >= 2
      ? leaderboardHistory[0].position - latestHistoryPosition
      : 0;
  const leaveWarning =
    leaveForm.emergencyFlag || leaveForm.leaveType === "emergency_leave"
      ? home.leavePolicy.sameDayImpactWarning
      : home.leavePolicy.advanceNoticeHint;
  const leaveImpactSeverity =
    (leaveForm.emergencyFlag || leaveForm.leaveType === "emergency_leave") && home.leavePolicy.sameDayImpactCount > 0
      ? "high"
      : leaveForm.startDate && leaveForm.startDate === new Date().toISOString().slice(0, 10)
        ? "medium"
        : "low";
  const unlockMoments = home.recentRewards.slice(0, 3);
  const selectedReward = home.rewardStore.find((reward) => reward.key === selectedRewardKey) ?? null;
  const primaryStateCopy = home.stateContent?.primary?.text || "Aaj ka din shuru kijiye";
  const rewardMoodCopy = home.stateContent?.rewardMood?.text || "Reward progress live hai";
  const noBookingsCopy = home.stateContent?.primary?.text || "Aaj ke liye koi booking assign nahi hui hai";
  const firstName = getFirstName(home.member.name);
  const initials = getInitials(home.member.name);
  const joinedDays = Math.max(
    1,
    Math.ceil((Date.now() - new Date(home.member.joinedAt).getTime()) / (24 * 60 * 60 * 1000))
  );
  const psychology = home.stateContent?.psychology;
  const recognitionTitle = psychology?.recognition?.title || "Aaj ka shine";
  const recognitionDetail = psychology?.recognition?.detail || latestRecognition;
  const topStateTone = psychology?.topState?.tone ?? "steady";
  const nextRewardProgress = psychology?.nextRewardProgress ?? null;
  const promotionFocus = psychology?.promotionFocus ?? null;
  const victoryLanes = psychology?.victoryLanes ?? [];

  const sessionJobHref = (id: string) =>
    sessionMode ? `/groomer/jobs/${id}` : `/groomer/jobs/${id}?token=${encodeURIComponent(token ?? "")}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fbf8ff_0%,#f1eaff_32%,#f6f7fb_100%)] px-3 pb-24 pt-3">
      <div className="mx-auto max-w-xl space-y-3">
        <AppCard className="overflow-hidden bg-[linear-gradient(135deg,#241d40_0%,#4f3fa5_48%,#7b67de_100%)] p-0 text-white">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white/14 text-[15px] font-black tracking-[0.06em] text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/65">All Tails</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="text-[20px] font-black tracking-[-0.03em]">{firstName}</div>
                    <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/90">
                      {home.member.currentRank}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-white/72">
                    {joinedDays <= 14 ? `${joinedDays} din se journey live hai` : home.member.team.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sessionMode ? (
                  <>
                    <Link
                      href="/groomer/finance"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10"
                    >
                      <ReceiptText className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void run("logout", async () => {
                        const response = await fetch("/api/groomer/logout", { method: "POST" });
                        if (!response.ok) throw new Error("Logout fail ho gaya.");
                        window.location.href = "/groomer-login";
                      })}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Link
                    href={sessionJobHref(bookingId ?? "")}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setHeaderOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10"
                >
                  {headerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[12px] font-semibold text-white/70">Level {home.member.currentLevel}</div>
                  <div className="mt-1 text-[26px] font-black tracking-[-0.03em]">{levelPercent}%</div>
                  <div className="text-[12px] text-white/72">is level ke andar progress</div>
                </div>
                <Ring value={rankPercent} size={86} stroke={8} accent="#f8d66d" track="rgba(255,255,255,0.18)">
                  <div>
                    <div className="text-[22px] font-black tracking-[-0.03em] text-[#2a2346]">{rankPercent}%</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Rank</div>
                  </div>
                </Ring>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f8d66d_0%,#fff6ca_100%)] transition-all duration-700"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
              <div className="mt-2 text-[12px] text-white/72">
                अगला रैंक: {home.gamification.nextRank?.label ?? "Top band"} · {home.gamification.nextRank ? `${home.gamification.nextRank.xpRemaining} XP aur chahiye` : "aap top band par hain"}
              </div>
            </div>
          </div>

          {headerOpen ? (
            <div className="border-t border-white/10 bg-black/10 px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <MetricPill icon={<Sparkles className="h-4 w-4" />} label="Prestige" value={home.gamification.prestigeCredits} />
                <MetricPill icon={<ShieldCheck className="h-4 w-4" />} label="Trust" value={`${home.member.trustScore}/100`} />
                <MetricPill icon={<Award className="h-4 w-4" />} label="Performance" value={`${home.member.performanceScore}/100`} />
                <MetricPill icon={<CircleDollarSign className="h-4 w-4" />} label="Salary Track" value={home.member.salaryHikeStage} />
              </div>
            </div>
          ) : null}
        </AppCard>

        {error ? (
          <div className="rounded-[20px] border border-[#f6c7cf] bg-[#fff1f2] px-4 py-3 text-[14px] text-[#be123c]">{error}</div>
        ) : null}

        {psychology?.topState ? (
          <AppCard
            className={
              topStateTone === "celebrate"
                ? "overflow-hidden border-[#ffe0a3] bg-[linear-gradient(135deg,#fff9e8_0%,#fff1c7_100%)]"
                : topStateTone === "warning"
                  ? "overflow-hidden border-[#f8d0d6] bg-[linear-gradient(135deg,#fff3f5_0%,#ffe1e6_100%)]"
                  : topStateTone === "focus"
                    ? "overflow-hidden border-[#ddd6fe] bg-[linear-gradient(135deg,#f6f2ff_0%,#eeebff_100%)]"
                    : "overflow-hidden border-[#dbeafe] bg-[linear-gradient(135deg,#eef6ff_0%,#e2ecff_100%)]"
            }
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                topStateTone === "celebrate"
                  ? "bg-white text-[#d97706]"
                  : topStateTone === "warning"
                    ? "bg-white text-[#e11d48]"
                    : topStateTone === "focus"
                      ? "bg-white text-[#6d5bd0]"
                      : "bg-white text-[#2563eb]"
              }`}>
                {topStateTone === "celebrate" ? <PartyPopper className="h-6 w-6" /> : topStateTone === "warning" ? <Siren className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <TinyLabel>Right now</TinyLabel>
                <div className="mt-2 text-[20px] font-black tracking-[-0.03em] text-[#241f38]">{psychology.topState.text}</div>
                <div className="mt-1 text-[14px] leading-[1.7] text-[#5f5871]">{psychology.topState.detail}</div>
              </div>
            </div>
          </AppCard>
        ) : null}

        {activeTab === "home" ? (
          <>
            {nextAction ? (
              <AppCard
                className={
                  nextAction.tone === "urgent"
                    ? "overflow-hidden border-[#f8d0d6] bg-[linear-gradient(135deg,#fff3f5_0%,#ffe1e6_100%)]"
                    : nextAction.tone === "soon"
                      ? "overflow-hidden border-[#f8e2b7] bg-[linear-gradient(135deg,#fff9ef_0%,#ffecc8_100%)]"
                      : nextAction.tone === "active"
                        ? "overflow-hidden border-[#ccefd8] bg-[linear-gradient(135deg,#f2fff6_0%,#dcfce7_100%)]"
                        : "overflow-hidden border-[#dde5ff] bg-[linear-gradient(135deg,#f5f8ff_0%,#ebf1ff_100%)]"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <TinyLabel>Today&apos;s next action</TinyLabel>
                    <div className="mt-2 text-[22px] font-black tracking-[-0.03em] text-[#241f38]">{nextAction.title}</div>
                    <div className="mt-2 text-[14px] leading-[1.7] text-[#5b536f]">{nextAction.detail}</div>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-[12px] font-semibold text-[#4c4662]">
                      <TimerReset className="h-4 w-4" />
                      {formatMinutesAway(nextAction.minutesAway)}
                    </div>
                  </div>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    nextAction.tone === "urgent"
                      ? "bg-[#fff] text-[#e11d48]"
                      : nextAction.tone === "soon"
                        ? "bg-[#fff7e8] text-[#d97706]"
                        : nextAction.tone === "active"
                          ? "bg-white text-[#15803d]"
                          : "bg-white text-[#4f46e5]"
                  }`}>
                    {nextAction.tone === "urgent" ? <Siren className="h-6 w-6" /> : <CalendarClock className="h-6 w-6" />}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href={sessionJobHref(nextAction.bookingId)}
                    className={`rounded-[18px] px-4 py-3 text-[14px] font-semibold ${
                      nextAction.tone === "urgent"
                        ? "bg-[#e11d48] text-white"
                        : nextAction.tone === "soon"
                          ? "bg-[#d97706] text-white"
                          : nextAction.tone === "active"
                            ? "bg-[#15803d] text-white"
                            : "bg-[#4f46e5] text-white"
                    }`}
                  >
                    {nextAction.ctaLabel}
                  </Link>
                  <div className="text-[12px] font-semibold text-[#6b7280]">
                    {home.todayBookings.length} active bookings today
                  </div>
                </div>
              </AppCard>
            ) : null}

            <AppCard className="overflow-hidden bg-[linear-gradient(135deg,#fffdf8_0%,#fff7e2_100%)]">
              <TinyLabel>Recognition</TinyLabel>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff1c8] text-[#d97706]">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[18px] font-black tracking-[-0.02em] text-[#33260b]">{recognitionTitle}</div>
                  <div className="mt-1 text-[14px] leading-[1.7] text-[#6c5b33]">{recognitionDetail}</div>
                  <div className="mt-2 inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#7c6a42]">
                    {primaryStateCopy}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] bg-[linear-gradient(135deg,#241d40_0%,#4f3fa5_50%,#7b67de_100%)] p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/65">Team leaderboard</div>
                    <div className="mt-2 text-[20px] font-black tracking-[-0.03em]">{teamLeaderboard.currentLabel}</div>
                    <div className="mt-1 text-[13px] leading-[1.6] text-white/78">{teamLeaderboard.chaseLabel}</div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                    <Crown className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-[18px] bg-white/10 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">Position</div>
                    <div className="mt-1 text-[22px] font-black">#{teamLeaderboard.currentPosition ?? "-"}</div>
                  </div>
                  <div className="rounded-[18px] bg-white/10 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">Gap</div>
                    <div className="mt-1 text-[22px] font-black">{teamLeaderboard.gapToNextXp}</div>
                  </div>
                  <div className="rounded-[18px] bg-white/10 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">Teams</div>
                    <div className="mt-1 text-[22px] font-black">{teamLeaderboard.totalActiveMembers}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {teamLeaderboard.topMembers.map((entry) => (
                    <motion.div
                      key={entry.id}
                      whileHover={{ y: -2, scale: 1.01 }}
                      className={`min-w-[144px] rounded-[20px] border px-3 py-3 ${
                        entry.isCurrentMember
                          ? "border-white/40 bg-white text-[#241d40]"
                          : "border-white/12 bg-white/10 text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-[11px] font-bold uppercase tracking-[0.08em] ${entry.isCurrentMember ? "text-[#6d5bd0]" : "text-white/65"}`}>
                          #{entry.position}
                        </div>
                        {entry.position === 1 ? <Crown className={`h-4 w-4 ${entry.isCurrentMember ? "text-[#d97706]" : "text-[#f8d66d]"}`} /> : null}
                      </div>
                      <div className="mt-2 line-clamp-1 text-[14px] font-black tracking-[-0.02em]">{entry.name}</div>
                      <div className={`mt-1 line-clamp-1 text-[11px] ${entry.isCurrentMember ? "text-[#7c8499]" : "text-white/70"}`}>{entry.rank}</div>
                      <div className={`mt-1 line-clamp-1 text-[10px] ${entry.isCurrentMember ? "text-[#9aa1b4]" : "text-white/58"}`}>Top performer: {entry.topPerformerName}</div>
                      <div className={`mt-3 text-[13px] font-semibold ${entry.isCurrentMember ? "text-[#241f38]" : "text-white/88"}`}>{entry.currentXp} team XP</div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 rounded-[20px] border border-white/12 bg-white/8 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/60">7-day position story</div>
                      <div className="mt-1 text-[13px] text-white/82">
                        {historyTrend > 0
                          ? `${historyTrend} place upar aaye ho`
                          : historyTrend < 0
                            ? `${Math.abs(historyTrend)} place neeche gaye ho`
                            : "Position stable hai, next push ki zarurat hai"}
                      </div>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white">
                      Best #{bestHistoryPosition || "-"}
                    </div>
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    {(leaderboardHistory.length ? leaderboardHistory : [{ date: new Date().toISOString(), position: latestHistoryPosition || 1, currentXp: home.member.currentXp }]).map((point) => {
                      const maxPosition = Math.max(1, teamLeaderboard.totalActiveMembers);
                      const height = Math.max(28, 96 - ((point.position - 1) / maxPosition) * 64);
                      return (
                        <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
                          <motion.div
                            initial={{ height: 0, opacity: 0.4 }}
                            animate={{ height, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={`w-full rounded-t-[12px] ${
                              point.position === latestHistoryPosition
                                ? "bg-[linear-gradient(180deg,#f8d66d_0%,#ffffff_100%)]"
                                : "bg-[linear-gradient(180deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.22)_100%)]"
                            }`}
                          />
                          <div className="text-[10px] font-bold text-white/66">#{point.position}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AppCard>

            <DashboardSection
              title="Aaj ka mission board"
              subtitle="Sabse pehle in targets ko hit karo. Yahin se daily momentum banta hai."
            >
              <div className="space-y-3">
                {home.gamification.dailyMissions.map((mission) => {
                  const percent = mission.percentMode
                    ? Math.min(100, mission.current)
                    : Math.min(100, Math.round((mission.current / Math.max(1, mission.target)) * 100));

                  return (
                    <motion.div
                      key={mission.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      whileHover={{ y: -2 }}
                      className="rounded-[22px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[16px] font-black tracking-[-0.02em] text-[#241f38]">{mission.title}</div>
                          <div className="mt-1 text-[12px] text-[#7c8499]">
                            {mission.percentMode ? `${mission.current}% complete` : `${mission.current}/${mission.target} done`}
                          </div>
                        </div>
                        <div className="rounded-full bg-[#f1ebff] px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">{mission.reward}</div>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#ece5ff]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#6d5bd0_0%,#8c7ded_55%,#c6bbff_100%)] transition-all duration-700"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Aaj ki bookings"
              subtitle="Next booking par tap karke seedha case kholo."
            >
              <div className="space-y-2">
                {home.todayBookings.length ? home.todayBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={sessionJobHref(booking.id)}
                    className="block rounded-[20px] border border-[#ebe5fb] bg-[linear-gradient(180deg,#fdfcff_0%,#f7f4ff_100%)] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[16px] font-black tracking-[-0.02em] text-[#241f38]">{booking.serviceName}</div>
                        <div className="mt-1 text-[13px] text-[#6b7280]">{booking.customerName} · {booking.city}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold text-[#6d5bd0]">
                          {booking.startTime ? new Date(booking.startTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "Time pending"}
                        </div>
                        <div className="mt-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#7c8499]">{booking.status}</div>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-4 text-[13px] text-[#6b7280]">
                    {noBookingsCopy}
                  </div>
                )}
              </div>
            </DashboardSection>

            <div className="grid grid-cols-2 gap-3">
              <AppCard className="relative overflow-hidden bg-[linear-gradient(160deg,#edf5ff_0%,#ffffff_50%,#e8f0ff_100%)]">
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#dbeafe]" />
                <TinyLabel>Next unlock</TinyLabel>
                <div className="mt-2 flex items-center gap-2 text-[#4f46e5]">
                  <PartyPopper className="h-4 w-4" />
                  <span className="text-[12px] font-semibold">{nextRewardProgress?.text ?? rewardMoodCopy}</span>
                </div>
                <div className="mt-2 text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">{nextRewardProgress?.title ?? nextRewardCard?.title ?? "Reward track"}</div>
                <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">{nextRewardProgress?.detail ?? nextRewardCard?.detail ?? "Reward progress live hai"}</div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#dbeafe]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(18, nextRewardProgress?.percent ?? rankPercent)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,#4f46e5_0%,#7c3aed_100%)]"
                  />
                </div>
              </AppCard>
              <AppCard className="relative overflow-hidden bg-[linear-gradient(160deg,#fff9eb_0%,#ffffff_45%,#fff0cc_100%)]">
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#fde68a]/60" />
                <TinyLabel>Salary hike</TinyLabel>
                <div className="mt-2 flex items-center gap-2 text-[#d97706]">
                  <Award className="h-4 w-4" />
                  <span className="text-[12px] font-semibold">Career ladder</span>
                </div>
                <div className="mt-2 text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">{promotionFocus?.title ?? home.gamification.salaryHikeLabel}</div>
                <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">{promotionFocus?.detail ?? (home.gamification.nextSalaryHike ? `${home.gamification.nextSalaryHike.xpRemaining} XP aur` : "Top stage unlocked")}</div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#fef3c7]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(14, promotionFocus?.stateKey === "PROMOTION_READY" ? 100 : rankPercent)}%`,
                    }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_100%)]"
                  />
                </div>
              </AppCard>
            </div>

            <DashboardSection
              title="Jeet ke raaste"
              subtitle="Sirf XP nahi. Quality, consistency, team push aur growth sab alag lane hain."
            >
              <div className="grid gap-3">
                {victoryLanes.map((lane) => (
                  <motion.div
                    key={lane.key}
                    whileHover={{ y: -2 }}
                    className="rounded-[22px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[16px] font-black tracking-[-0.02em] text-[#241f38]">{lane.title}</div>
                        <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">{lane.detail}</div>
                        <div className="mt-2 inline-flex rounded-full bg-[#f1ebff] px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">
                          {lane.text}
                        </div>
                      </div>
                      <div className="text-[20px] font-black tracking-[-0.03em] text-[#6d5bd0]">{lane.percent}%</div>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ece5ff]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(10, lane.percent)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#6d5bd0_0%,#8c7ded_55%,#c6bbff_100%)]"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Reward lane"
              subtitle="Ye milestones daily kaam ko visible rewards mein badalte hain."
            >
              <div className="space-y-3">
                {home.rewardStore.map((unlock, index) => (
                  <div
                    key={unlock.key}
                    className={`rounded-[22px] border px-4 py-4 ${
                      unlock.eligible
                        ? "border-[#ccefd8] bg-[linear-gradient(135deg,#f2fff6_0%,#dcfce7_100%)]"
                        : index === 0
                          ? "border-[#ddd6fe] bg-[linear-gradient(135deg,#f8f5ff_0%,#eeebff_100%)]"
                          : "border-[#ece5ff] bg-[#fcfbff]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[16px] font-black tracking-[-0.02em] text-[#241f38]">{unlock.title}</div>
                        <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">{unlock.detail}</div>
                        <div className="mt-2 text-[12px] font-semibold text-[#6d5bd0]">{unlock.creditsCost} Prestige Credits</div>
                      </div>
                      <div className="text-right">
                        <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          unlock.eligible ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#ede9fe] text-[#6d5bd0]"
                        }`}>
                          {unlock.currentStatus === "pending" ? "Pending request" : unlock.eligible ? "Eligible" : "Locked"}
                        </div>
                        {unlock.currentStatus !== "pending" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRewardKey(unlock.key);
                              setRewardOpen(true);
                            }}
                            disabled={!unlock.eligible}
                            className="mt-2 rounded-[12px] border border-[#ddd1fb] bg-white px-3 py-2 text-[12px] font-semibold text-[#6d5bd0] disabled:opacity-45"
                          >
                            Request
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardSection>
          </>
        ) : null}

        {activeTab === "growth" ? (
          <>
            <DashboardSection
              title="Growth aur promotion"
              subtitle="Yahin se dikhega agla rank aur promotion gate kitna close hai."
            >
              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                <div className="flex items-center justify-center">
                  <Ring value={rankPercent} size={128} stroke={10}>
                    <div>
                      <div className="text-[28px] font-black tracking-[-0.03em] text-[#201d33]">{rankPercent}%</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">to next rank</div>
                    </div>
                  </Ring>
                </div>
                <div className="space-y-2">
                  {home.gamification.promotionGates.map((gate) => (
                    <div key={gate.key} className={`rounded-[18px] border px-4 py-3 ${gate.met ? "border-[#ccefd8] bg-[#f4fff8]" : "border-[#ece5ff] bg-[#fcfbff]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-[#2a2346]">{gate.label}</div>
                        <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${gate.met ? "bg-[#dff7e7] text-[#15803d]" : "bg-[#f1f3f5] text-[#667085]"}`}>
                          {gate.met ? "Clear" : "Pending"}
                        </div>
                      </div>
                      <div className="mt-1 text-[13px] text-[#6b7280]">{gate.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Team leaderboard"
              subtitle="Yeh aapki team ki position sab teams ke beech dikhata hai."
            >
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Team rank</div>
                    <div className="mt-1 text-[22px] font-black text-[#241f38]">#{teamLeaderboard.currentPosition ?? "-"}</div>
                  </div>
                  <div className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Best recent</div>
                    <div className="mt-1 text-[22px] font-black text-[#241f38]">#{bestHistoryPosition || "-"}</div>
                  </div>
                  <div className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Gap ahead</div>
                    <div className="mt-1 text-[22px] font-black text-[#241f38]">{teamLeaderboard.gapToNextXp}</div>
                  </div>
                </div>
                <div className="rounded-[22px] border border-[#ece5ff] bg-[linear-gradient(180deg,#fefcff_0%,#f4f1ff_100%)] p-4">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {teamLeaderboard.topMembers.map((entry) => (
                      <div
                        key={entry.id}
                        className={`min-w-[148px] rounded-[20px] border px-3 py-3 ${
                          entry.isCurrentMember ? "border-[#6d5bd0] bg-white" : "border-[#ece5ff] bg-white/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">#{entry.position}</div>
                          {entry.position === 1 ? <Crown className="h-4 w-4 text-[#d97706]" /> : null}
                        </div>
                        <div className="mt-2 line-clamp-1 text-[14px] font-black tracking-[-0.02em] text-[#241f38]">{entry.name}</div>
                        <div className="mt-1 line-clamp-1 text-[11px] text-[#7c8499]">{entry.rank}</div>
                        <div className="mt-1 line-clamp-1 text-[10px] text-[#9aa1b4]">Top performer: {entry.topPerformerName}</div>
                        <div className="mt-2 text-[12px] font-semibold text-[#6d5bd0]">{entry.currentXp} team XP</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Streaks aur badges"
              subtitle="Consistency se game jeeta jaata hai."
            >
              <div className="grid gap-2">
                {home.gamification.streakFamilies.map((streak) => (
                  <div key={streak.key} className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-[#ef6c00]" />
                        <div className="font-semibold text-[#2a2346]">{streak.label}</div>
                      </div>
                      <div className="text-[16px] font-black text-[#6d5bd0]">{streak.current}</div>
                    </div>
                    <div className="mt-1 text-[13px] text-[#6b7280]">Next milestone: {streak.nextMilestone}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3">
                {home.gamification.badges.map((badge) => {
                  const meta = BADGE_ART[badge] ?? { accent: "#6d5bd0", bg: "#f4f1ff", icon: "award" as const, label: "Achievement" };
                  return (
                    <div
                      key={badge}
                      className="rounded-[20px] border border-[#ece5ff] px-4 py-4"
                      style={{ background: `linear-gradient(135deg, ${meta.bg} 0%, #ffffff 100%)` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.accent, color: "white" }}>
                          <BadgeGlyph kind={meta.icon} />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: meta.accent }}>{meta.label}</div>
                          <div className="mt-1 text-[16px] font-black tracking-[-0.02em] text-[#241f38]">{badge}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[22px] border border-[#ece5ff] bg-[linear-gradient(180deg,#fffdf8_0%,#fff8e8_100%)] p-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-[#d97706]" />
                  <div className="text-[16px] font-black tracking-[-0.02em] text-[#33260b]">Latest unlock moments</div>
                </div>
                <div className="mt-3 space-y-2">
                  {unlockMoments.length ? unlockMoments.map((reward) => (
                    <div key={reward.id} className="rounded-[16px] bg-white/80 px-4 py-3">
                      <div className="text-[14px] font-semibold text-[#33260b]">{reward.summary}</div>
                      <div className="mt-1 text-[12px] text-[#7c6a42]">+{reward.xpAwarded} XP · +{reward.rewardPointsAwarded} credits</div>
                    </div>
                  )) : (
                    <div className="rounded-[16px] bg-white/80 px-4 py-3 text-[13px] text-[#7c6a42]">
                      Agla unlock aaj ke missions aur streaks se banega.
                    </div>
                  )}
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Training aur growth opportunities"
              subtitle="In modules se skill bhi badegi aur progression bhi."
            >
              <div className="space-y-2">
                {home.trainingModules.map((module) => (
                  <div key={module.id} className="rounded-[18px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[15px] font-black tracking-[-0.02em] text-[#241f38]">{module.title}</div>
                        <div className="text-[12px] text-[#8a90a6]">{module.category}</div>
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        module.completed
                          ? "bg-[#dff7e7] text-[#15803d]"
                          : module.interestStatus === "interested"
                            ? "bg-[#ccfbf1] text-[#0f766e]"
                            : "bg-[#f1f3f5] text-[#667085]"
                      }`}>
                        {module.completed ? "Complete" : module.interestStatus === "interested" ? "Interest sent" : "Open"}
                      </div>
                    </div>
                    <div className="mt-2 text-[13px] text-[#6b7280]">{module.description || "Training module"}</div>
                    <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#5b4bc2]">
                      <Sparkles className="h-4 w-4" />
                      +{module.xpReward} XP · +{module.rewardPointsReward} credits
                    </div>
                  </div>
                ))}
              </div>
            </DashboardSection>
          </>
        ) : null}

        {activeTab === "requests" ? (
          <>
            <DashboardSection
              title="Quick requests"
              subtitle="Leave aur advance ko direct forms ki jagah guided flow se bhejo."
            >
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLeaveOpen(true);
                    setLeaveStep("policy");
                  }}
                  className="rounded-[22px] bg-[linear-gradient(135deg,#6d5bd0_0%,#8b7be7_100%)] px-4 py-4 text-left text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[16px] font-black tracking-[-0.02em]">Leave request flow</div>
                      <div className="mt-1 text-[13px] text-white/80">Policy check → dates → reason → submit</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSalaryOpen(true)}
                  className="rounded-[22px] bg-[linear-gradient(135deg,#12926d_0%,#1bbf88_100%)] px-4 py-4 text-left text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                      <CircleDollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[16px] font-black tracking-[-0.02em]">Advance salary flow</div>
                      <div className="mt-1 text-[13px] text-white/80">
                        {home.salaryAdvanceEligibility.eligible ? "Eligible right now" : `Eligible after ${home.salaryAdvanceEligibility.minimumTenureMonths} months + policy checks`}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReferralOpen(true)}
                  className="rounded-[22px] bg-[linear-gradient(135deg,#2a2346_0%,#4f46e5_100%)] px-4 py-4 text-left text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[16px] font-black tracking-[-0.02em]">Referral flow</div>
                      <div className="mt-1 text-[13px] text-white/80">Naam, role, phone aur short note ke saath candidate bhejein</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTrainingOpen(true)}
                  className="rounded-[22px] bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_100%)] px-4 py-4 text-left text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[16px] font-black tracking-[-0.02em]">Training path</div>
                      <div className="mt-1 text-[13px] text-white/80">Open modules, rewards, aur next skill unlock ek hi jagah dekho</div>
                    </div>
                  </div>
                </button>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Recent request status"
              subtitle="Aapke latest leave aur salary requests ka status."
            >
              <div className="space-y-2">
                {home.leaveRequests.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[#2a2346]">{item.leaveType.replace(/_/g, " ")}</div>
                      <div className="rounded-full bg-[#f1eefb] px-2.5 py-1 text-[11px] font-semibold text-[#6d5bd0]">{item.status}</div>
                    </div>
                    <div className="mt-1 text-[12px] text-[#6b7280]">{item.reason}</div>
                  </div>
                ))}
                {home.salaryAdvanceRequests.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[#2a2346]">Advance ₹{item.amount}</div>
                      <div className="rounded-full bg-[#f1eefb] px-2.5 py-1 text-[11px] font-semibold text-[#6d5bd0]">{item.status}</div>
                    </div>
                    <div className="mt-1 text-[12px] text-[#6b7280]">{item.reason}</div>
                  </div>
                ))}
                {home.referrals.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[#2a2346]">{item.candidateName}</div>
                      <div className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#4f46e5]">{item.status}</div>
                    </div>
                    <div className="mt-1 text-[12px] text-[#6b7280]">{item.role} · {item.candidatePhone || "Phone pending"}</div>
                  </div>
                ))}
              </div>
            </DashboardSection>
          </>
        ) : null}

        {activeTab === "profile" ? (
          <>
            <DashboardSection
              title="Profile completion"
              subtitle="Documents aur bank details complete karne par trust aur rewards better hote hain."
            >
              <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                <div className="flex items-center justify-center">
                  <Ring value={home.gamification.profileCompletionPercent} size={126} stroke={10} accent="#16a34a" track="#e8f7ee">
                    <div>
                      <div className="text-[28px] font-black tracking-[-0.03em] text-[#201d33]">{home.gamification.profileCompletionPercent}%</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Profile</div>
                    </div>
                  </Ring>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] px-4 py-3 text-[13px] leading-[1.7] text-[#6b7280]">
                    Profile complete karne par ek baar ka XP unlock milega aur payroll details bhi ready rahengi.
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="rounded-[18px] bg-[#2a2346] px-4 py-4 text-[15px] font-semibold text-white"
                  >
                    Profile flow kholo
                  </button>
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Mere recent rewards"
              subtitle="Har bonus aur credit yahin dikhega."
            >
              <div className="space-y-2">
                {home.recentRewards.map((reward) => (
                  <div key={reward.id} className="rounded-[18px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[14px] font-semibold text-[#2a2346]">{reward.summary}</div>
                      <div className="text-right">
                        <div className="text-[13px] font-bold text-[#15803d]">+{reward.xpAwarded} XP</div>
                        <div className="text-[11px] font-semibold text-[#7c3aed]">+{reward.rewardPointsAwarded} credits</div>
                      </div>
                    </div>
                    <div className="mt-1 text-[12px] text-[#8a90a6]">{new Date(reward.createdAt).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
            </DashboardSection>
          </>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[200] border-t border-[#e7defc] bg-white/92 px-3 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
          {[
            { key: "home" as const, label: "Home", icon: <Sparkles className="h-4 w-4" /> },
            { key: "growth" as const, label: "Growth", icon: <Trophy className="h-4 w-4" /> },
            { key: "requests" as const, label: "Requests", icon: <BriefcaseBusiness className="h-4 w-4" /> },
            { key: "profile" as const, label: "Profile", icon: <FileBadge2 className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-[18px] px-3 py-3 text-center text-[12px] font-semibold ${activeTab === tab.key ? "bg-[#6d5bd0] text-white" : "bg-[#f5f2ff] text-[#6b7280]"}`}
            >
              <div className="flex justify-center">{tab.icon}</div>
              <div className="mt-1">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>

      <RequestModal open={leaveOpen} title="Leave request flow" onClose={() => setLeaveOpen(false)}>
        <div className="flex flex-wrap gap-2">
          <FlowPill active={leaveStep === "policy"} done={leaveStep !== "policy"} label="1. Policy" />
          <FlowPill active={leaveStep === "dates"} done={leaveStep === "details"} label="2. Dates" />
          <FlowPill active={leaveStep === "details"} done={false} label="3. Reason" />
        </div>

        {leaveStep === "policy" ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] bg-[#faf8ff] px-4 py-4 text-[14px] leading-[1.7] text-[#4b5563]">
              Planned leave ko pehle se apply karein. Emergency leave sirf genuine urgent case mein use karein.
            </div>
            <select
              value={leaveForm.leaveType}
              onChange={(event) => setLeaveForm((prev) => ({ ...prev, leaveType: event.target.value }))}
              className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
            >
              <option value="planned_leave">Planned leave</option>
              <option value="sick_leave">Sick leave</option>
              <option value="emergency_leave">Emergency leave</option>
            </select>
            <label className="flex items-center gap-2 text-[14px] text-[#4b5563]">
              <input type="checkbox" checked={leaveForm.emergencyFlag} onChange={(e) => setLeaveForm((prev) => ({ ...prev, emergencyFlag: e.target.checked }))} />
              Emergency flag
            </label>
            <div
              className={`rounded-[18px] border px-4 py-4 text-[13px] leading-[1.7] ${
                leaveImpactSeverity === "high"
                  ? "border-[#fecdd3] bg-[#fff1f2] text-[#9f1239]"
                  : leaveImpactSeverity === "medium"
                    ? "border-[#fde68a] bg-[#fff8e8] text-[#9a6700]"
                    : "border-[#d9f2e4] bg-[#f0fdf4] text-[#166534]"
              }`}
            >
              <div className="font-semibold">
                {leaveImpactSeverity === "high"
                  ? "Same-day impact warning"
                  : leaveImpactSeverity === "medium"
                    ? "Aaj ki date select hui hai"
                    : "Policy guidance"}
              </div>
              <div className="mt-1">{leaveWarning}</div>
            </div>
            <button type="button" onClick={() => setLeaveStep("dates")} className="w-full rounded-[18px] bg-[#6d5bd0] px-4 py-4 text-[15px] font-semibold text-white">
              Continue
            </button>
          </div>
        ) : null}

        {leaveStep === "dates" ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))} className="h-[48px] rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" />
              <input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))} className="h-[48px] rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" />
            </div>
            {leaveForm.startDate ? (
              <div
                className={`rounded-[18px] border px-4 py-4 text-[13px] leading-[1.7] ${
                  leaveForm.startDate === new Date().toISOString().slice(0, 10)
                    ? "border-[#fecdd3] bg-[#fff1f2] text-[#9f1239]"
                    : "border-[#e9d5ff] bg-[#faf5ff] text-[#6b21a8]"
                }`}
              >
                {leaveForm.startDate === new Date().toISOString().slice(0, 10)
                  ? `${home.leavePolicy.sameDayImpactCount} active bookings par असर aa sakta hai. Ops ko jaldi notice dena zaroori hai.`
                  : "Advance date select hui hai. Ye ops planning ke liye better hai."}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLeaveStep("policy")} className="rounded-[18px] border border-[#ddd1fb] px-4 py-4 text-[14px] font-semibold text-[#6d5bd0]">
                Back
              </button>
              <button type="button" onClick={() => setLeaveStep("details")} className="rounded-[18px] bg-[#6d5bd0] px-4 py-4 text-[14px] font-semibold text-white">
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {leaveStep === "details" ? (
          <div className="mt-4 space-y-3">
            <textarea
              rows={4}
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
              className="w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none"
              placeholder="Reason likhiye"
            />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLeaveStep("dates")} className="rounded-[18px] border border-[#ddd1fb] px-4 py-4 text-[14px] font-semibold text-[#6d5bd0]">
                Back
              </button>
              <button
                type="button"
                onClick={() => void run("leave", async () => {
                  const res = await fetch(sessionMode
                    ? "/api/groomer/me/leave-request"
                    : `/api/groomer/home/${home.member.id}/leave-request?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(leaveForm),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data?.error ?? "Leave request fail ho gaya.");
                  setLeaveForm({ leaveType: "planned_leave", startDate: "", endDate: "", reason: "", emergencyFlag: false });
                  setLeaveOpen(false);
                  setLeaveStep("policy");
                })}
                disabled={busy !== null}
                className="rounded-[18px] bg-[#6d5bd0] px-4 py-4 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {busy === "leave" ? "Send ho raha hai..." : "Leave request bhejein"}
              </button>
            </div>
          </div>
        ) : null}
      </RequestModal>

      <RequestModal open={salaryOpen} title="Advance salary flow" onClose={() => setSalaryOpen(false)}>
        <div className="rounded-[18px] bg-[#faf8ff] px-4 py-4 text-[14px] leading-[1.7] text-[#4b5563]">
          Eligibility: <span className="font-semibold text-[#2a2346]">{home.salaryAdvanceEligibility.eligible ? "Eligible" : "Pending"}</span>
          <div className="mt-1">Tenure: {home.salaryAdvanceEligibility.tenureMonths} months</div>
        </div>
        <div className="mt-4 space-y-3">
          <input
            type="number"
            value={advanceForm.amount}
            onChange={(e) => setAdvanceForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
            placeholder="Amount"
          />
          <textarea
            rows={4}
            value={advanceForm.reason}
            onChange={(e) => setAdvanceForm((prev) => ({ ...prev, reason: e.target.value }))}
            className="w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none"
            placeholder="Advance kis liye chahiye"
          />
          <button
            type="button"
            onClick={() => void run("advance", async () => {
              const res = await fetch(sessionMode
                ? "/api/groomer/me/salary-advance-request"
                : `/api/groomer/home/${home.member.id}/salary-advance-request?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: Number(advanceForm.amount), reason: advanceForm.reason }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data?.error ?? "Advance request fail ho gaya.");
              setAdvanceForm({ amount: "", reason: "" });
              setSalaryOpen(false);
            })}
            disabled={busy !== null}
            className="w-full rounded-[18px] bg-[#149c6d] px-4 py-4 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {busy === "advance" ? "Send ho raha hai..." : "Advance request bhejein"}
          </button>
        </div>
      </RequestModal>

      <RequestModal open={referralOpen} title="Referral flow" onClose={() => setReferralOpen(false)}>
        <div className="rounded-[18px] bg-[#f5f3ff] px-4 py-4 text-[14px] leading-[1.7] text-[#4b5563]">
          Acha candidate refer karne se future reward track unlock ho sakta hai. Candidate ka role aur basic details sahi bharna zaroori hai.
        </div>
        <div className="mt-4 space-y-3">
          <input
            value={referralForm.candidateName}
            onChange={(e) => setReferralForm((prev) => ({ ...prev, candidateName: e.target.value }))}
            className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
            placeholder="Candidate name"
          />
          <input
            value={referralForm.candidatePhone}
            onChange={(e) => setReferralForm((prev) => ({ ...prev, candidatePhone: e.target.value }))}
            className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
            placeholder="Candidate phone"
          />
          <select
            value={referralForm.role}
            onChange={(e) => setReferralForm((prev) => ({ ...prev, role: e.target.value }))}
            className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
          >
            <option value="groomer">Groomer</option>
            <option value="helper">Helper</option>
            <option value="team_lead">Team lead</option>
          </select>
          <textarea
            rows={4}
            value={referralForm.notes}
            onChange={(e) => setReferralForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none"
            placeholder="Candidate ka short note"
          />
          <button
            type="button"
            onClick={() => void run("referral", async () => {
              const res = await fetch(
                sessionMode
                  ? "/api/groomer/me/referral"
                  : `/api/groomer/home/${home.member.id}/referral?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(referralForm),
                }
              );
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data?.error ?? "Referral save nahi ho paaya.");
              setReferralForm({ candidateName: "", candidatePhone: "", role: "groomer", notes: "" });
              setReferralOpen(false);
              setCelebration({
                title: "Referral save ho gaya",
                detail: "Candidate ab admin workforce queue mein visible hai.",
              });
            })}
            disabled={busy !== null}
            className="w-full rounded-[18px] bg-[#4338ca] px-4 py-4 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {busy === "referral" ? "Send ho raha hai..." : "Referral bhejein"}
          </button>
        </div>
      </RequestModal>

      <RequestModal open={trainingOpen} title="Training path" onClose={() => setTrainingOpen(false)}>
        <div className="space-y-3">
          <div className="rounded-[18px] bg-[#ecfeff] px-4 py-4 text-[14px] leading-[1.7] text-[#155e75]">
            Open modules ko complete karne se XP, credits aur promotion gates dono par asar padta hai. Sabse pehle un modules par dhyan do jo abhi pending hain.
          </div>
          {home.trainingModules.map((module) => (
            <div key={module.id} className="rounded-[18px] border border-[#ccfbf1] bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[15px] font-black tracking-[-0.02em] text-[#0f172a]">{module.title}</div>
                  <div className="mt-1 text-[12px] text-[#0f766e]">{module.category}</div>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${module.completed ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#cffafe] text-[#0f766e]"}`}>
                  {module.completed ? "Complete" : "Open now"}
                </div>
              </div>
              <div className="mt-2 text-[13px] leading-[1.6] text-[#475569]">{module.description || "Training opportunity"}</div>
              <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#0f766e]">
                <TrendingUp className="h-4 w-4" />
                +{module.xpReward} XP · +{module.rewardPointsReward} credits
              </div>
              {!module.completed ? (
                <button
                  type="button"
                  onClick={() => setSelectedTrainingId(module.id)}
                  className="mt-3 rounded-[12px] border border-[#99f6e4] bg-[#f0fdfa] px-3 py-2 text-[12px] font-semibold text-[#0f766e]"
                >
                  {module.interestStatus === "interested" ? "Interest already sent" : "Training mein interest bhejein"}
                </button>
              ) : null}
              {selectedTrainingId === module.id ? (
                <div className="mt-3 space-y-3 rounded-[16px] border border-[#ccfbf1] bg-[#f8fffe] p-3">
                  <textarea
                    rows={3}
                    value={trainingInterestNote}
                    onChange={(e) => setTrainingInterestNote(e.target.value)}
                    className="w-full rounded-[14px] border border-[#99f6e4] px-3 py-2 text-[13px] outline-none"
                    placeholder="Kyun join karna chahte ho, short note likho"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrainingId("");
                        setTrainingInterestNote("");
                      }}
                      className="rounded-[12px] border border-[#99f6e4] px-3 py-2 text-[12px] font-semibold text-[#0f766e]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void run("training-interest", async () => {
                        const res = await fetch(
                          sessionMode
                            ? "/api/groomer/me/training-interest"
                            : `/api/groomer/home/${home.member.id}/training-interest?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ moduleId: module.id, note: trainingInterestNote }),
                          }
                        );
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data?.error ?? "Training interest save nahi ho paaya.");
                        setSelectedTrainingId("");
                        setTrainingInterestNote("");
                        setCelebration({
                          title: "Training interest send ho gaya",
                          detail: `${module.title} ke liye aapka interest admin ko dikh raha hai.`,
                        });
                      })}
                      disabled={busy !== null}
                      className="rounded-[12px] bg-[#0f766e] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      {busy === "training-interest" ? "Send ho raha hai..." : "Interest bhejein"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </RequestModal>

      <RequestModal open={rewardOpen} title="Reward request" onClose={() => setRewardOpen(false)}>
        {selectedReward ? (
          <div className="space-y-3">
            <div className="rounded-[18px] bg-[#f5f3ff] px-4 py-4 text-[14px] leading-[1.7] text-[#4b5563]">
              <div className="font-semibold text-[#241f38]">{selectedReward.title}</div>
              <div className="mt-1">{selectedReward.detail}</div>
              <div className="mt-2 text-[12px] font-semibold text-[#6d5bd0]">
                Cost: {selectedReward.creditsCost} Prestige Credits
              </div>
            </div>
            <textarea
              rows={4}
              value={rewardNote}
              onChange={(e) => setRewardNote(e.target.value)}
              className="w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none"
              placeholder="Short note likhein"
            />
            <button
              type="button"
              onClick={() => void run("reward-redemption", async () => {
                const res = await fetch(
                  sessionMode
                    ? "/api/groomer/me/reward-redemption"
                    : `/api/groomer/home/${home.member.id}/reward-redemption?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rewardKey: selectedReward.key, note: rewardNote }),
                  }
                );
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error ?? "Reward request save nahi ho paaya.");
                setRewardNote("");
                setRewardOpen(false);
                setCelebration({
                  title: "Reward request bhej diya",
                  detail: `${selectedReward.title} ab admin review queue mein hai.`,
                });
              })}
              disabled={busy !== null}
              className="w-full rounded-[18px] bg-[#6d5bd0] px-4 py-4 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {busy === "reward-redemption" ? "Send ho raha hai..." : "Reward request bhejein"}
            </button>
          </div>
        ) : null}
      </RequestModal>

      <RequestModal open={profileOpen} title="Profile aur documents" onClose={() => setProfileOpen(false)}>
        <div className="space-y-3">
          <input value={profileForm.aadhaarNumber} onChange={(e) => setProfileForm((prev) => ({ ...prev, aadhaarNumber: e.target.value }))} className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="Aadhaar number" />
          <input value={profileForm.panNumber} onChange={(e) => setProfileForm((prev) => ({ ...prev, panNumber: e.target.value }))} className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="PAN number" />
          <input value={profileForm.bankAccountName} onChange={(e) => setProfileForm((prev) => ({ ...prev, bankAccountName: e.target.value }))} className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="Bank account name" />
          <input value={profileForm.bankAccountNumber} onChange={(e) => setProfileForm((prev) => ({ ...prev, bankAccountNumber: e.target.value }))} className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="Bank account number" />
          <div className="grid grid-cols-2 gap-3">
            <input value={profileForm.bankName} onChange={(e) => setProfileForm((prev) => ({ ...prev, bankName: e.target.value }))} className="h-[48px] rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="Bank name" />
            <input value={profileForm.bankIfsc} onChange={(e) => setProfileForm((prev) => ({ ...prev, bankIfsc: e.target.value }))} className="h-[48px] rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="IFSC" />
          </div>
          <input value={profileForm.upiId} onChange={(e) => setProfileForm((prev) => ({ ...prev, upiId: e.target.value }))} className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="UPI ID" />
          <div className="grid grid-cols-2 gap-3">
            <input value={profileForm.emergencyContactName} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))} className="h-[48px] rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="Emergency contact name" />
            <input value={profileForm.emergencyContactPhone} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))} className="h-[48px] rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="Emergency phone" />
          </div>
          <input value={profileForm.yearsExperience} onChange={(e) => setProfileForm((prev) => ({ ...prev, yearsExperience: e.target.value }))} className="h-[48px] w-full rounded-[16px] border border-[#ddd1fb] px-4 text-[14px] outline-none" placeholder="Years of experience" />
          <textarea value={profileForm.experienceNotes} onChange={(e) => setProfileForm((prev) => ({ ...prev, experienceNotes: e.target.value }))} rows={3} className="w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none" placeholder="Experience notes" />
          <label className="rounded-[16px] border border-dashed border-[#d9cffb] bg-[#fcfbff] px-4 py-3 text-[13px] text-[#5b4bc2]">
            Aadhaar image
            <input type="file" accept="image/*,.pdf" className="mt-2 block w-full text-[12px]" onChange={(e) => setAadhaarFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="rounded-[16px] border border-dashed border-[#d9cffb] bg-[#fcfbff] px-4 py-3 text-[13px] text-[#5b4bc2]">
            PAN image
            <input type="file" accept="image/*,.pdf" className="mt-2 block w-full text-[12px]" onChange={(e) => setPanFile(e.target.files?.[0] ?? null)} />
          </label>
          <button
            type="button"
            onClick={() => void run("profile", async () => {
              const formData = new FormData();
              Object.entries(profileForm).forEach(([key, value]) => formData.set(key, value));
              if (aadhaarFile) formData.set("aadhaarFile", aadhaarFile);
              if (panFile) formData.set("panFile", panFile);
              const res = await fetch(sessionMode
                ? "/api/groomer/me/profile"
                : `/api/groomer/home/${home.member.id}/profile?bookingId=${encodeURIComponent(bookingId ?? "")}&token=${encodeURIComponent(token ?? "")}`, {
                method: "POST",
                body: formData,
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data?.error ?? "Profile save nahi ho paaya.");
              setProfileOpen(false);
              setAadhaarFile(null);
              setPanFile(null);
              if (data?.rewardsDelta?.length) {
                setCelebration({
                  title: "Profile complete reward unlocked",
                  detail: data.rewardsDelta.map((item: { summary: string }) => item.summary).join(", "),
                });
              }
            })}
            disabled={busy !== null}
            className="w-full rounded-[18px] bg-[#2a2346] px-4 py-4 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {busy === "profile" ? "Save ho raha hai..." : "Profile save karein"}
          </button>
        </div>
      </RequestModal>

      <RequestModal open={!!celebration} title={celebration?.title ?? "Success"} onClose={() => setCelebration(null)}>
        <div className="rounded-[22px] bg-[linear-gradient(135deg,#fff7e8_0%,#fff1c8_100%)] px-4 py-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#d97706]">
            <PartyPopper className="h-7 w-7" />
          </div>
          <div className="mt-3 text-[15px] leading-[1.7] text-[#6c5b33]">{celebration?.detail}</div>
        </div>
      </RequestModal>
    </div>
  );
}
