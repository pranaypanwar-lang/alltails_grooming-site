"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";
import {
  fetchAdminDispatch,
  fetchAdminBookingDetail,
  completeAdminBooking,
  cancelAdminBooking,
  cancelPaidAdminBooking,
  fetchDispatchAlertHistory,
  fetchDigestHistory,
  previewDigest,
  sendDigest,
  sendSameDayDispatchAlert,
  sendBulkDispatchAlerts,
  assignAdminBookingTeam,
  assignAdminBookingGroomer,
  fetchAdminTeams,
  logAdminRelayCall,
  rescheduleAdminBooking,
  retryAdminPaymentSupport,
  generateAdminPaymentLink,
  prepareAdminCustomerMessage,
  updateAdminDispatchState,
  updateAdminBookingMetadata,
  type AdminTeamRow,
  type DigestSendResult,
  type PaidCancelPayload,
} from "../lib/api";
import type {
  AdminBookingDetail,
  AdminDispatchAlertHistoryEntry,
  AdminDigestHistoryEntry,
  AdminDispatchCard,
  AdminDispatchActionId,
  AdminDispatchFilters,
  AdminDispatchGroup,
  AdminDispatchSummary,
} from "../types";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { AdminActionConfirmModal } from "../components/common/AdminActionConfirmModal";
import { AdminTeamAssignModal } from "../components/common/AdminTeamAssignModal";
import { AdminGroomerAssignModal } from "../components/common/AdminGroomerAssignModal";
import { AdminBookingRescheduleModal } from "../components/common/AdminBookingRescheduleModal";
import { AdminPaymentLinkModal } from "../components/common/AdminPaymentLinkModal";
import { AdminBookingMetadataModal } from "../components/common/AdminBookingMetadataModal";
import { AdminCustomerMessageModal } from "../components/common/AdminCustomerMessageModal";
import { AdminRelayCallModal } from "../components/common/AdminRelayCallModal";
import { AdminPaidCancelModal } from "../components/common/AdminPaidCancelModal";
import { AdminDispatchFiltersBar } from "../components/dispatch/AdminDispatchFiltersBar";
import { AdminDispatchBoard } from "../components/dispatch/AdminDispatchBoard";
import { AdminBookingDetailDrawer } from "../components/booking-detail/AdminBookingDetailDrawer";
import { useAdminToast } from "../components/common/AdminToastProvider";
import { useAdminConfirmAction } from "../hooks/useAdminConfirmAction";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() { return new Date(Date.now() + 86400000).toISOString().slice(0, 10); }

type DigestPreview = {
  teams: Array<{
    team: { id: string; name: string };
    bookingCount: number;
    messagePreview: string;
  }>;
};

const INITIAL_DISPATCH_FILTERS: AdminDispatchFilters = {
  viewMode: "today",
  date: todayStr(),
  city: "",
  statusScope: "confirmed",
  addressPendingOnly: false,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function ConfirmModal({
  title, description, confirmLabel, confirmCls, onConfirm, onClose, loading,
}: {
  title: string; description: string; confirmLabel: string; confirmCls: string;
  onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
        <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">{title}</h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className={`rounded-[12px] px-4 py-2 text-[13px] font-semibold disabled:opacity-50 ${confirmCls}`}>
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DigestModal({ date, onClose }: { date: string; onClose: () => void }) {
  const [data, setData] = useState<DigestPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<DigestSendResult | null>(null);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    previewDigest(date)
      .then(setData)
      .catch((error: unknown) => setError(getErrorMessage(error, "Failed to generate digest preview.")))
      .finally(() => setLoading(false));
  }, [date]);

  const handleSend = async () => {
    setSending(true);
    setSendError("");
    setSendResult(null);
    try {
      const result = await sendDigest(date);
      setSendResult(result);
    } catch (error: unknown) {
      setSendError(getErrorMessage(error, "Failed to send digest."));
    } finally {
      setSending(false);
    }
  };

  const hasBookings = data && data.teams.length > 0;

  return (
    <div className="fixed inset-0 z-[350] flex justify-end">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-[#ece5ff] bg-white shadow-2xl overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0ecfa] px-5 py-4">
          <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">
            Digest — {date}
          </h2>
          <div className="flex items-center gap-2">
            {hasBookings && !sendResult && (
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || loading}
                className="inline-flex items-center gap-1.5 h-8 rounded-[10px] bg-[#6d5bd0] px-3 text-[12px] font-semibold text-white disabled:opacity-50 hover:bg-[#5a4abf] transition-colors"
              >
                {sending ? "Sending…" : "Send to teams"}
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Send result banner */}
        {(sendResult || sendError) && (
          <div className={`shrink-0 border-b px-5 py-3 ${sendError ? "border-[#fecaca] bg-[#fff5f5]" : "border-[#bbf7d0] bg-[#f0fdf4]"}`}>
            {sendError && <p className="text-[13px] font-semibold text-[#b42318]">{sendError}</p>}
            {sendResult && (
              <div className="space-y-1">
                {sendResult.results.map((r) => (
                  <div key={r.teamId} className="flex items-center gap-2 text-[12px]">
                    <span className={`font-bold ${r.success ? "text-[#15803d]" : "text-[#b42318]"}`}>
                      {r.success ? "✓" : "✗"}
                    </span>
                    <span className="font-semibold text-[#1f2937]">{r.teamName}</span>
                    {!r.success && r.error && <span className="text-[#b42318]">— {r.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading && <p className="text-[13px] text-[#7c8499]">Generating…</p>}
          {error && <p className="text-[13px] text-[#b42318]">{error}</p>}
          {data && !loading && (
            data.teams.length === 0
              ? <p className="text-[13px] text-[#7c8499]">No confirmed bookings for {date}.</p>
              : data.teams.map((teamDigest) => (
                <div key={teamDigest.team.id}>
                  <div className="font-semibold text-[14px] text-[#2a2346] mb-2">
                    {teamDigest.team.name} · {teamDigest.bookingCount} booking(s)
                  </div>
                  <pre className="bg-[#faf9fd] border border-[#ece5ff] rounded-[14px] p-4 text-[12px] font-mono text-[#374151] whitespace-pre-wrap">
                    {teamDigest.messagePreview}
                  </pre>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function DigestHistoryModal({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<AdminDigestHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDigestHistory({ date, limit: 12 })
      .then((data) => setEntries(data.entries))
      .catch((fetchError: unknown) => setError(getErrorMessage(fetchError, "Failed to load digest history.")))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="fixed inset-0 z-[360] flex justify-end">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-[#ece5ff] bg-white shadow-2xl overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0ecfa] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Digest history</h2>
            <p className="mt-0.5 text-[12px] text-[#7c8499]">Daily digest sends logged for {date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <p className="text-[13px] text-[#7c8499]">Loading history…</p> : null}
          {error ? <p className="text-[13px] text-[#b42318]">{error}</p> : null}
          {!loading && !error && entries.length === 0 ? (
            <p className="text-[13px] text-[#7c8499]">No digest sends recorded for this date yet.</p>
          ) : null}
          {!loading && !error ? (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={`${entry.team.id}-${entry.sentAt}-${index}`}
                  className={`rounded-[18px] border px-4 py-3 ${
                    entry.success ? "border-[#d8f0df] bg-[#f7fff9]" : "border-[#f7d7d7] bg-[#fff8f8]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold text-[#1f1f2c]">{entry.team.name}</div>
                      <div className="mt-1 text-[12px] text-[#6b7280]">
                        {entry.bookingCount} booking(s) · {new Date(entry.sentAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        entry.success ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fff1f2] text-[#be123c]"
                      }`}
                    >
                      {entry.success ? "Sent" : "Failed"}
                    </span>
                  </div>
                  {entry.error ? (
                    <p className="mt-2 text-[12px] text-[#b42318]">{entry.error}</p>
                  ) : null}
                  {entry.telegramMessageId ? (
                    <p className="mt-2 break-all font-mono text-[11px] text-[#7c8499]">
                      Telegram message: {entry.telegramMessageId}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AlertHistoryModal({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<AdminDispatchAlertHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDispatchAlertHistory({ date, limit: 40 })
      .then((data) => setEntries(data.entries))
      .catch((fetchError: unknown) => setError(getErrorMessage(fetchError, "Failed to load alert history.")))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="fixed inset-0 z-[360] flex justify-end">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-[#ece5ff] bg-white shadow-2xl overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0ecfa] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Alert activity</h2>
            <p className="mt-0.5 text-[12px] text-[#7c8499]">Recent dispatch alerts for {date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <p className="text-[13px] text-[#7c8499]">Loading alert activity…</p> : null}
          {error ? <p className="text-[13px] text-[#b42318]">{error}</p> : null}
          {!loading && !error && entries.length === 0 ? (
            <p className="text-[13px] text-[#7c8499]">No alerts recorded for this date yet.</p>
          ) : null}
          {!loading && !error ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-[18px] border px-4 py-3 ${
                    entry.success ? "border-[#ece5ff] bg-[#faf9fd]" : "border-[#f7d7d7] bg-[#fff8f8]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold text-[#1f1f2c]">
                        {entry.alertType.replace(/_/g, " ")} · {entry.team.name}
                      </div>
                      <div className="mt-1 text-[12px] text-[#6b7280]">
                        {entry.booking.serviceName} · {entry.booking.customerName} · {entry.booking.id.slice(0, 8)}
                      </div>
                      <div className="mt-1 text-[11px] text-[#8a90a6]">
                        {new Date(entry.sentAt).toLocaleString("en-IN")}
                        {entry.booking.selectedDate ? ` · booking date ${entry.booking.selectedDate}` : ""}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        entry.success ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fff1f2] text-[#be123c]"
                      }`}
                    >
                      {entry.success ? "Sent" : "Failed"}
                    </span>
                  </div>
                  {entry.error ? (
                    <p className="mt-2 text-[12px] text-[#be123c]">{entry.error}</p>
                  ) : null}
                  {entry.telegramMessageId ? (
                    <p className="mt-2 break-all font-mono text-[11px] text-[#8a90a6]">
                      Telegram message: {entry.telegramMessageId}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminDispatchPage() {
  const [filters, setFilters] = useState<AdminDispatchFilters>(INITIAL_DISPATCH_FILTERS);

  const [summary, setSummary] = useState<AdminDispatchSummary | null>(null);
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [groups, setGroups] = useState<AdminDispatchGroup[]>([]);
  const [unassigned, setUnassigned] = useState<AdminDispatchCard[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBooking, setDrawerBooking] = useState<AdminBookingDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");

  const [modal, setModal] = useState<{ action: "mark_completed" | "cancel"; bookingId: string } | null>(null);
  const [assignState, setAssignState] = useState<{ bookingId: string; bookingLabel: string; selectedTeamId: string } | null>(null);
  const [groomerAssignState, setGroomerAssignState] = useState<{
    bookingId: string;
    bookingLabel: string;
    teamId: string;
    teamName: string;
    selectedMemberId: string;
  } | null>(null);
  const [rescheduleState, setRescheduleState] = useState<{ bookingId: string; bookingLabel: string; city: string; petCount: number; date: string } | null>(null);
  const [paymentLinkState, setPaymentLinkState] = useState<{ bookingId: string; paymentLinkUrl: string; expiresAt?: string | null } | null>(null);
  const [customerMessageState, setCustomerMessageState] = useState<{
    bookingId: string;
    bookingLabel: string;
    message: { content: string; actionUrl: string | null; status: string; preparedAt: string } | null;
  } | null>(null);
  const [metadataState, setMetadataState] = useState<{
    bookingId: string;
    bookingLabel: string;
    bookingSource: string;
    adminNote?: string | null;
    serviceAddress?: string | null;
    serviceLandmark?: string | null;
    servicePincode?: string | null;
    serviceLocationUrl?: string | null;
    pets: Array<{
      bookingPetId: string;
      name: string | null;
      breed: string;
      concernPhotoAssets: Array<{
        id: string;
        storageKey: string;
        publicUrl: string;
        originalName: string;
      }>;
      stylingReferenceAssets: Array<{
        id: string;
        storageKey: string;
        publicUrl: string;
        originalName: string;
      }>;
    }>;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [showDigestHistory, setShowDigestHistory] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [relayCallState, setRelayCallState] = useState<{ bookingId: string; bookingLabel: string; teamId?: string } | null>(null);
  const [relayCallLoading, setRelayCallLoading] = useState(false);
  const [paidCancelState, setPaidCancelState] = useState<{ bookingId: string; bookingLabel: string; finalAmount?: number } | null>(null);
  const [paidCancelLoading, setPaidCancelLoading] = useState(false);
  const { showToast: showToastMsg } = useAdminToast();

  const sameDayAlertConfirm = useAdminConfirmAction<{ bookingId: string; alertType: string }>({
    title: "Send dispatch alert",
    getSubtitle: (p) => p ? `Booking ${p.bookingId.slice(0, 8)}` : undefined,
    tone: "warning",
    getMessage: (p) =>
      p?.alertType === "same_day_new_booking"
        ? "This will immediately notify the assigned team on Telegram about this same-day job."
        : "This will immediately notify the assigned team on Telegram about this booking.",
    confirmLabel: "Send alert",
  });

  const bulkDispatchAlertConfirm = useAdminConfirmAction<{ bookingIds: string[] }>({
    title: "Send selected dispatch alerts",
    getSubtitle: (payload) =>
      payload ? `${payload.bookingIds.length} booking${payload.bookingIds.length === 1 ? "" : "s"} selected` : undefined,
    tone: "warning",
    getMessage: (payload) =>
      payload
        ? `This will immediately notify the corresponding Telegram team chats for ${payload.bookingIds.length} selected booking${payload.bookingIds.length === 1 ? "" : "s"}.`
        : undefined,
    confirmLabel: "Send selected",
  });

  const load = useCallback(async (f: AdminDispatchFilters, silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const [data, teamsData] = await Promise.all([
        fetchAdminDispatch(f),
        fetchAdminTeams(),
      ]);
      setSummary(data.summary);
      setGroups(data.groups);
      setUnassigned(data.unassigned);
      setTeams(teamsData.teams);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to load dispatch board."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(INITIAL_DISPATCH_FILTERS);
  }, [load]);

  const sendableBookingIds = useMemo(
    () =>
      [...unassigned, ...groups.flatMap((group) => group.bookings)]
        .filter((card) => card.availableActions.includes("send_same_day_alert"))
        .map((card) => card.bookingId),
    [groups, unassigned]
  );

  useEffect(() => {
    setSelectedBookingIds((prev) => prev.filter((bookingId) => sendableBookingIds.includes(bookingId)));
  }, [sendableBookingIds]);

  const applyFilters = useCallback((patch: Partial<AdminDispatchFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      // Sync date when viewMode changes
      if (patch.viewMode === "today") next.date = todayStr();
      else if (patch.viewMode === "tomorrow") next.date = tomorrowStr();
      load(next);
      return next;
    });
  }, [load]);

  const openDrawer = useCallback(async (bookingId: string) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError("");
    setDrawerBooking(null);
    try {
      const data = await fetchAdminBookingDetail(bookingId);
      setDrawerBooking(data.booking);
    } catch (error: unknown) {
      setDrawerError(getErrorMessage(error, "Failed to load booking details."));
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

  const handleCardAction = useCallback(async (card: AdminDispatchCard, action: AdminDispatchActionId) => {
    if (action === "open_details") { openDrawer(card.bookingId); return; }
    if (action === "mark_completed" || action === "cancel") {
      setModal({ action, bookingId: card.bookingId });
      return;
    }
    if (action === "assign_team" || action === "reassign_team") {
      setAssignState({
        bookingId: card.bookingId,
        bookingLabel: `${card.serviceName} · ${card.customer.name}`,
        selectedTeamId: "",
      });
      return;
    }
    if (action === "assign_groomer" || action === "reassign_groomer") {
      const teamGroup = groups.find((group) => group.bookings.some((booking) => booking.bookingId === card.bookingId));
      const team = teamGroup?.team;
      if (!team) {
        showToastMsg("Assign a team before assigning a groomer.", false);
        return;
      }
      setGroomerAssignState({
        bookingId: card.bookingId,
        bookingLabel: `${card.serviceName} · ${card.customer.name}`,
        teamId: team.id,
        teamName: team.name,
        selectedMemberId: card.groomerMember?.id ?? "",
      });
      return;
    }
    if (action === "reschedule") {
      setRescheduleState({
        bookingId: card.bookingId,
        bookingLabel: `${card.serviceName} · ${card.customer.name}`,
        city: card.city ?? "",
        petCount: card.pets.count,
        date: filters.date,
      });
      return;
    }
    if (action === "relay_call") {
      setRelayCallState({
        bookingId: card.bookingId,
        bookingLabel: `${card.serviceName} · ${card.customer.name}`,
      });
      return;
    }
    if (action === "mark_en_route" || action === "mark_started") {
      const nextDispatchState = action === "mark_en_route" ? "en_route" : "started";
      try {
        await updateAdminDispatchState(card.bookingId, nextDispatchState);
        showToastMsg(`Dispatch moved to ${nextDispatchState.replace(/_/g, " ")}.`, true);
        await load(filters, true);
      } catch (error: unknown) {
        showToastMsg(error instanceof Error ? error.message : "Failed to update dispatch state.", false);
      }
      return;
    }
    if (action === "send_same_day_alert") {
      sameDayAlertConfirm.open({
        bookingId: card.bookingId,
        alertType: card.urgency.sameDay ? "same_day_new_booking" : "manual_dispatch",
      });
    }
  }, [filters, groups, load, openDrawer, showToastMsg, sameDayAlertConfirm]);

  const handleDrawerAction = useCallback((action: string) => {
    if (!drawerBooking) return;
    if (action === "mark_completed" || action === "cancel") {
      setModal({ action: action as "mark_completed" | "cancel", bookingId: drawerBooking.id });
      return;
    }
    if (action === "assign_team" || action === "reassign_team") {
      setAssignState({
        bookingId: drawerBooking.id,
        bookingLabel: `${drawerBooking.service.name} · ${drawerBooking.customer.name}`,
        selectedTeamId: drawerBooking.bookingWindow?.team?.id ?? "",
      });
      return;
    }
    if (action === "assign_groomer" || action === "reassign_groomer") {
      const team = drawerBooking.bookingWindow?.team;
      if (!team) {
        showToastMsg("Assign a team before assigning a groomer.", false);
        return;
      }
      setGroomerAssignState({
        bookingId: drawerBooking.id,
        bookingLabel: `${drawerBooking.service.name} · ${drawerBooking.customer.name}`,
        teamId: team.id,
        teamName: team.name,
        selectedMemberId: drawerBooking.groomerMember?.id ?? "",
      });
      return;
    }
    if (action === "reschedule") {
      setRescheduleState({
        bookingId: drawerBooking.id,
        bookingLabel: `${drawerBooking.service.name} · ${drawerBooking.customer.name}`,
        city: drawerBooking.customer.city ?? "",
        petCount: drawerBooking.pets.length,
        date: drawerBooking.selectedDate ?? filters.date,
      });
      return;
    }
    if (action === "relay_call") {
      setRelayCallState({
        bookingId: drawerBooking.id,
        bookingLabel: `${drawerBooking.service.name} · ${drawerBooking.customer.name}`,
        teamId: drawerBooking.bookingWindow?.team?.id,
      });
      return;
    }
    if (action === "send_same_day_alert") {
      sameDayAlertConfirm.open({
        bookingId: drawerBooking.id,
        alertType:
          drawerBooking.selectedDate === filters.date && filters.viewMode === "today"
            ? "same_day_new_booking"
            : "manual_dispatch",
      });
      return;
    }
    if (action === "retry_payment_support") {
      void retryAdminPaymentSupport(drawerBooking.id)
        .then((result) => showToastMsg(`Created support retry order ${result.orderId.slice(-8)}.`, true))
        .catch((error: unknown) => showToastMsg(getErrorMessage(error, "Failed to create retry order."), false));
      return;
    }
    if (action === "send_payment_link") {
      void generateAdminPaymentLink(drawerBooking.id)
        .then((result) =>
          setPaymentLinkState({
            bookingId: drawerBooking.id,
            paymentLinkUrl: result.paymentLinkUrl,
            expiresAt: result.expiresAt,
          })
        )
        .catch((error: unknown) =>
          showToastMsg(error instanceof Error ? error.message : "Failed to generate payment link.", false)
        );
      return;
    }
    if (action === "send_customer_message") {
      setCustomerMessageState({
        bookingId: drawerBooking.id,
        bookingLabel: `${drawerBooking.service.name} · ${drawerBooking.customer.name}`,
        message: null,
      });
      return;
    }
    if (action === "edit_metadata") {
      setMetadataState({
        bookingId: drawerBooking.id,
        bookingLabel: `${drawerBooking.service.name} · ${drawerBooking.customer.name}`,
        bookingSource: drawerBooking.bookingSource,
        adminNote: drawerBooking.adminNote ?? "",
        serviceAddress: drawerBooking.addressInfo.serviceAddress ?? "",
        serviceLandmark: drawerBooking.addressInfo.serviceLandmark ?? "",
        servicePincode: drawerBooking.addressInfo.servicePincode ?? "",
        serviceLocationUrl: drawerBooking.addressInfo.serviceLocationUrl ?? "",
        pets: drawerBooking.pets.map((pet) => ({
          bookingPetId: pet.bookingPetId,
          name: pet.name,
          breed: pet.breed,
          concernPhotoAssets: pet.concernPhotoAssets,
          stylingReferenceAssets: pet.stylingReferenceAssets,
        })),
      });
      return;
    }
    if (action === "mark_en_route" || action === "mark_started" || action === "mark_issue") {
      const nextDispatchState =
        action === "mark_en_route" ? "en_route" : action === "mark_started" ? "started" : "issue";
      void updateAdminDispatchState(drawerBooking.id, nextDispatchState)
        .then(() => {
          showToastMsg(`Dispatch moved to ${nextDispatchState.replace(/_/g, " ")}.`, true);
          void load(filters, true);
          void openDrawer(drawerBooking.id);
        })
        .catch((error: unknown) =>
          showToastMsg(error instanceof Error ? error.message : "Failed to update dispatch state.", false)
        );
    }
  }, [drawerBooking, filters, load, openDrawer, showToastMsg]);

  const submitRelayCall = async (payload: { outcome: string }) => {
    if (!relayCallState) return;
    setRelayCallLoading(true);
    try {
      await logAdminRelayCall(relayCallState.bookingId, { teamId: relayCallState.teamId, outcome: payload.outcome });
      showToastMsg("Relay call logged.", true);
      setRelayCallState(null);
      await load(filters, true);
      if (drawerOpen && drawerBooking?.id === relayCallState.bookingId) {
        await openDrawer(relayCallState.bookingId);
      }
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to log relay call."), false);
    } finally {
      setRelayCallLoading(false);
    }
  };

  const submitSameDayAlert = async () => {
    const bookingId = sameDayAlertConfirm.state.payload?.bookingId;
    const alertType = sameDayAlertConfirm.state.payload?.alertType ?? "manual_dispatch";
    if (!bookingId) return;
    try {
      sameDayAlertConfirm.setSubmitting(true);
      await sendSameDayDispatchAlert({ bookingId, alertType });
      showToastMsg("Dispatch alert sent.", true);
      sameDayAlertConfirm.close();
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to send alert."), false);
    } finally {
      sameDayAlertConfirm.setSubmitting(false);
    }
  };

  const toggleSelectedBooking = useCallback((card: AdminDispatchCard) => {
    if (!card.availableActions.includes("send_same_day_alert")) return;
    setSelectedBookingIds((prev) =>
      prev.includes(card.bookingId)
        ? prev.filter((bookingId) => bookingId !== card.bookingId)
        : [...prev, card.bookingId]
    );
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedBookingIds((prev) =>
      prev.length === sendableBookingIds.length ? [] : sendableBookingIds
    );
  }, [sendableBookingIds]);

  const submitBulkDispatchAlerts = async () => {
    const bookingIds = bulkDispatchAlertConfirm.state.payload?.bookingIds ?? [];
    if (!bookingIds.length) return;

    try {
      bulkDispatchAlertConfirm.setSubmitting(true);
      const result = await sendBulkDispatchAlerts({
        bookingIds,
        alertType: "manual_dispatch",
      });

      if (result.failureCount > 0) {
        const failedLabels = result.results
          .filter((entry) => !entry.success)
          .slice(0, 2)
          .map((entry) => `${entry.bookingId.slice(0, 8)}${entry.error ? `: ${entry.error}` : ""}`)
          .join(" · ");
        showToastMsg(
          `${result.successCount}/${result.totalCount} alerts sent.${failedLabels ? ` Failed: ${failedLabels}` : ""}`,
          false
        );
      } else {
        showToastMsg(`${result.successCount} dispatch alerts sent.`, true);
      }

      setSelectedBookingIds([]);
      bulkDispatchAlertConfirm.close();
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to send selected alerts."), false);
    } finally {
      bulkDispatchAlertConfirm.setSubmitting(false);
    }
  };

  const confirmAction = useCallback(async () => {
    if (!modal) return;
    setActionLoading(true);
    try {
      if (modal.action === "mark_completed") {
        const r = await completeAdminBooking(modal.bookingId);
        showToastMsg(`Completed.${r.loyalty.freeUnlockedAfter ? " Loyalty reward unlocked!" : ""}`, true);
        setModal(null);
        setDrawerOpen(false);
        await load(filters, true);
      } else {
        try {
          const r = await cancelAdminBooking(modal.bookingId);
          showToastMsg(`Cancelled.${r.loyaltyRewardRestored ? " Loyalty reward restored." : ""}`, true);
          setModal(null);
          setDrawerOpen(false);
          await load(filters, true);
        } catch (error: unknown) {
          const message = getErrorMessage(error, "Failed to cancel booking.");
          if (message.includes("Paid bookings")) {
            setModal(null);
            const booking = drawerBooking?.id === modal.bookingId ? drawerBooking : null;
            setPaidCancelState({
              bookingId: modal.bookingId,
              bookingLabel: booking ? `${booking.service.name} · ${booking.customer.name}` : modal.bookingId.slice(0, 8),
              finalAmount: booking?.financials.finalAmount,
            });
          } else {
            showToastMsg(message, false);
          }
        }
      }
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to complete admin action."), false);
    } finally {
      setActionLoading(false);
    }
  }, [modal, filters, load, showToastMsg, drawerBooking]);

  const submitPaidCancel = async (payload: PaidCancelPayload) => {
    if (!paidCancelState) return;
    setPaidCancelLoading(true);
    try {
      await cancelPaidAdminBooking(paidCancelState.bookingId, payload);
      showToastMsg("Paid booking cancelled.", true);
      setPaidCancelState(null);
      setDrawerOpen(false);
      await load(filters, true);
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to cancel paid booking."), false);
    } finally {
      setPaidCancelLoading(false);
    }
  };

  const submitAssignTeam = async () => {
    if (!assignState?.selectedTeamId) return;
    try {
      setActionLoading(true);
      await assignAdminBookingTeam(assignState.bookingId, assignState.selectedTeamId);
      showToastMsg("Team assignment updated.", true);
      setAssignState(null);
      await load(filters, true);
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to assign team."), false);
    } finally {
      setActionLoading(false);
    }
  };

  const submitAssignGroomer = async () => {
    if (!groomerAssignState?.selectedMemberId) return;
    try {
      setActionLoading(true);
      await assignAdminBookingGroomer(groomerAssignState.bookingId, groomerAssignState.selectedMemberId);
      showToastMsg("Groomer assignment updated.", true);
      const bookingId = groomerAssignState.bookingId;
      setGroomerAssignState(null);
      await load(filters, true);
      if (drawerOpen && drawerBooking?.id === bookingId) {
        await openDrawer(bookingId);
      }
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to assign groomer."), false);
    } finally {
      setActionLoading(false);
    }
  };

  const submitReschedule = async (slotIds: string[]) => {
    if (!rescheduleState) return;
    setActionLoading(true);
    try {
      await rescheduleAdminBooking(rescheduleState.bookingId, slotIds);
      showToastMsg("Booking rescheduled.", true);
      setRescheduleState(null);
      setDrawerOpen(false);
      await load(filters, true);
    } finally {
      setActionLoading(false);
    }
  };

  const submitMetadata = async (payload: {
    bookingSource: string;
    adminNote: string;
    serviceAddress: string;
    serviceLandmark: string;
    servicePincode: string;
    serviceLocationUrl: string;
    pets: Array<{
      bookingPetId: string;
      concernAssets: Array<{
        storageKey: string;
        publicUrl: string;
        originalName: string;
      }>;
      stylingAssets: Array<{
        storageKey: string;
        publicUrl: string;
        originalName: string;
      }>;
    }>;
  }) => {
    if (!metadataState) return;
    setActionLoading(true);
    try {
      await updateAdminBookingMetadata(metadataState.bookingId, payload);
      showToastMsg("Booking metadata updated.", true);
      setMetadataState(null);
      await load(filters, true);
      await openDrawer(metadataState.bookingId);
    } catch (error: unknown) {
      showToastMsg(error instanceof Error ? error.message : "Failed to update booking metadata.", false);
    } finally {
      setActionLoading(false);
    }
  };

  const submitCustomerMessage = async (payload: {
    messageType:
      | "booking_confirmation"
      | "team_on_the_way"
      | "night_before_reminder"
      | "post_groom_care"
      | "review_request";
  }) => {
    if (!customerMessageState) return;
    setActionLoading(true);
    try {
      const result = await prepareAdminCustomerMessage(customerMessageState.bookingId, payload);
      setCustomerMessageState((prev) =>
        prev
          ? {
              ...prev,
              message: {
                content: result.message.content,
                actionUrl: result.message.actionUrl,
                status: result.message.status,
                preparedAt: result.message.preparedAt,
              },
            }
          : prev
      );
      showToastMsg("Customer message prepared.", true);
      if (drawerBooking?.id === customerMessageState.bookingId) {
        await openDrawer(customerMessageState.bookingId);
      }
    } catch (error: unknown) {
      showToastMsg(getErrorMessage(error, "Failed to prepare customer message."), false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Dispatch"
          subtitle="Live scheduling board for today and tomorrow."
          onRefresh={() => load(filters, true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDigest(true)}
                className="inline-flex items-center gap-1.5 h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Digest preview
              </button>
              <button
                type="button"
                onClick={() => setShowDigestHistory(true)}
                className="inline-flex items-center h-[42px] rounded-[14px] border border-[#ece8f5] bg-white px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
              >
                Digest history
              </button>
              <button
                type="button"
                onClick={() => setShowAlertHistory(true)}
                className="inline-flex items-center h-[42px] rounded-[14px] border border-[#ece8f5] bg-white px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
              >
                Alert log
              </button>
              <Link
                href="/admin/bookings"
                className="inline-flex items-center h-[42px] rounded-[14px] border border-[#ece8f5] bg-white px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
              >
                Bookings
              </Link>
            </div>
          }
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-10">
          <AdminSummaryCard label="Total"       value={summary?.totalBookings ?? "—"}          />
          <AdminSummaryCard label="Unassigned"  value={summary?.unassignedCount ?? "—"}   tone="warning" />
          <AdminSummaryCard label="Assigned"    value={summary?.assignedCount ?? "—"}     tone="success" />
          <AdminSummaryCard label="Completed"   value={summary?.completedCount ?? "—"}         />
          <AdminSummaryCard label="Issues"      value={summary?.issueCount ?? "—"}        tone="danger"  />
          <AdminSummaryCard label="Delay risk"  value={summary?.delayRiskCount ?? "—"}    tone="danger"  />
          <AdminSummaryCard label="Pending pay" value={summary?.pendingPaymentCount ?? "—"} tone="warning" />
          <AdminSummaryCard label="Expired pay" value={summary?.expiredPaymentCount ?? "—"} tone="danger" />
          <AdminSummaryCard label="Address pending" value={summary?.addressPendingCount ?? "—"} tone="warning" />
          <AdminSummaryCard label="Late fills"  value={summary?.sameDayLateFillCount ?? "—"}   />
        </div>

        <AdminDispatchFiltersBar filters={filters} onChange={applyFilters} />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#ece5ff] bg-white px-4 py-3">
          <div>
            <div className="text-[13px] font-semibold text-[#2a2346]">
              {selectedBookingIds.length} selected · {sendableBookingIds.length} sendable visible
            </div>
            <div className="mt-0.5 text-[12px] text-[#7c8499]">
              Select one or more confirmed bookings and send each one to its corresponding Telegram team.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              className="inline-flex items-center h-[38px] rounded-[12px] border border-[#ece8f5] bg-white px-4 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
            >
              {selectedBookingIds.length === sendableBookingIds.length && sendableBookingIds.length > 0
                ? "Clear visible"
                : "Select all visible"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedBookingIds([])}
              disabled={selectedBookingIds.length === 0}
              className="inline-flex items-center h-[38px] rounded-[12px] border border-[#ece8f5] bg-white px-4 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors disabled:opacity-50"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => bulkDispatchAlertConfirm.open({ bookingIds: selectedBookingIds })}
              disabled={selectedBookingIds.length === 0}
              className="inline-flex items-center h-[38px] rounded-[12px] bg-[#6d5bd0] px-4 text-[12px] font-semibold text-white hover:bg-[#5a4abf] transition-colors disabled:opacity-50"
            >
              Send selected alerts
            </button>
          </div>
        </div>

        <AdminDispatchBoard
          groups={groups}
          unassigned={unassigned}
          selectedBookingIds={selectedBookingIds}
          isLoading={isLoading}
          error={error}
          onToggleSelection={toggleSelectedBooking}
          onCardClick={(card) => openDrawer(card.bookingId)}
          onActionClick={handleCardAction}
        />
      </div>

      <AdminBookingDetailDrawer
        isOpen={drawerOpen}
        booking={drawerBooking}
        isLoading={drawerLoading}
        error={drawerError}
        onClose={() => { setDrawerOpen(false); setDrawerBooking(null); }}
        onAction={handleDrawerAction}
        onRefreshBooking={refreshDrawerBooking}
      />

      {modal && (
        <ConfirmModal
          title={modal.action === "mark_completed" ? "Mark as completed?" : "Cancel this booking?"}
          description={
            modal.action === "mark_completed"
              ? "This will mark the session as completed and update the customer's loyalty count."
              : "This will release the slots. Loyalty rewards will be restored if applicable."
          }
          confirmLabel={modal.action === "mark_completed" ? "Mark completed" : "Yes, cancel"}
          confirmCls={modal.action === "mark_completed" ? "bg-[#6d5bd0] text-white" : "bg-[#c24134] text-white"}
          onConfirm={confirmAction}
          onClose={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      {showDigest && (
        <DigestModal date={filters.date} onClose={() => setShowDigest(false)} />
      )}

      {showDigestHistory && (
        <DigestHistoryModal date={filters.date} onClose={() => setShowDigestHistory(false)} />
      )}

      {showAlertHistory && (
        <AlertHistoryModal date={filters.date} onClose={() => setShowAlertHistory(false)} />
      )}

      <AdminPaidCancelModal
        isOpen={!!paidCancelState}
        bookingLabel={paidCancelState?.bookingLabel}
        finalAmount={paidCancelState?.finalAmount}
        isSubmitting={paidCancelLoading}
        onClose={() => setPaidCancelState(null)}
        onSubmit={(p) => void submitPaidCancel(p)}
      />

      <AdminRelayCallModal
        isOpen={!!relayCallState}
        bookingLabel={relayCallState?.bookingLabel}
        isSubmitting={relayCallLoading}
        onClose={() => setRelayCallState(null)}
        onSubmit={(p) => void submitRelayCall(p)}
      />

      <AdminActionConfirmModal
        {...sameDayAlertConfirm.modalProps}
        onSubmit={() => void submitSameDayAlert()}
      />

      <AdminActionConfirmModal
        {...bulkDispatchAlertConfirm.modalProps}
        onSubmit={() => void submitBulkDispatchAlerts()}
      />

      <AdminTeamAssignModal
        isOpen={!!assignState}
        bookingLabel={assignState?.bookingLabel}
        teams={teams}
        selectedTeamId={assignState?.selectedTeamId ?? ""}
        isSubmitting={actionLoading}
        onClose={() => setAssignState(null)}
        onSelect={(teamId) => setAssignState((prev) => (prev ? { ...prev, selectedTeamId: teamId } : prev))}
        onSubmit={() => void submitAssignTeam()}
      />

      <AdminGroomerAssignModal
        isOpen={!!groomerAssignState}
        bookingLabel={groomerAssignState?.bookingLabel}
        teamName={groomerAssignState?.teamName}
        members={teams.find((team) => team.id === groomerAssignState?.teamId)?.members ?? []}
        selectedMemberId={groomerAssignState?.selectedMemberId ?? ""}
        isSubmitting={actionLoading}
        onClose={() => setGroomerAssignState(null)}
        onSelect={(memberId) =>
          setGroomerAssignState((prev) => (prev ? { ...prev, selectedMemberId: memberId } : prev))
        }
        onSubmit={() => void submitAssignGroomer()}
      />

      {rescheduleState ? (
        <AdminBookingRescheduleModal
          isOpen
          bookingLabel={rescheduleState.bookingLabel}
          initialDate={rescheduleState.date}
          city={rescheduleState.city}
          petCount={rescheduleState.petCount}
          isSubmitting={actionLoading}
          onClose={() => setRescheduleState(null)}
          onSubmit={submitReschedule}
        />
      ) : null}

      <AdminPaymentLinkModal
        isOpen={!!paymentLinkState}
        bookingId={paymentLinkState?.bookingId ?? null}
        paymentLinkUrl={paymentLinkState?.paymentLinkUrl ?? ""}
        expiresAt={paymentLinkState?.expiresAt}
        onClose={() => setPaymentLinkState(null)}
      />

      <AdminBookingMetadataModal
        key={metadataState?.bookingId ?? "dispatch-booking-metadata"}
        isOpen={!!metadataState}
        bookingLabel={metadataState?.bookingLabel}
        initialSource={metadataState?.bookingSource ?? "website"}
        initialNote={metadataState?.adminNote ?? ""}
        initialServiceAddress={metadataState?.serviceAddress ?? ""}
        initialServiceLandmark={metadataState?.serviceLandmark ?? ""}
        initialServicePincode={metadataState?.servicePincode ?? ""}
        initialServiceLocationUrl={metadataState?.serviceLocationUrl ?? ""}
        initialPets={metadataState?.pets ?? []}
        isSubmitting={actionLoading}
        onClose={() => setMetadataState(null)}
        onSubmit={(payload) => void submitMetadata(payload)}
      />

      <AdminCustomerMessageModal
        isOpen={!!customerMessageState}
        bookingLabel={customerMessageState?.bookingLabel}
        message={customerMessageState?.message ?? null}
        isSubmitting={actionLoading}
        onClose={() => setCustomerMessageState(null)}
        onSubmit={(payload) => void submitCustomerMessage(payload)}
      />
    </div>
  );
}
