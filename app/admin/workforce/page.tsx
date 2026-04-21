"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { useAdminToast } from "../components/common/AdminToastProvider";
import {
  createAdminLeaveRequest,
  createAdminReferralRecord,
  createAdminSalaryAdvanceRequest,
  createAdminTrainingCompletion,
  createAdminTrainingModule,
  createAdminWorkforceAdjustment,
  fetchAdminTeams,
  fetchAdminWorkforce,
  updateAdminLeaveRequest,
  updateAdminReferralRecord,
  updateAdminSalaryAdvanceRequest,
  updateAdminTrainingModule,
  type AdminTeamRow,
} from "../lib/api";
import type {
  AdminTrainingModuleRow,
  AdminWorkforceMemberRow,
  AdminWorkforceResponse,
} from "../types";

type Filters = {
  search: string;
  teamId: string;
  activeOnly: boolean;
  salaryTrackOnly: boolean;
};

const DEFAULT_FILTERS: Filters = {
  search: "",
  teamId: "",
  activeOnly: true,
  salaryTrackOnly: false,
};

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[360] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">{title}</div>
        {subtitle ? <div className="mt-1 text-[13px] text-[#7c8499]">{subtitle}</div> : null}
        {children}
      </div>
    </div>
  );
}

function ScorePill({ label, value, tone }: { label: string; value: string | number; tone: "purple" | "green" | "amber" }) {
  const cls =
    tone === "green"
      ? "bg-[#effaf3] text-[#15803d]"
      : tone === "amber"
        ? "bg-[#fff8eb] text-[#b45309]"
        : "bg-[#f5f3ff] text-[#6d28d9]";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {label}: {value}
    </span>
  );
}

function TopCard({ row, index }: { row: AdminWorkforceMemberRow; index: number }) {
  const medalTone = index === 0 ? "from-[#ffedb5] to-[#ffd36a]" : index === 1 ? "from-[#f1f5f9] to-[#cbd5e1]" : "from-[#f6d7c3] to-[#e9a97c]";

  return (
    <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_16px_40px_rgba(73,44,120,0.08)]">
      <div className={`inline-flex rounded-full bg-gradient-to-r ${medalTone} px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#2a2346]`}>
        #{index + 1}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">{row.name}</div>
          <div className="mt-1 text-[12px] text-[#7c8499]">{row.team.name} · {row.role.replace(/_/g, " ")}</div>
          <div className="mt-2 text-[13px] font-semibold text-[#6d5bd0]">{row.gamification.rank}</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-black tracking-[-0.03em] text-[#1f1f2c]">{row.currentXp}</div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a90a6]">XP</div>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-[#f3effd]">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#6d5bd0] to-[#8b7cff]"
          style={{ width: `${row.gamification.progress.rankProgressPercent}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ScorePill label="Level" value={row.currentLevel} tone="purple" />
        <ScorePill label="Reward pts" value={row.rewardPoints} tone="amber" />
        <ScorePill label="Trust" value={row.trustScore} tone="green" />
      </div>
      <div className="mt-4 rounded-[18px] bg-[#faf9fd] p-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Next salary hike</div>
        <div className="mt-1 text-[13px] font-semibold text-[#2a2346]">
          {row.gamification.nextSalaryHike
            ? `${row.gamification.nextSalaryHike.xpRemaining} XP remaining`
            : "Highest salary band unlocked"}
        </div>
        <div className="mt-1 text-[12px] text-[#7c8499]">{row.gamification.salaryHikeLabel}</div>
      </div>
    </div>
  );
}

export default function AdminWorkforcePage() {
  const { showToast } = useAdminToast();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [data, setData] = useState<AdminWorkforceResponse | null>(null);
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [adjustmentState, setAdjustmentState] = useState<{
    memberId: string;
    memberName: string;
    mode: "reward" | "penalty";
    summary: string;
    xpAwarded: number;
    rewardPointsAwarded: number;
    trustDelta: number;
    performanceDelta: number;
    cashAmount: number;
    notes: string;
  } | null>(null);
  const [leaveState, setLeaveState] = useState<{
    memberId: string;
    memberName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    emergencyFlag: boolean;
    reason: string;
  } | null>(null);
  const [salaryState, setSalaryState] = useState<{
    memberId: string;
    memberName: string;
    amount: number;
    reason: string;
  } | null>(null);
  const [referralState, setReferralState] = useState<{
    referrerMemberId: string;
    referrerName: string;
    candidateName: string;
    candidatePhone: string;
    role: string;
    notes: string;
  } | null>(null);
  const [trainingModuleState, setTrainingModuleState] = useState<{
    moduleId?: string;
    title: string;
    category: string;
    description: string;
    xpReward: number;
    rewardPointsReward: number;
    isActive: boolean;
  } | null>(null);
  const [trainingCompletionState, setTrainingCompletionState] = useState<{
    moduleId: string;
    moduleTitle: string;
    teamMemberId: string;
    teamMemberName: string;
    score: number;
    notes: string;
  } | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError("");
      const [workforce, teamsData] = await Promise.all([fetchAdminWorkforce(), fetchAdminTeams()]);
      setData(workforce);
      setTeams(teamsData.teams);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load workforce.";
      setError(message);
      showToast(message, false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = (data?.leaderboard ?? []).filter((row) => {
    if (filters.search) {
      const haystack = `${row.name} ${row.team.name} ${row.currentRank}`.toLowerCase();
      if (!haystack.includes(filters.search.trim().toLowerCase())) return false;
    }
    if (filters.teamId && row.team.id !== filters.teamId) return false;
    if (filters.activeOnly && !row.isActive) return false;
    if (filters.salaryTrackOnly) {
      if (row.gamification.nextSalaryHike && row.gamification.nextSalaryHike.xpRemaining > 180) return false;
    }
    return true;
  });

  const topRows = rows.slice(0, 3);
  const memberOptions = (data?.leaderboard ?? []).filter((member) => member.isActive);

  const handleAdjustmentSubmit = async () => {
    if (!adjustmentState) return;
    try {
      setActionLoading(true);
      await createAdminWorkforceAdjustment({
        teamMemberId: adjustmentState.memberId,
        mode: adjustmentState.mode,
        summary: adjustmentState.summary,
        xpAwarded: adjustmentState.xpAwarded,
        rewardPointsAwarded: adjustmentState.rewardPointsAwarded,
        trustDelta: adjustmentState.trustDelta,
        performanceDelta: adjustmentState.performanceDelta,
        cashAmount: adjustmentState.cashAmount,
        notes: adjustmentState.notes,
      });
      showToast("Workforce adjustment saved.", true);
      setAdjustmentState(null);
      await load(true);
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : "Failed to save adjustment.", false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSubmit = async () => {
    if (!leaveState) return;
    try {
      setActionLoading(true);
      await createAdminLeaveRequest({
        teamMemberId: leaveState.memberId,
        leaveType: leaveState.leaveType,
        emergencyFlag: leaveState.emergencyFlag,
        startDate: leaveState.startDate,
        endDate: leaveState.endDate,
        reason: leaveState.reason,
      });
      showToast("Leave request created.", true);
      setLeaveState(null);
      await load(true);
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : "Failed to create leave request.", false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSalarySubmit = async () => {
    if (!salaryState) return;
    try {
      setActionLoading(true);
      await createAdminSalaryAdvanceRequest({
        teamMemberId: salaryState.memberId,
        amount: salaryState.amount,
        reason: salaryState.reason,
      });
      showToast("Salary advance request created.", true);
      setSalaryState(null);
      await load(true);
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : "Failed to create salary advance request.", false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReferralSubmit = async () => {
    if (!referralState) return;
    try {
      setActionLoading(true);
      await createAdminReferralRecord({
        referrerMemberId: referralState.referrerMemberId,
        candidateName: referralState.candidateName,
        candidatePhone: referralState.candidatePhone,
        role: referralState.role,
        notes: referralState.notes,
      });
      showToast("Referral record created.", true);
      setReferralState(null);
      await load(true);
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : "Failed to create referral record.", false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTrainingModuleSubmit = async () => {
    if (!trainingModuleState) return;
    try {
      setActionLoading(true);
      if (trainingModuleState.moduleId) {
        await updateAdminTrainingModule(trainingModuleState.moduleId, trainingModuleState);
      } else {
        await createAdminTrainingModule(trainingModuleState);
      }
      showToast("Training module saved.", true);
      setTrainingModuleState(null);
      await load(true);
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : "Failed to save training module.", false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTrainingCompletionSubmit = async () => {
    if (!trainingCompletionState) return;
    try {
      setActionLoading(true);
      await createAdminTrainingCompletion({
        moduleId: trainingCompletionState.moduleId,
        teamMemberId: trainingCompletionState.teamMemberId,
        score: trainingCompletionState.score,
        notes: trainingCompletionState.notes,
      });
      showToast("Training completion recorded.", true);
      setTrainingCompletionState(null);
      await load(true);
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : "Failed to record training completion.", false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Workforce"
          subtitle="Assign groomers, watch progression, and manage salary-hike readiness from one place."
          onRefresh={() => void load(true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setTrainingModuleState({
                    title: "",
                    category: "grooming_skill",
                    description: "",
                    xpReward: 30,
                    rewardPointsReward: 10,
                    isActive: true,
                  })
                }
                className="rounded-[14px] border border-[#ddd1fb] bg-white px-4 py-2 text-[13px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
              >
                New training
              </button>
              <button
                type="button"
                onClick={() =>
                  setReferralState({
                    referrerMemberId: memberOptions[0]?.id ?? "",
                    referrerName: memberOptions[0]?.name ?? "",
                    candidateName: "",
                    candidatePhone: "",
                    role: "groomer",
                    notes: "",
                  })
                }
                className="rounded-[14px] border border-[#ddd1fb] bg-white px-4 py-2 text-[13px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
              >
                New referral
              </button>
            </div>
          }
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <AdminSummaryCard label="Members" value={data?.summary.totalMembers ?? "—"} />
          <AdminSummaryCard label="Active" value={data?.summary.activeMembers ?? "—"} tone="success" />
          <AdminSummaryCard label="Salary track" value={data?.summary.salaryHikeReadyCount ?? "—"} tone="warning" />
          <AdminSummaryCard label="Avg performance" value={data?.summary.avgPerformanceScore ?? "—"} />
          <AdminSummaryCard label="Avg trust" value={data?.summary.avgTrustScore ?? "—"} />
          <AdminSummaryCard label="Reward points" value={data?.summary.totalRewardPoints ?? "—"} tone="success" />
        </div>

        <div className="mb-5 rounded-[24px] border border-[#ece5ff] bg-white p-4 shadow-[0_16px_40px_rgba(73,44,120,0.06)]">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_220px_180px] xl:grid-cols-[minmax(0,1.5fr)_220px_180px_180px]">
            <label className="grid gap-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Search</span>
              <input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Name, team, rank"
                className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Team</span>
              <select
                value={filters.teamId}
                onChange={(event) => setFilters((prev) => ({ ...prev, teamId: event.target.value }))}
                className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-[16px] border border-[#ece5ff] px-4 py-3">
              <input
                type="checkbox"
                checked={filters.activeOnly}
                onChange={(event) => setFilters((prev) => ({ ...prev, activeOnly: event.target.checked }))}
                className="h-4 w-4 rounded border-[#cfc6f5] text-[#6d5bd0] focus:ring-[#6d5bd0]"
              />
              <span className="text-[13px] font-semibold text-[#2a2346]">Active only</span>
            </label>

            <label className="flex items-center gap-3 rounded-[16px] border border-[#ece5ff] px-4 py-3">
              <input
                type="checkbox"
                checked={filters.salaryTrackOnly}
                onChange={(event) => setFilters((prev) => ({ ...prev, salaryTrackOnly: event.target.checked }))}
                className="h-4 w-4 rounded border-[#cfc6f5] text-[#6d5bd0] focus:ring-[#6d5bd0]"
              />
              <span className="text-[13px] font-semibold text-[#2a2346]">Salary hike track</span>
            </label>
          </div>
        </div>

        {!isLoading && !error && topRows.length > 0 ? (
          <div className="mb-6 grid gap-4 xl:grid-cols-3">
            {topRows.map((row, index) => (
              <TopCard key={row.id} row={row} index={index} />
            ))}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[24px] border border-[#ece5ff] bg-white shadow-[0_16px_40px_rgba(73,44,120,0.06)]">
          <div className="border-b border-[#f0ecfa] px-5 py-4">
            <div className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Leaderboard & progression</div>
            <div className="mt-1 text-[12px] text-[#7c8499]">Progression, salary-hike readiness, streaks, and recent reward movements.</div>
          </div>

          {isLoading ? (
            <div className="p-6 text-[14px] text-[#7c8499]">Loading workforce…</div>
          ) : error ? (
            <div className="p-6 text-[14px] text-[#b42318]">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-[14px] text-[#7c8499]">No workforce members match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1450px] w-full">
                <thead className="bg-[#faf9fd]">
                  <tr className="text-left">
                    {["Member", "Team", "Rank", "Progress", "Salary hike", "Scores", "Streaks", "Bookings", "Recent rewards", "Actions"].map((label) => (
                      <th key={label} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f0ecfa] align-top hover:bg-[#fcfbff]">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f3ff] text-[#6d5bd0]">
                            <Trophy className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[#2a2346]">{row.name}</div>
                            <div className="mt-0.5 text-[11px] text-[#8a90a6]">{row.role.replace(/_/g, " ")} · {row.phone ?? "No phone"}</div>
                            {!row.isActive ? (
                              <div className="mt-1 inline-flex rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#4b5563]">Inactive</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[13px] text-[#4b5563]">{row.team.name}</td>
                      <td className="px-4 py-4">
                        <div className="text-[13px] font-semibold text-[#2a2346]">{row.gamification.rank}</div>
                        <div className="mt-1 text-[11px] text-[#8a90a6]">Level {row.currentLevel} · {row.currentXp} XP</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.gamification.badges.slice(0, 2).map((badge) => (
                            <span key={badge} className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#4338ca]">{badge}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="mb-2 flex items-center justify-between text-[11px] text-[#8a90a6]">
                          <span>To next rank</span>
                          <span>{row.gamification.progress.rankProgressPercent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#f3effd]">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-[#6d5bd0] to-[#8b7cff]"
                            style={{ width: `${row.gamification.progress.rankProgressPercent}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-[#7c8499]">
                          {row.gamification.nextRank
                            ? `${row.gamification.nextRank.xpRemaining} XP to ${row.gamification.nextRank.label}`
                            : "Top rank reached"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2 rounded-[14px] bg-[#fff8eb] px-3 py-2">
                          <Sparkles className="h-4 w-4 text-[#b45309]" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#7c4a03]">{row.gamification.salaryHikeLabel}</div>
                            <div className="text-[11px] text-[#9a6b14]">
                              {row.gamification.nextSalaryHike
                                ? `${row.gamification.nextSalaryHike.xpRemaining} XP remaining`
                                : "Highest salary track unlocked"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <ScorePill label="RP" value={row.rewardPoints} tone="amber" />
                          <ScorePill label="Trust" value={row.trustScore} tone="green" />
                          <ScorePill label="Perf" value={row.performanceScore} tone="purple" />
                        </div>
                        <div className="mt-2 grid gap-1 text-[11px] text-[#7c8499]">
                          <div className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Trust gates salary advance and high-value rewards.</div>
                          <div className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Performance drives hike readiness and top-performer rankings.</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid gap-1 text-[12px] text-[#4b5563]">
                          <div>Punctuality: <span className="font-semibold text-[#2a2346]">{row.punctualityStreak}</span></div>
                          <div>Reviews: <span className="font-semibold text-[#2a2346]">{row.reviewStreak}</span></div>
                          <div>No leave: <span className="font-semibold text-[#2a2346]">{row.noLeaveStreakDays}</span> days</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid gap-1 text-[12px] text-[#4b5563]">
                          <div>Completed: <span className="font-semibold text-[#2a2346]">{row.completedCount}</span></div>
                          <div>On time: <span className="font-semibold text-[#2a2346]">{row.onTimeCount}</span></div>
                          <div>Reviews: <span className="font-semibold text-[#2a2346]">{row.reviewCount}</span></div>
                          <div>Upcoming: <span className="font-semibold text-[#2a2346]">{row.upcomingBookingsCount}</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          {row.recentRewardEvents.length ? row.recentRewardEvents.map((event) => (
                            <div key={event.id} className="rounded-[14px] bg-[#faf9fd] px-3 py-2">
                              <div className="text-[12px] font-semibold text-[#2a2346]">{event.summary}</div>
                              <div className="mt-1 text-[11px] text-[#7c8499]">
                                +{event.xpAwarded} XP · +{event.rewardPointsAwarded} RP · {new Date(event.createdAt).toLocaleDateString("en-IN")}
                              </div>
                            </div>
                          )) : (
                            <div className="text-[12px] text-[#8a90a6]">No reward events yet.</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setAdjustmentState({
                                memberId: row.id,
                                memberName: row.name,
                                mode: "reward",
                                summary: "",
                                xpAwarded: 20,
                                rewardPointsAwarded: 10,
                                trustDelta: 1,
                                performanceDelta: 2,
                                cashAmount: 0,
                                notes: "",
                              })
                            }
                            className="rounded-[10px] border border-[#d8f0df] bg-[#f7fff9] px-3 py-1.5 text-[11px] font-semibold text-[#15803d] hover:bg-[#effaf3]"
                          >
                            Reward / penalty
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLeaveState({
                                memberId: row.id,
                                memberName: row.name,
                                leaveType: "planned_leave",
                                startDate: new Date().toISOString().slice(0, 10),
                                endDate: new Date().toISOString().slice(0, 10),
                                emergencyFlag: false,
                                reason: "",
                              })
                            }
                            className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 text-[11px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd]"
                          >
                            Leave
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSalaryState({
                                memberId: row.id,
                                memberName: row.name,
                                amount: 2000,
                                reason: "",
                              })
                            }
                            className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 text-[11px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd]"
                          >
                            Salary advance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLoading && !error ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[24px] border border-[#ece5ff] bg-white shadow-[0_16px_40px_rgba(73,44,120,0.06)]">
              <div className="flex items-center justify-between border-b border-[#f0ecfa] px-5 py-4">
                <div>
                  <div className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Leave desk</div>
                  <div className="mt-1 text-[12px] text-[#7c8499]">Planned, emergency, and earned leave approvals.</div>
                </div>
              </div>
              <div className="divide-y divide-[#f0ecfa]">
                {data?.leaveRequests.length ? data.leaveRequests.slice(0, 8).map((request) => (
                  <div key={request.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-[#2a2346]">{request.teamMember.name} · {request.teamMember.team.name}</div>
                        <div className="mt-1 text-[12px] text-[#7c8499]">
                          {request.leaveType.replace(/_/g, " ")} · {new Date(request.startDate).toLocaleDateString("en-IN")} to {new Date(request.endDate).toLocaleDateString("en-IN")}
                        </div>
                        <div className="mt-1 text-[12px] text-[#4b5563]">{request.reason}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${request.status === "approved" ? "bg-[#effaf3] text-[#15803d]" : request.status === "rejected" ? "bg-[#fff1f2] text-[#be123c]" : "bg-[#fff8eb] text-[#b45309]"}`}>
                          {request.status.replace(/_/g, " ")}
                        </span>
                        {request.status === "pending" ? (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void updateAdminLeaveRequest(request.id, { status: "approved" }).then(() => load(true))} className="rounded-[10px] border border-[#d8f0df] bg-[#f7fff9] px-3 py-1 text-[11px] font-semibold text-[#15803d]">Approve</button>
                            <button type="button" onClick={() => void updateAdminLeaveRequest(request.id, { status: "rejected" }).then(() => load(true))} className="rounded-[10px] border border-[#f3d6d6] bg-[#fffafa] px-3 py-1 text-[11px] font-semibold text-[#c24134]">Reject</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )) : <div className="px-5 py-8 text-[13px] text-[#7c8499]">No leave requests yet.</div>}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#ece5ff] bg-white shadow-[0_16px_40px_rgba(73,44,120,0.06)]">
              <div className="border-b border-[#f0ecfa] px-5 py-4">
                <div className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Salary advance desk</div>
                <div className="mt-1 text-[12px] text-[#7c8499]">Track eligibility snapshots and approve or reject advance requests.</div>
              </div>
              <div className="divide-y divide-[#f0ecfa]">
                {data?.salaryAdvanceRequests.length ? data.salaryAdvanceRequests.slice(0, 8).map((request) => (
                  <div key={request.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-[#2a2346]">{request.teamMember.name} · ₹{request.amount.toLocaleString("en-IN")}</div>
                        <div className="mt-1 text-[12px] text-[#7c8499]">
                          Eligibility snapshot: {request.eligibilitySnapshot ? "Eligible" : "Needs review"} · tenure {request.tenureMonthsSnapshot} months
                        </div>
                        <div className="mt-1 text-[12px] text-[#4b5563]">{request.reason}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${request.status === "approved" ? "bg-[#effaf3] text-[#15803d]" : request.status === "rejected" ? "bg-[#fff1f2] text-[#be123c]" : "bg-[#fff8eb] text-[#b45309]"}`}>
                          {request.status.replace(/_/g, " ")}
                        </span>
                        {request.status === "pending" ? (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void updateAdminSalaryAdvanceRequest(request.id, { status: "approved" }).then(() => load(true))} className="rounded-[10px] border border-[#d8f0df] bg-[#f7fff9] px-3 py-1 text-[11px] font-semibold text-[#15803d]">Approve</button>
                            <button type="button" onClick={() => void updateAdminSalaryAdvanceRequest(request.id, { status: "rejected" }).then(() => load(true))} className="rounded-[10px] border border-[#f3d6d6] bg-[#fffafa] px-3 py-1 text-[11px] font-semibold text-[#c24134]">Reject</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )) : <div className="px-5 py-8 text-[13px] text-[#7c8499]">No salary advance requests yet.</div>}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#ece5ff] bg-white shadow-[0_16px_40px_rgba(73,44,120,0.06)]">
              <div className="border-b border-[#f0ecfa] px-5 py-4">
                <div className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Referral tracker</div>
                <div className="mt-1 text-[12px] text-[#7c8499]">Reward referrals when candidates join and pass probation.</div>
              </div>
              <div className="divide-y divide-[#f0ecfa]">
                {data?.referrals.length ? data.referrals.slice(0, 8).map((record) => (
                  <div key={record.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-[#2a2346]">{record.candidateName} · referred by {record.referrerMember.name}</div>
                        <div className="mt-1 text-[12px] text-[#7c8499]">{record.role.replace(/_/g, " ")} · {record.candidatePhone ?? "No phone"}</div>
                        {record.notes ? <div className="mt-1 text-[12px] text-[#4b5563]">{record.notes}</div> : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full bg-[#f5f3ff] px-2.5 py-1 text-[11px] font-semibold text-[#6d28d9]">{record.status.replace(/_/g, " ")}</span>
                        <div className="flex gap-2">
                          {record.status === "referred" ? <button type="button" onClick={() => void updateAdminReferralRecord(record.id, { status: "joined" }).then(() => load(true))} className="rounded-[10px] border border-[#d8f0df] bg-[#f7fff9] px-3 py-1 text-[11px] font-semibold text-[#15803d]">Joined</button> : null}
                          {record.status !== "probation_passed" ? <button type="button" onClick={() => void updateAdminReferralRecord(record.id, { status: "probation_passed" }).then(() => load(true))} className="rounded-[10px] border border-[#ddd1fb] bg-white px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">Pass probation</button> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="px-5 py-8 text-[13px] text-[#7c8499]">No referral records yet.</div>}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#ece5ff] bg-white shadow-[0_16px_40px_rgba(73,44,120,0.06)]">
              <div className="border-b border-[#f0ecfa] px-5 py-4">
                <div className="text-[17px] font-black tracking-[-0.02em] text-[#1f1f2c]">Training center</div>
                <div className="mt-1 text-[12px] text-[#7c8499]">Create modules and award progression when a groomer completes them.</div>
              </div>
              <div className="divide-y divide-[#f0ecfa]">
                {data?.trainingModules.length ? data.trainingModules.slice(0, 8).map((module: AdminTrainingModuleRow) => (
                  <div key={module.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-[#2a2346]">{module.title}</div>
                        <div className="mt-1 text-[12px] text-[#7c8499]">{module.category.replace(/_/g, " ")} · +{module.xpReward} XP · +{module.rewardPointsReward} RP</div>
                        {module.description ? <div className="mt-1 text-[12px] text-[#4b5563]">{module.description}</div> : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${module.isActive ? "bg-[#effaf3] text-[#15803d]" : "bg-[#f3f4f6] text-[#4b5563]"}`}>{module.isActive ? "Active" : "Inactive"}</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setTrainingModuleState({ moduleId: module.id, title: module.title, category: module.category, description: module.description ?? "", xpReward: module.xpReward, rewardPointsReward: module.rewardPointsReward, isActive: module.isActive })} className="rounded-[10px] border border-[#ece8f5] px-3 py-1 text-[11px] font-semibold text-[#2a2346]">Edit</button>
                          <button type="button" onClick={() => setTrainingCompletionState({ moduleId: module.id, moduleTitle: module.title, teamMemberId: memberOptions[0]?.id ?? "", teamMemberName: memberOptions[0]?.name ?? "", score: 100, notes: "" })} className="rounded-[10px] border border-[#ddd1fb] bg-white px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">Mark completion</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="px-5 py-8 text-[13px] text-[#7c8499]">No training modules yet.</div>}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {adjustmentState ? (
        <ModalShell title="Reward or penalty" subtitle={adjustmentState.memberName} onClose={() => setAdjustmentState(null)}>
          <div className="mt-4 space-y-4">
            <div className="rounded-[18px] border border-[#ece5ff] bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f2edff] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#6d5bd0]">
                  Decision guide
                </span>
                <span className="rounded-full bg-[#eef8f1] px-3 py-1 text-[11px] font-semibold text-[#15803d]">
                  Reward adds value
                </span>
                <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-[11px] font-semibold text-[#b42318]">
                  Penalty deducts value
                </span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[16px] border border-[#ece5ff] bg-white p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">How this works</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[12px] bg-[#faf7ff] px-3 py-2">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">XP</div>
                      <div className="mt-1 text-[12px] leading-[1.5] text-[#5d5670]">Moves level progression and salary-hike readiness.</div>
                    </div>
                    <div className="rounded-[12px] bg-[#fff8eb] px-3 py-2">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#b45309]">Reward points</div>
                      <div className="mt-1 text-[12px] leading-[1.5] text-[#5d5670]">Changes redeemable reward-store balance only.</div>
                    </div>
                    <div className="rounded-[12px] bg-[#eef8f1] px-3 py-2">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#15803d]">Trust</div>
                      <div className="mt-1 text-[12px] leading-[1.5] text-[#5d5670]">Use for discipline, honesty, attendance, and reliability.</div>
                    </div>
                    <div className="rounded-[12px] bg-[#f7f7fb] px-3 py-2">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#4b5563]">Performance</div>
                      <div className="mt-1 text-[12px] leading-[1.5] text-[#5d5670]">Use for grooming quality, SOP execution, and service output.</div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[12px] border border-dashed border-[#ddd1fb] bg-[#fcfbff] px-3 py-2 text-[12px] leading-[1.6] text-[#5d5670]">
                    Enter <span className="font-semibold text-[#2a2346]">positive numbers only</span>. If you choose <span className="font-semibold text-[#2a2346]">Penalty</span>, the system converts them to negative values automatically.
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[16px] border border-[#e8e3fb] bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">Use reward for</div>
                    <p className="mt-2 text-[12px] leading-[1.6] text-[#6b7280]">
                      Punctuality, customer praise, upsell contribution, clean SOP execution, training completion, or above-expectation behavior.
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[#fde2e2] bg-[#fff8f8] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#b42318]">Use penalty for</div>
                    <p className="mt-2 text-[12px] leading-[1.6] text-[#6b7280]">
                      Missed SOPs, lateness, customer complaints, misconduct, repeat carelessness, or avoidable operational mistakes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[18px] border border-[#ece5ff] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Adjustment details</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <div className="text-[12px] font-semibold text-[#4b5563]">Adjustment type</div>
                  <select value={adjustmentState.mode} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, mode: event.target.value as "reward" | "penalty" } : prev)} className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]">
                  <option value="reward">Reward</option>
                  <option value="penalty">Penalty</option>
                  </select>
                  <div className="text-[11px] leading-[1.5] text-[#8a90a6]">
                    Pick <span className="font-semibold text-[#2a2346]">Reward</span> to add value or <span className="font-semibold text-[#2a2346]">Penalty</span> to deduct value.
                  </div>
                </label>
                <label className="space-y-1.5">
                  <div className="text-[12px] font-semibold text-[#4b5563]">Short summary</div>
                  <input value={adjustmentState.summary} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, summary: event.target.value } : prev)} placeholder="Example: 5-star customer feedback" className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
                  <div className="text-[11px] leading-[1.5] text-[#8a90a6]">
                    This becomes the visible title in the member history, so keep it short and clear.
                  </div>
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <label className="rounded-[16px] border border-[#f0ecfa] bg-[#fcfbff] p-3">
                  <div className="text-[12px] font-semibold text-[#4b5563]">XP change</div>
                  <input type="number" value={adjustmentState.xpAwarded} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, xpAwarded: Number(event.target.value) } : prev)} placeholder="0" className="mt-2 h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
                  <div className="mt-2 text-[11px] leading-[1.5] text-[#8a90a6]">Changes level progression and salary-hike readiness.</div>
                </label>
                <label className="rounded-[16px] border border-[#f0ecfa] bg-[#fffdf7] p-3">
                  <div className="text-[12px] font-semibold text-[#4b5563]">Reward points</div>
                  <input type="number" value={adjustmentState.rewardPointsAwarded} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, rewardPointsAwarded: Number(event.target.value) } : prev)} placeholder="0" className="mt-2 h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
                  <div className="mt-2 text-[11px] leading-[1.5] text-[#8a90a6]">Use for redeemable perks or internal reward-store balance.</div>
                </label>
                <label className="rounded-[16px] border border-[#f0ecfa] bg-[#f8fdf9] p-3">
                  <div className="text-[12px] font-semibold text-[#4b5563]">Trust score change</div>
                  <input type="number" value={adjustmentState.trustDelta} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, trustDelta: Number(event.target.value) } : prev)} placeholder="0" className="mt-2 h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
                  <div className="mt-2 text-[11px] leading-[1.5] text-[#8a90a6]">Use for discipline, attendance, honesty, and reliability signals.</div>
                </label>
                <label className="rounded-[16px] border border-[#f0ecfa] bg-[#fafbff] p-3">
                  <div className="text-[12px] font-semibold text-[#4b5563]">Performance score change</div>
                  <input type="number" value={adjustmentState.performanceDelta} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, performanceDelta: Number(event.target.value) } : prev)} placeholder="0" className="mt-2 h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
                  <div className="mt-2 text-[11px] leading-[1.5] text-[#8a90a6]">Use for service quality, grooming outcome, and SOP execution quality.</div>
                </label>
              </div>
              <div className="mt-4 space-y-3">
                <label className="space-y-1.5">
                  <div className="text-[12px] font-semibold text-[#4b5563]">Cash amount (optional)</div>
                  <input type="number" value={adjustmentState.cashAmount} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, cashAmount: Number(event.target.value) } : prev)} placeholder="0" className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
                  <div className="text-[11px] text-[#8a90a6]">Use only if this decision includes an offline payout, deduction, or cash-linked note.</div>
                </label>
                <label className="space-y-1.5">
                  <div className="text-[12px] font-semibold text-[#4b5563]">Notes for record</div>
                  <textarea value={adjustmentState.notes} onChange={(event) => setAdjustmentState((prev) => prev ? { ...prev, notes: event.target.value } : prev)} placeholder="Explain why this reward or penalty is being applied." className="min-h-[110px] w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px]" />
                  <div className="text-[11px] leading-[1.5] text-[#8a90a6]">
                    Add enough detail that another manager can understand and defend this decision later.
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustmentState(null)} className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346]">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleAdjustmentSubmit()} className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">{actionLoading ? "Saving…" : "Save adjustment"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {leaveState ? (
        <ModalShell title="Create leave request" subtitle={leaveState.memberName} onClose={() => setLeaveState(null)}>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select value={leaveState.leaveType} onChange={(event) => setLeaveState((prev) => prev ? { ...prev, leaveType: event.target.value } : prev)} className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]">
                <option value="planned_leave">Planned leave</option>
                <option value="emergency_leave">Emergency leave</option>
                <option value="sick_leave">Sick leave</option>
                <option value="reward_leave">Reward leave</option>
              </select>
              <label className="flex items-center gap-3 rounded-[14px] border border-[#ece8f5] px-4 text-[13px]">
                <input type="checkbox" checked={leaveState.emergencyFlag} onChange={(event) => setLeaveState((prev) => prev ? { ...prev, emergencyFlag: event.target.checked } : prev)} />
                Emergency
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={leaveState.startDate} onChange={(event) => setLeaveState((prev) => prev ? { ...prev, startDate: event.target.value } : prev)} className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
              <input type="date" value={leaveState.endDate} onChange={(event) => setLeaveState((prev) => prev ? { ...prev, endDate: event.target.value } : prev)} className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
            </div>
            <textarea value={leaveState.reason} onChange={(event) => setLeaveState((prev) => prev ? { ...prev, reason: event.target.value } : prev)} placeholder="Reason" className="min-h-[100px] w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setLeaveState(null)} className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346]">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleLeaveSubmit()} className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">{actionLoading ? "Saving…" : "Create request"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {salaryState ? (
        <ModalShell title="Salary advance request" subtitle={salaryState.memberName} onClose={() => setSalaryState(null)}>
          <div className="mt-4 space-y-3">
            <input type="number" value={salaryState.amount} onChange={(event) => setSalaryState((prev) => prev ? { ...prev, amount: Number(event.target.value) } : prev)} placeholder="Amount" className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
            <textarea value={salaryState.reason} onChange={(event) => setSalaryState((prev) => prev ? { ...prev, reason: event.target.value } : prev)} placeholder="Reason" className="min-h-[100px] w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSalaryState(null)} className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346]">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleSalarySubmit()} className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">{actionLoading ? "Saving…" : "Create request"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {referralState ? (
        <ModalShell title="New referral" subtitle={referralState.referrerName || "Select referrer"} onClose={() => setReferralState(null)}>
          <div className="mt-4 space-y-3">
            <select value={referralState.referrerMemberId} onChange={(event) => {
              const selected = memberOptions.find((member) => member.id === event.target.value);
              setReferralState((prev) => prev ? { ...prev, referrerMemberId: event.target.value, referrerName: selected?.name ?? "" } : prev);
            }} className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]">
              <option value="">Select referrer</option>
              {memberOptions.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.team.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={referralState.candidateName} onChange={(event) => setReferralState((prev) => prev ? { ...prev, candidateName: event.target.value } : prev)} placeholder="Candidate name" className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
              <input value={referralState.candidatePhone} onChange={(event) => setReferralState((prev) => prev ? { ...prev, candidatePhone: event.target.value } : prev)} placeholder="Candidate phone" className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
            </div>
            <select value={referralState.role} onChange={(event) => setReferralState((prev) => prev ? { ...prev, role: event.target.value } : prev)} className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]">
              <option value="groomer">Groomer</option>
              <option value="helper">Helper</option>
              <option value="team_lead">Team lead</option>
            </select>
            <textarea value={referralState.notes} onChange={(event) => setReferralState((prev) => prev ? { ...prev, notes: event.target.value } : prev)} placeholder="Notes" className="min-h-[100px] w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReferralState(null)} className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346]">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleReferralSubmit()} className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">{actionLoading ? "Saving…" : "Create referral"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {trainingModuleState ? (
        <ModalShell title={trainingModuleState.moduleId ? "Edit training module" : "New training module"} onClose={() => setTrainingModuleState(null)}>
          <div className="mt-4 space-y-3">
            <input value={trainingModuleState.title} onChange={(event) => setTrainingModuleState((prev) => prev ? { ...prev, title: event.target.value } : prev)} placeholder="Module title" className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
            <input value={trainingModuleState.category} onChange={(event) => setTrainingModuleState((prev) => prev ? { ...prev, category: event.target.value } : prev)} placeholder="Category" className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={trainingModuleState.xpReward} onChange={(event) => setTrainingModuleState((prev) => prev ? { ...prev, xpReward: Number(event.target.value) } : prev)} placeholder="XP reward" className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
              <input type="number" value={trainingModuleState.rewardPointsReward} onChange={(event) => setTrainingModuleState((prev) => prev ? { ...prev, rewardPointsReward: Number(event.target.value) } : prev)} placeholder="Reward points" className="h-11 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
            </div>
            <textarea value={trainingModuleState.description} onChange={(event) => setTrainingModuleState((prev) => prev ? { ...prev, description: event.target.value } : prev)} placeholder="Description" className="min-h-[100px] w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px]" />
            <label className="flex items-center gap-3 rounded-[14px] border border-[#ece8f5] px-4 py-3 text-[13px]">
              <input type="checkbox" checked={trainingModuleState.isActive} onChange={(event) => setTrainingModuleState((prev) => prev ? { ...prev, isActive: event.target.checked } : prev)} />
              Active module
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setTrainingModuleState(null)} className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346]">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleTrainingModuleSubmit()} className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">{actionLoading ? "Saving…" : "Save module"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {trainingCompletionState ? (
        <ModalShell title="Mark training completion" subtitle={trainingCompletionState.moduleTitle} onClose={() => setTrainingCompletionState(null)}>
          <div className="mt-4 space-y-3">
            <select value={trainingCompletionState.teamMemberId} onChange={(event) => {
              const selected = memberOptions.find((member) => member.id === event.target.value);
              setTrainingCompletionState((prev) => prev ? { ...prev, teamMemberId: event.target.value, teamMemberName: selected?.name ?? "" } : prev);
            }} className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]">
              <option value="">Select team member</option>
              {memberOptions.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.team.name}</option>)}
            </select>
            <input type="number" value={trainingCompletionState.score} onChange={(event) => setTrainingCompletionState((prev) => prev ? { ...prev, score: Number(event.target.value) } : prev)} placeholder="Score" className="h-11 w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px]" />
            <textarea value={trainingCompletionState.notes} onChange={(event) => setTrainingCompletionState((prev) => prev ? { ...prev, notes: event.target.value } : prev)} placeholder="Completion notes" className="min-h-[100px] w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setTrainingCompletionState(null)} className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346]">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleTrainingCompletionSubmit()} className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">{actionLoading ? "Saving…" : "Record completion"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
