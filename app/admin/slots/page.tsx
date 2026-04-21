"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryBar } from "../components/common/AdminSummaryBar";
import { AdminActionConfirmModal } from "../components/common/AdminActionConfirmModal";
import { AdminSlotRangeBlockModal } from "../components/common/AdminSlotRangeBlockModal";
import { useAdminToast } from "../components/common/AdminToastProvider";
import { AdminSlotsFiltersBar } from "../components/slots/AdminSlotsFiltersBar";
import { AdminSlotsTable } from "../components/slots/AdminSlotsTable";
import { AdminSlotsBoard } from "../components/slots/AdminSlotsBoard";
import { useAdminConfirmAction } from "../hooks/useAdminConfirmAction";
import {
  blockAdminSlotRange,
  blockAdminSlot,
  fetchAdminSlots,
  fetchAdminTeams,
  releaseAdminSlotHold,
  releaseAdminSlotHoldsBulk,
  unblockAdminSlot,
  type AdminSlotsResponse,
  type AdminTeamRow,
} from "../lib/api";

type SlotRow = AdminSlotsResponse["slots"][number];

const today = new Date().toISOString().slice(0, 10);

function slotTimeLabel(slot: SlotRow) {
  return `${slot.teamName} · ${new Date(slot.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${new Date(slot.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function AdminSlotsPage() {
  const { showToast } = useAdminToast();

  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [slotsData, setSlotsData] = useState<AdminSlotsResponse | null>(null);

  const [date, setDate] = useState(today);
  const [teamId, setTeamId] = useState("");
  const [includeBlocked, setIncludeBlocked] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rangeBlockOpen, setRangeBlockOpen] = useState(false);
  const [rangeBlockLoading, setRangeBlockLoading] = useState(false);

  const blockConfirm = useAdminConfirmAction<SlotRow>({
    title: "Block slot",
    getSubtitle: (slot) => slot ? slotTimeLabel(slot) : undefined,
    tone: "danger",
    getMessage: () => "Blocking this slot will prevent it from being used for booking.",
    reasonLabel: "Block reason",
    reasonPlaceholder: "Why is this slot being blocked?",
    requireReason: true,
    confirmLabel: "Confirm block",
  });

  const bulkBlockConfirm = useAdminConfirmAction<{ count: number }>({
    title: "Bulk block slots",
    getSubtitle: (p) => p ? `${p.count} slot(s) selected` : undefined,
    tone: "danger",
    getMessage: (p) => `This will block ${p?.count ?? 0} slot(s), preventing them from being booked.`,
    reasonLabel: "Block reason",
    reasonPlaceholder: "Why are these slots being blocked?",
    requireReason: true,
    confirmLabel: "Block all selected",
  });

  const releaseHoldConfirm = useAdminConfirmAction<SlotRow>({
    title: "Release slot hold",
    getSubtitle: (slot) => slot ? slotTimeLabel(slot) : undefined,
    tone: "warning",
    getMessage: () => "This will release the current hold and make the slot available again.",
    confirmLabel: "Release hold",
  });

  const bulkReleaseHoldConfirm = useAdminConfirmAction<{ count: number }>({
    title: "Release selected holds",
    getSubtitle: (payload) => payload ? `${payload.count} hold(s) selected` : undefined,
    tone: "warning",
    getMessage: (payload) => `This will release ${payload?.count ?? 0} selected hold(s) and return them to availability.`,
    confirmLabel: "Release holds",
  });

  const load = useCallback(async (refresh = false) => {
    try {
      setError("");
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      const [teamsRes, slotsRes] = await Promise.all([
        fetchAdminTeams(),
        fetchAdminSlots({ date, teamId: teamId || undefined, includeBlocked }),
      ]);
      setTeams(teamsRes.teams);
      setSlotsData(slotsRes);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slots.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [date, teamId, includeBlocked]);

  useEffect(() => { void load(); }, [load]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  };

  const submitBlock = async () => {
    const slot = blockConfirm.state.payload;
    const reason = blockConfirm.state.reason;
    if (!slot || !reason.trim()) return;
    try {
      blockConfirm.setSubmitting(true);
      await blockAdminSlot(slot.id, { reason: reason.trim() });
      showToast("Slot blocked.", true);
      blockConfirm.close();
      await load(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to block slot.", false);
    } finally {
      blockConfirm.setSubmitting(false);
    }
  };

  const handleUnblock = async (slot: SlotRow) => {
    try {
      await unblockAdminSlot(slot.id);
      showToast("Slot unblocked.", true);
      await load(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to unblock slot.", false);
    }
  };

  const submitReleaseHold = async () => {
    const slot = releaseHoldConfirm.state.payload;
    if (!slot) return;
    try {
      releaseHoldConfirm.setSubmitting(true);
      await releaseAdminSlotHold(slot.id);
      showToast("Hold released.", true);
      releaseHoldConfirm.close();
      await load(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to release hold.", false);
    } finally {
      releaseHoldConfirm.setSubmitting(false);
    }
  };

  const submitBulkBlock = async () => {
    const reason = bulkBlockConfirm.state.reason;
    if (!reason.trim()) return;
    const ids = Array.from(selectedIds);
    try {
      bulkBlockConfirm.setSubmitting(true);
      setBulkLoading(true);
      let successCount = 0;
      let failCount = 0;
      for (const id of ids) {
        try {
          await blockAdminSlot(id, { reason: reason.trim() });
          successCount++;
        } catch {
          failCount++;
        }
      }
      bulkBlockConfirm.close();
      showToast(
        failCount === 0
          ? `${successCount} slot(s) blocked.`
          : `${successCount} blocked, ${failCount} failed.`,
        failCount === 0
      );
      await load(true);
    } finally {
      bulkBlockConfirm.setSubmitting(false);
      setBulkLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        await unblockAdminSlot(id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    showToast(
      failCount === 0 ? `${successCount} slot(s) unblocked.` : `${successCount} unblocked, ${failCount} failed.`,
      failCount === 0
    );
    setBulkLoading(false);
    await load(true);
  };

  const handleBulkReleaseHold = async () => {
    const heldIds = selectedSlots.filter((slot) => slot.state === "held").map((slot) => slot.id);
    if (!heldIds.length) return;

    setBulkLoading(true);
    try {
      const result = await releaseAdminSlotHoldsBulk(heldIds);
      showToast(
        result.skippedCount === 0
          ? `${result.releasedCount} hold(s) released.`
          : `${result.releasedCount} released, ${result.skippedCount} skipped.`,
        result.skippedCount === 0
      );
      bulkReleaseHoldConfirm.close();
      await load(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to release selected holds.", false);
    } finally {
      setBulkLoading(false);
    }
  };

  const submitRangeBlock = async (payload: { startTime: string; endTime: string; reason: string }) => {
    if (!teamId) return;
    setRangeBlockLoading(true);
    try {
      const result = await blockAdminSlotRange({
        date,
        teamId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        reason: payload.reason,
      });
      const notes = [];
      if (result.skippedBookedCount) notes.push(`${result.skippedBookedCount} booked skipped`);
      if (result.skippedBlockedCount) notes.push(`${result.skippedBlockedCount} already blocked`);
      showToast(
        notes.length
          ? `${result.blockedCount} slot(s) blocked, ${notes.join(", ")}.`
          : `${result.blockedCount} slot(s) blocked.`,
        notes.length === 0
      );
      setRangeBlockOpen(false);
      await load(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to block slot range.", false);
    } finally {
      setRangeBlockLoading(false);
    }
  };

  const rows = slotsData?.slots ?? [];
  const selectedSlots = rows.filter((r) => selectedIds.has(r.id));
  const selectedBlockable = selectedSlots.filter((r) => r.state !== "blocked" && r.state !== "booked");
  const selectedUnblockable = selectedSlots.filter((r) => r.state === "blocked");
  const selectedHeld = selectedSlots.filter((r) => r.state === "held");
  const selectedTeamName = teams.find((team) => team.id === teamId)?.name;

  const slotActions = {
    onBlock: (slot: SlotRow) => blockConfirm.open(slot),
    onUnblock: handleUnblock,
    onReleaseHold: (slot: SlotRow) => releaseHoldConfirm.open(slot),
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Slots"
          subtitle="Inspect, block, unblock, and release operational slot states."
          onRefresh={() => void load(true)}
          isRefreshing={isRefreshing}
          rightSlot={
            teamId ? (
              <button
                type="button"
                onClick={() => setRangeBlockOpen(true)}
                className="inline-flex h-[42px] items-center rounded-[14px] border border-[#f3d6d6] bg-white px-4 text-[13px] font-semibold text-[#c24134] hover:bg-[#fff1f2] transition-colors"
              >
                Block time range
              </button>
            ) : null
          }
        />

        <div className="mb-4 flex items-center gap-2">
          {(["table", "board"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-[12px] px-4 py-2 text-[13px] font-semibold capitalize transition-colors ${
                viewMode === mode
                  ? "bg-[#6d5bd0] text-white"
                  : "border border-[#ddd1fb] bg-white text-[#6d5bd0] hover:bg-[#f6f4fd]"
              }`}
            >
              {mode} view
            </button>
          ))}
        </div>

        <AdminSummaryBar
          columnsClassName="sm:grid-cols-2 xl:grid-cols-5"
          items={[
            { label: "Total slots", value: slotsData?.summary.totalSlots ?? "—" },
            { label: "Free",        value: slotsData?.summary.freeCount ?? "—",    tone: "success" },
            { label: "Held",        value: slotsData?.summary.heldCount ?? "—",    tone: "warning" },
            { label: "Booked",      value: slotsData?.summary.bookedCount ?? "—" },
            { label: "Blocked",     value: slotsData?.summary.blockedCount ?? "—", tone: "danger" },
          ]}
        />

        <AdminSlotsFiltersBar
          date={date}
          teamId={teamId}
          includeBlocked={includeBlocked}
          teams={teams}
          onChange={(next) => {
            if (next.date !== undefined) setDate(next.date);
            if (next.teamId !== undefined) setTeamId(next.teamId);
            if (next.includeBlocked !== undefined) setIncludeBlocked(next.includeBlocked);
          }}
        />

        {/* Bulk action bar */}
        {selectedIds.size > 0 && viewMode === "table" && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[16px] border border-[#ddd1fb] bg-[#f6f4fd] px-4 py-3">
            <span className="text-[13px] font-semibold text-[#2a2346]">
              {selectedIds.size} slot{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              {selectedBlockable.length > 0 && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => bulkBlockConfirm.open({ count: selectedBlockable.length })}
                  className="rounded-[10px] border border-[#f3d6d6] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#c24134] hover:bg-[#fff1f2] disabled:opacity-50 transition-colors"
                >
                  Block {selectedBlockable.length} slot{selectedBlockable.length !== 1 ? "s" : ""}
                </button>
              )}
              {selectedUnblockable.length > 0 && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => void handleBulkUnblock()}
                  className="rounded-[10px] border border-[#ddd1fb] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] disabled:opacity-50 transition-colors"
                >
                  {bulkLoading ? "Working…" : `Unblock ${selectedUnblockable.length} slot${selectedUnblockable.length !== 1 ? "s" : ""}`}
                </button>
              )}
              {selectedHeld.length > 0 && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => bulkReleaseHoldConfirm.open({ count: selectedHeld.length })}
                  className="rounded-[10px] border border-[#f4e2b5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#b45309] hover:bg-[#fff8eb] disabled:opacity-50 transition-colors"
                >
                  Release {selectedHeld.length} hold{selectedHeld.length !== 1 ? "s" : ""}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-[10px] border border-[#ece8f5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6b7280] hover:bg-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {viewMode === "table" ? (
          <AdminSlotsTable
            rows={rows}
            isLoading={isLoading}
            error={error}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            {...slotActions}
          />
        ) : (
          <AdminSlotsBoard rows={rows} isLoading={isLoading} error={error} {...slotActions} />
        )}
      </div>

      <AdminActionConfirmModal
        {...blockConfirm.modalProps}
        onSubmit={() => void submitBlock()}
      />

      <AdminActionConfirmModal
        {...bulkBlockConfirm.modalProps}
        onSubmit={() => void submitBulkBlock()}
      />

      <AdminActionConfirmModal
        {...releaseHoldConfirm.modalProps}
        onSubmit={() => void submitReleaseHold()}
      />

      <AdminActionConfirmModal
        {...bulkReleaseHoldConfirm.modalProps}
        onSubmit={() => void handleBulkReleaseHold()}
      />

      <AdminSlotRangeBlockModal
        key={`${date}-${teamId}-${rangeBlockOpen ? "open" : "closed"}`}
        isOpen={rangeBlockOpen}
        date={date}
        teamName={selectedTeamName}
        isSubmitting={rangeBlockLoading}
        onClose={() => setRangeBlockOpen(false)}
        onSubmit={(payload) => void submitRangeBlock(payload)}
      />
    </div>
  );
}
