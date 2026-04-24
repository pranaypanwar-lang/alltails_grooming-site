"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  completeAdminBooking,
  fetchAdminBookingDetail,
  fetchAdminQa,
  fetchAdminTeams,
  type AdminTeamRow,
  updateAdminBookingQaReview,
} from "../lib/api";
import type {
  AdminBookingDetail,
  AdminQaFilters,
  AdminQaRow,
  AdminQaSummary,
  AdminQaStatus,
} from "../types";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { AdminBookingDetailDrawer } from "../components/booking-detail/AdminBookingDetailDrawer";
import { useAdminToast } from "../components/common/AdminToastProvider";

const DEFAULT_FILTERS: AdminQaFilters = {
  search: "",
  teamId: "",
  date: "",
  scope: "today",
  qaStatus: "",
  mismatchOnly: false,
};

const QA_STATUS_CLS: Record<AdminQaRow["qaStatus"], string> = {
  not_started: "bg-[#f3f4f6] text-[#4b5563]",
  in_progress: "bg-[#fff8eb] text-[#b45309]",
  complete: "bg-[#effaf3] text-[#15803d]",
  issue: "bg-[#fff1f2] text-[#be123c]",
};

const BOOKING_STATUS_CLS: Record<AdminQaRow["bookingStatus"], string> = {
  pending_payment: "bg-[#fff8eb] text-[#b45309]",
  confirmed: "bg-[#effaf3] text-[#15803d]",
  completed: "bg-[#f3f4f6] text-[#374151]",
  cancelled: "bg-[#fff1f2] text-[#be123c]",
  payment_expired: "bg-[#fff1f2] text-[#be123c]",
};

const QUICK_TABS = [
  { id: "all", label: "All" },
  { id: "issue", label: "Issues" },
  { id: "incomplete", label: "Incomplete" },
  { id: "complete", label: "Complete" },
] as const;

const QA_SCOPE_TABS = [
  { id: "today", label: "Today" },
  { id: "past", label: "Past" },
] as const;

type QuickTabId = (typeof QUICK_TABS)[number]["id"];
type QaScopeTabId = (typeof QA_SCOPE_TABS)[number]["id"];
type RefreshCadence = "off" | "900";
type ViewMode = "table" | "grouped";

function formatCsvValue(value: string | number | boolean | null | undefined) {
  const safe = String(value ?? "").replace(/"/g, '""');
  return `"${safe}"`;
}

function downloadQaCsv(rows: AdminQaRow[]) {
  const header = [
    "Booking ID",
    "Date",
    "Window",
    "Pet Parent",
    "Contact",
    "City",
    "Service",
    "Team",
    "Booking Status",
    "Dispatch State",
    "QA Status",
    "Required Completed",
    "Required Total",
    "Total Completed",
    "Total Steps",
    "Missing Steps",
    "Payment Mismatch",
    "Payment Method",
    "Created At",
  ];

  const lines = [
    header.map((value) => formatCsvValue(value)).join(","),
    ...rows.map((row) =>
      [
        row.bookingId,
        row.selectedDate,
        row.windowLabel,
        row.customer.name,
        row.customer.phoneMasked,
        row.city,
        row.serviceName,
        row.team?.name ?? "Unassigned",
        row.bookingStatusLabel,
        row.dispatchState.replace(/_/g, " "),
        row.qaStatusLabel,
        row.requiredCompletedCount,
        row.requiredTotalCount,
        row.totalCompletedCount,
        row.totalStepCount,
        row.missingStepLabels.join("; "),
        row.paymentMismatchFlag ? "Yes" : "No",
        row.paymentMethodLabel,
        row.createdAt,
      ]
        .map((value) => formatCsvValue(value))
        .join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `qa-board-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getFilteredRows(rows: AdminQaRow[], quickTab: QuickTabId) {
  if (quickTab === "issue") return rows.filter((row) => row.qaStatus === "issue");
  if (quickTab === "complete") return rows.filter((row) => row.qaStatus === "complete");
  if (quickTab === "incomplete") {
    return rows.filter((row) => row.qaStatus === "not_started" || row.qaStatus === "in_progress");
  }
  return rows;
}

function QaTable({
  rows,
  onOpen,
}: {
  rows: AdminQaRow[];
  onOpen: (bookingId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1520px] w-full">
        <thead className="bg-[#faf9fd]">
          <tr className="text-left">
            {["Date", "Window", "Pet parent", "Contact", "Service", "Team", "Booking", "Dispatch", "QA", "SOP progress", "Proofs", "Missing", "Payment", "Actions"].map((label) => (
              <th key={label} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6] whitespace-nowrap">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.bookingId} className="border-t border-[#f0ecfa] hover:bg-[#fcfbff] transition-colors">
              <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">{row.selectedDate ?? "—"}</td>
              <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">{row.windowLabel ?? "—"}</td>
              <td className="px-4 py-3.5 cursor-pointer hover:text-[#6d5bd0]" onClick={() => onOpen(row.bookingId)}>
                <div className="text-[13px] font-semibold text-[#2a2346]">{row.customer.name}</div>
                <div className="mt-0.5 text-[11px] text-[#8a90a6]">{row.city ?? "—"}</div>
              </td>
              <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">{row.customer.phoneMasked}</td>
              <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">{row.serviceName}</td>
              <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">
                {row.team?.name ?? <span className="font-medium text-[#b45309]">Unassigned</span>}
              </td>
              <td className="px-4 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${BOOKING_STATUS_CLS[row.bookingStatus]}`}>
                  {row.bookingStatusLabel}
                </span>
              </td>
              <td className="px-4 py-3.5 text-[12px] font-medium text-[#4b5563] whitespace-nowrap">
                {row.dispatchState.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${QA_STATUS_CLS[row.qaStatus]}`}>
                  {row.qaStatusLabel}
                </span>
                {row.qaCompletedWithoutProof ? (
                  <div className="mt-1 text-[11px] font-medium text-[#b45309]">Closed without proof</div>
                ) : null}
              </td>
              <td className="px-4 py-3.5 text-[12px] text-[#4b5563] whitespace-nowrap">
                {row.requiredCompletedCount}/{row.requiredTotalCount} required
                <div className="mt-1 text-[11px] text-[#8a90a6]">
                  {row.totalCompletedCount}/{row.totalStepCount} total
                </div>
              </td>
              <td className="px-4 py-3.5 text-[12px] text-[#4b5563] whitespace-nowrap">
                {row.requiredProofCompletedCount}/{row.requiredProofTotalCount} proof-backed
                <div className="mt-1 text-[11px] text-[#8a90a6]">
                  {row.totalProofCount} upload{row.totalProofCount !== 1 ? "s" : ""}
                </div>
                {row.recentProofs.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {row.recentProofs.slice(0, 2).map((proof) => (
                      <a
                        key={proof.id}
                        href={proof.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-2 rounded-[10px] border border-[#ece5ff] bg-[#fcfbff] px-2 py-1.5 hover:bg-[#f6f4fd] transition-colors"
                        title={`Open ${proof.stepKey.replace(/_/g, " ")}`}
                      >
                        {proof.mimeType?.startsWith("image/") ? (
                          <span className="relative h-9 w-9 overflow-hidden rounded-[8px] border border-[#ece5ff] bg-white">
                            <Image
                              src={proof.publicUrl}
                              alt={proof.stepKey.replace(/_/g, " ")}
                              fill
                              unoptimized
                              loader={({ src }) => src}
                              className="object-cover"
                              sizes="36px"
                            />
                          </span>
                        ) : (
                          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-[8px] border border-[#ece5ff] bg-white px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">
                            Video
                          </span>
                        )}
                        <span className="max-w-[92px] truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6d5bd0] group-hover:text-[#5a47c7]">
                          {proof.stepKey.replace(/_/g, " ")}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3.5 text-[12px] text-[#4b5563] max-w-[260px]">
                {row.missingProofLabels.length
                  ? row.missingProofLabels.slice(0, 2).join(", ")
                  : row.missingStepLabels.length
                    ? row.missingStepLabels.slice(0, 2).join(", ")
                    : "All critical checks done"}
                {row.missingProofLabels.length > 2
                  ? ` +${row.missingProofLabels.length - 2}`
                  : row.missingStepLabels.length > 2
                    ? ` +${row.missingStepLabels.length - 2}`
                    : ""}
              </td>
              <td className="px-4 py-3.5 text-[12px] whitespace-nowrap">
                {row.paymentMismatchFlag ? (
                  <span className="rounded-full bg-[#fff1f2] px-2.5 py-1 font-semibold text-[#be123c]">Mismatch</span>
                ) : (
                  <span className="rounded-full bg-[#effaf3] px-2.5 py-1 font-semibold text-[#15803d]">
                    {row.paymentMethodLabel ?? "—"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => onOpen(row.bookingId)}
                  className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[11px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors whitespace-nowrap"
                >
                  View details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminQaPage() {
  const { showToast } = useAdminToast();
  const [filters, setFilters] = useState<AdminQaFilters>(DEFAULT_FILTERS);
  const [quickTab, setQuickTab] = useState<QuickTabId>("all");
  const [refreshCadence, setRefreshCadence] = useState<RefreshCadence>("off");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [summary, setSummary] = useState<AdminQaSummary | null>(null);
  const [rows, setRows] = useState<AdminQaRow[]>([]);
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBooking, setDrawerBooking] = useState<AdminBookingDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [qaActionBusy, setQaActionBusy] = useState(false);

  const load = useCallback(async (nextFilters: AdminQaFilters, silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError("");
    try {
      const [qaData, teamsData] = await Promise.all([
        fetchAdminQa(nextFilters),
        fetchAdminTeams(),
      ]);
      setSummary(qaData.summary);
      setRows(qaData.bookings);
      setTeams(teamsData.teams);
      setLastRefreshedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load QA board.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  useEffect(() => {
    if (refreshCadence === "off") return;
    const everyMs = 15 * 60_000;
    const intervalId = window.setInterval(() => {
      void load(filters, true);
    }, everyMs);
    return () => window.clearInterval(intervalId);
  }, [filters, load, refreshCadence]);

  const openDrawer = useCallback(async (bookingId: string) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError("");
    setDrawerBooking(null);

    try {
      const data = await fetchAdminBookingDetail(bookingId);
      setDrawerBooking(data.booking);
    } catch (loadError) {
      setDrawerError(loadError instanceof Error ? loadError.message : "Failed to load booking details.");
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const refreshDrawerBooking = useCallback(async () => {
    if (!drawerBooking) return;

    await Promise.all([
      load(filters, true),
      openDrawer(drawerBooking.id),
    ]);
  }, [drawerBooking, filters, load, openDrawer]);

  const handleDrawerAction = useCallback(async (action: string) => {
    if (!drawerBooking) return;

    try {
      if (action === "mark_completed") {
        setQaActionBusy(true);
        await completeAdminBooking(drawerBooking.id);
        showToast("Booking marked completed.", true);
        await refreshDrawerBooking();
      }
    } catch (actionError) {
      showToast(actionError instanceof Error ? actionError.message : "Action failed.", false);
    } finally {
      setQaActionBusy(false);
    }
  }, [drawerBooking, refreshDrawerBooking, showToast]);

  const submitQaReview = useCallback(async (input: {
    qaStatus: "in_progress" | "complete" | "issue";
    completeBooking?: boolean;
    allowMissingRequiredSteps?: boolean;
  }) => {
    if (!drawerBooking) return;

    try {
      setQaActionBusy(true);
      const response = await updateAdminBookingQaReview(drawerBooking.id, input);
      showToast(
        input.completeBooking
          ? response.completion?.rewardSuppressedReason
            ? "Booking completed from QA. XP was withheld because proof was missing."
            : "Booking completed from QA."
          : input.qaStatus === "issue"
            ? "QA issue flagged."
            : "QA marked complete.",
        true
      );
      await refreshDrawerBooking();
    } catch (reviewError) {
      showToast(reviewError instanceof Error ? reviewError.message : "Failed to update QA review.", false);
    } finally {
      setQaActionBusy(false);
    }
  }, [drawerBooking, refreshDrawerBooking, showToast]);

  const applyFilters = (patch: Partial<AdminQaFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const visibleRows = useMemo(() => getFilteredRows(rows, quickTab), [quickTab, rows]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, { label: string; rows: AdminQaRow[] }>();
    for (const row of visibleRows) {
      const key = row.team?.id ?? "unassigned";
      const label = row.team?.name ?? "Unassigned";
      if (!groups.has(key)) groups.set(key, { label, rows: [] });
      groups.get(key)!.rows.push(row);
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [visibleRows]);

  const quickTabCounts = useMemo<Record<QuickTabId, number>>(
    () => ({
      all: rows.length,
      issue: rows.filter((row) => row.qaStatus === "issue").length,
      incomplete: rows.filter((row) => row.qaStatus === "not_started" || row.qaStatus === "in_progress").length,
      complete: rows.filter((row) => row.qaStatus === "complete").length,
    }),
    [rows]
  );

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="QA"
          subtitle={
            filters.scope === "past"
              ? "Past-case QA archive for proof checks, issue review, and completion audits."
              : "Same-day QA board with live cases first, followed by upcoming jobs for today."
          }
          onRefresh={() => void load(filters, true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <div className="flex items-center gap-2">
              <Link
                href="/admin/bookings"
                className="inline-flex items-center h-[42px] rounded-[14px] border border-[#ece8f5] bg-white px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
              >
                Bookings
              </Link>
              <Link
                href="/admin/dispatch"
                className="inline-flex items-center h-[42px] rounded-[14px] border border-[#ece8f5] bg-white px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
              >
                Dispatch
              </Link>
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="mr-2 inline-flex rounded-full bg-[#f1eff9] p-1">
            {QA_SCOPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => applyFilters({ scope: tab.id as QaScopeTabId, date: "" })}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
                  filters.scope === tab.id
                    ? "bg-[#6d5bd0] text-white shadow-[0_6px_16px_rgba(109,91,208,0.28)]"
                    : "text-[#6d5bd0] hover:bg-[#e8e3fb]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {QUICK_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQuickTab(tab.id)}
              className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                quickTab === tab.id
                  ? "bg-[#6d5bd0] text-white"
                  : "bg-[#f6f4fd] text-[#6d5bd0] hover:bg-[#ede9fc]"
              }`}
            >
              {tab.label} · {quickTabCounts[tab.id]}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2 text-[12px] text-[#7c8499]">
            <span>
              Last refreshed{" "}
              {lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleTimeString("en-IN") : "—"}
            </span>
            <select
              value={refreshCadence}
              onChange={(event) => setRefreshCadence(event.target.value as RefreshCadence)}
              className="h-[36px] rounded-[12px] border border-[#ddd1fb] bg-white px-3 text-[12px] outline-none"
            >
              <option value="off">Auto-refresh off</option>
              <option value="900">Refresh every 15 min</option>
            </select>
            <div className="inline-flex rounded-[12px] border border-[#ddd1fb] bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-[10px] px-3 py-1.5 font-semibold ${viewMode === "table" ? "bg-[#6d5bd0] text-white" : "text-[#6d5bd0]"}`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={`rounded-[10px] px-3 py-1.5 font-semibold ${viewMode === "grouped" ? "bg-[#6d5bd0] text-white" : "text-[#6d5bd0]"}`}
              >
                By team
              </button>
            </div>
            <button
              type="button"
              onClick={() => downloadQaCsv(visibleRows)}
              className="h-[36px] rounded-[12px] border border-[#ddd1fb] bg-white px-3 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <AdminSummaryCard label="Total" value={summary?.totalBookings ?? "—"} />
          <AdminSummaryCard label="QA complete" value={summary?.completeCount ?? "—"} tone="success" />
          <AdminSummaryCard label="In progress" value={summary?.inProgressCount ?? "—"} tone="warning" />
          <AdminSummaryCard label="Not started" value={summary?.notStartedCount ?? "—"} />
          <AdminSummaryCard label="Issues" value={summary?.issueCount ?? "—"} tone="danger" />
          <AdminSummaryCard label="Mismatches" value={summary?.mismatchCount ?? "—"} tone="danger" />
        </div>

        <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => applyFilters({ search: event.target.value })}
              placeholder="Search booking, customer, phone, pet"
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#6d5bd0]/20 xl:col-span-2"
            />

            <select
              value={filters.teamId}
              onChange={(event) => applyFilters({ teamId: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All teams</option>
              <option value="unassigned">Unassigned</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.date}
              onChange={(event) => applyFilters({ date: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            />

            <select
              value={filters.qaStatus}
              onChange={(event) => applyFilters({ qaStatus: event.target.value as AdminQaStatus | "" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All QA states</option>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="complete">Complete</option>
              <option value="issue">Issue</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-5">
            <label className="inline-flex items-center gap-2 text-[13px] text-[#6b7280] cursor-pointer">
              <input
                type="checkbox"
                checked={filters.mismatchOnly}
                onChange={(event) => applyFilters({ mismatchOnly: event.target.checked })}
                className="w-4 h-4 accent-[#6d5bd0]"
              />
              Payment mismatch only
            </label>

            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setQuickTab("all");
              }}
              className="ml-auto h-[40px] rounded-[12px] border border-[#ece8f5] bg-[#faf9fc] px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f0ecfa] transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#ece5ff] bg-white shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          {isLoading ? (
            <div className="p-8 text-[14px] text-[#7c8499]">Loading QA board…</div>
          ) : error ? (
            <div className="p-8 text-[14px] text-[#b42318]">{error}</div>
          ) : visibleRows.length === 0 ? (
            <div className="p-10 text-center text-[14px] text-[#7c8499]">
              {filters.scope === "past"
                ? "No past bookings matched the current QA filters."
                : "No same-day bookings matched the current QA filters."}
            </div>
          ) : viewMode === "table" ? (
            <QaTable rows={visibleRows} onOpen={(bookingId) => void openDrawer(bookingId)} />
          ) : (
            <div className="space-y-6 p-5">
              {groupedRows.map((group) => (
                <div key={group.label} className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff]">
                  <div className="flex items-center justify-between border-b border-[#ece5ff] px-4 py-3">
                    <div>
                      <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">{group.label}</h2>
                      <p className="mt-0.5 text-[12px] text-[#7c8499]">
                        {group.rows.length} booking{group.rows.length !== 1 ? "s" : ""} in this QA queue
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="rounded-full bg-[#fff1f2] px-2.5 py-1 font-semibold text-[#be123c]">
                        {group.rows.filter((row) => row.qaStatus === "issue").length} issues
                      </span>
                      <span className="rounded-full bg-[#fff8eb] px-2.5 py-1 font-semibold text-[#b45309]">
                        {group.rows.filter((row) => row.qaStatus === "in_progress").length} in progress
                      </span>
                    </div>
                  </div>
                  <QaTable rows={group.rows} onOpen={(bookingId) => void openDrawer(bookingId)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminBookingDetailDrawer
        isOpen={drawerOpen}
        booking={
          drawerBooking
            ? {
                ...drawerBooking,
                availableActions: drawerBooking.availableActions.filter((action) => action === "mark_completed"),
              }
            : null
        }
        isLoading={drawerLoading}
        error={drawerError}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerBooking(null);
        }}
        onAction={(action) => void handleDrawerAction(action)}
        onRefreshBooking={refreshDrawerBooking}
        qaControls={
          drawerBooking
            ? {
                isBusy: qaActionBusy,
                onMarkQaComplete: () => void submitQaReview({ qaStatus: "complete" }),
                onFlagQaIssue: () => void submitQaReview({ qaStatus: "issue" }),
                onForceCompleteWithoutProof: () =>
                  void submitQaReview({
                    qaStatus: "complete",
                    completeBooking: true,
                    allowMissingRequiredSteps: true,
                  }),
              }
            : undefined
        }
      />
    </div>
  );
}
