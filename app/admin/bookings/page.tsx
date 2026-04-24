"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  fetchAdminBookings,
  fetchAdminBookingDetail,
  completeAdminBooking,
  cancelAdminBooking,
  sendSameDayDispatchAlert,
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
} from "../lib/api";
import type {
  AdminBookingActionId,
  AdminBookingDetail,
  AdminBookingListItem,
  AdminBookingsFilters,
  AdminBookingsSummary,
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
import { AdminBookingsFiltersBar } from "../components/bookings/AdminBookingsFiltersBar";
import { AdminBookingsTable } from "../components/bookings/AdminBookingsTable";
import { AdminBookingDetailDrawer } from "../components/booking-detail/AdminBookingDetailDrawer";
import { useAdminToast } from "../components/common/AdminToastProvider";
import { useAdminConfirmAction } from "../hooks/useAdminConfirmAction";

const DEFAULT_FILTERS: AdminBookingsFilters = {
  tab: "active",
  date: "",
  dateFrom: "",
  dateTo: "",
  city: "",
  teamId: "",
  bookingStatus: "",
  paymentStatus: "",
  loyaltyState: "",
  serviceName: "",
  sameDayOnly: false,
  needsAssignment: false,
  paymentExpiringSoon: false,
  tomorrowOnly: false,
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmCls,
  onConfirm,
  onClose,
  loading,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmCls: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
        <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">{title}</h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-[12px] px-4 py-2 text-[13px] font-semibold disabled:opacity-50 transition-colors ${confirmCls}`}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminBookingsPage() {
  const [filters, setFilters] = useState<AdminBookingsFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState<AdminBookingListItem[]>([]);
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [summary, setSummary] = useState<AdminBookingsSummary | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
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
  const [rescheduleState, setRescheduleState] = useState<{ bookingId: string; bookingLabel: string; city: string; petCount: number; date: string | null } | null>(null);
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
  const { showToast } = useAdminToast();

  const sameDayAlertConfirm = useAdminConfirmAction<{ bookingId: string }>({
    title: "Send same-day alert",
    getSubtitle: (p) => p ? `Booking ${p.bookingId.slice(0, 8)}` : undefined,
    tone: "warning",
    getMessage: () => "This will immediately notify the assigned team on Telegram about this same-day booking.",
    confirmLabel: "Send alert",
  });

  const load = useCallback(async (f: AdminBookingsFilters, p: number, silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const [data, teamsData] = await Promise.all([
        fetchAdminBookings({ filters: f, page: p, pageSize: 25 }),
        fetchAdminTeams(),
      ]);
      setBookings(data.bookings);
      setSummary(data.summary);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setTeams(teamsData.teams);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to load"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(filters, page);
  }, [filters, load, page]);

  const applyFilters = useCallback((patch: Partial<AdminBookingsFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      load(next, 1);
      return next;
    });
    setPage(1);
  }, [load]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    load(filters, p);
  }, [filters, load]);

  const openDrawer = useCallback(async (bookingId: string) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError("");
    setDrawerBooking(null);
    try {
      const data = await fetchAdminBookingDetail(bookingId);
      setDrawerBooking(data.booking);
    } catch (error: unknown) {
      setDrawerError(getErrorMessage(error, "Failed to load booking details"));
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const refreshDrawerBooking = useCallback(async () => {
    if (!drawerBooking) return;
    await Promise.all([
      load(filters, page, true),
      openDrawer(drawerBooking.id),
    ]);
  }, [drawerBooking, filters, load, openDrawer, page]);

  const handleTableAction = useCallback(async (row: AdminBookingListItem, action: AdminBookingActionId) => {
    if (action === "view_details") { openDrawer(row.id); return; }
    if (action === "mark_completed" || action === "cancel") {
      setModal({ action, bookingId: row.id });
      return;
    }
    if (action === "assign_team" || action === "reassign_team") {
      setAssignState({
        bookingId: row.id,
        bookingLabel: `${row.service.name} · ${row.customer.name}`,
        selectedTeamId: row.team?.id ?? "",
      });
      return;
    }
    if (action === "assign_groomer" || action === "reassign_groomer") {
      if (!row.team?.id) {
        showToast("Assign a team before assigning a groomer.", false);
        return;
      }
      setGroomerAssignState({
        bookingId: row.id,
        bookingLabel: `${row.service.name} · ${row.customer.name}`,
        teamId: row.team.id,
        teamName: row.team.name,
        selectedMemberId: row.groomerMember?.id ?? "",
      });
      return;
    }
    if (action === "reschedule") {
      setRescheduleState({
        bookingId: row.id,
        bookingLabel: `${row.service.name} · ${row.customer.name}`,
        city: row.city ?? "",
        petCount: row.pets.count,
        date: row.selectedDate,
      });
      return;
    }
    if (action === "relay_call") {
      try {
        await logAdminRelayCall(row.id, { teamId: row.team?.id });
        showToast("Relay call logged.", true);
      } catch (error: unknown) {
        showToast(getErrorMessage(error, "Failed to log relay call."), false);
      }
      return;
    }
    if (action === "retry_payment_support") {
      try {
        const result = await retryAdminPaymentSupport(row.id);
        showToast(`Created support retry order ${result.orderId.slice(-8)}.`, true);
      } catch (error: unknown) {
        showToast(getErrorMessage(error, "Failed to create retry order."), false);
      }
      return;
    }
    if (action === "send_payment_link") {
      try {
        const result = await generateAdminPaymentLink(row.id);
        setPaymentLinkState({
          bookingId: row.id,
          paymentLinkUrl: result.paymentLinkUrl,
          expiresAt: result.expiresAt,
        });
      } catch (error: unknown) {
        showToast(error instanceof Error ? error.message : "Failed to generate payment link.", false);
      }
      return;
    }
    if (action === "send_customer_message") {
      setCustomerMessageState({
        bookingId: row.id,
        bookingLabel: `${row.service.name} · ${row.customer.name}`,
        message: null,
      });
      return;
    }
    if (action === "send_same_day_alert") {
      sameDayAlertConfirm.open({ bookingId: row.id });
    }
  }, [openDrawer, showToast, sameDayAlertConfirm]);

  const handleDrawerAction = useCallback((action: AdminBookingActionId) => {
    if (!drawerBooking) return;
    if (action === "mark_completed" || action === "cancel") {
      setModal({ action, bookingId: drawerBooking.id });
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
        showToast("Assign a team before assigning a groomer.", false);
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
        date: drawerBooking.selectedDate,
      });
      return;
    }
    if (action === "relay_call") {
      void logAdminRelayCall(drawerBooking.id, { teamId: drawerBooking.bookingWindow?.team?.id })
        .then(() => showToast("Relay call logged.", true))
        .catch((error: unknown) => showToast(getErrorMessage(error, "Failed to log relay call."), false));
      return;
    }
    if (action === "retry_payment_support") {
      void retryAdminPaymentSupport(drawerBooking.id)
        .then((result) => showToast(`Created support retry order ${result.orderId.slice(-8)}.`, true))
        .catch((error: unknown) => showToast(getErrorMessage(error, "Failed to create retry order."), false));
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
          showToast(getErrorMessage(error, "Failed to generate payment link."), false)
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
          showToast(`Dispatch moved to ${nextDispatchState.replace(/_/g, " ")}.`, true);
          void load(filters, page, true);
          void openDrawer(drawerBooking.id);
        })
        .catch((error: unknown) =>
          showToast(error instanceof Error ? error.message : "Failed to update dispatch state.", false)
        );
    }
  }, [drawerBooking, filters, load, openDrawer, page, showToast]);

  const submitSameDayAlert = async () => {
    const bookingId = sameDayAlertConfirm.state.payload?.bookingId;
    if (!bookingId) return;
    try {
      sameDayAlertConfirm.setSubmitting(true);
      await sendSameDayDispatchAlert({ bookingId, alertType: "same_day_new_booking" });
      showToast("Same-day alert sent.", true);
      sameDayAlertConfirm.close();
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "Failed to send alert."), false);
    } finally {
      sameDayAlertConfirm.setSubmitting(false);
    }
  };

  const confirmAction = useCallback(async () => {
    if (!modal) return;
    setActionLoading(true);
    try {
      if (modal.action === "mark_completed") {
        const r = await completeAdminBooking(modal.bookingId);
        showToast(`Completed.${r.loyalty.freeUnlockedAfter ? " Loyalty reward unlocked!" : ""}`, true);
      } else {
        const r = await cancelAdminBooking(modal.bookingId);
        showToast(`Cancelled.${r.loyaltyRewardRestored ? " Loyalty reward restored." : ""}`, true);
      }
      setModal(null);
      setDrawerOpen(false);
      await load(filters, page, true);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "Failed to update booking."), false);
    } finally {
      setActionLoading(false);
    }
  }, [modal, filters, page, load, showToast]);

  const submitAssignTeam = async () => {
    if (!assignState?.selectedTeamId) return;
    try {
      setActionLoading(true);
      await assignAdminBookingTeam(assignState.bookingId, assignState.selectedTeamId);
      showToast("Team assignment updated.", true);
      setAssignState(null);
      await load(filters, page, true);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "Failed to assign team."), false);
    } finally {
      setActionLoading(false);
    }
  };

  const submitAssignGroomer = async () => {
    if (!groomerAssignState?.selectedMemberId) return;
    try {
      setActionLoading(true);
      await assignAdminBookingGroomer(groomerAssignState.bookingId, groomerAssignState.selectedMemberId);
      showToast("Groomer assignment updated.", true);
      const bookingId = groomerAssignState.bookingId;
      setGroomerAssignState(null);
      await load(filters, page, true);
      if (drawerOpen && drawerBooking?.id === bookingId) {
        await openDrawer(bookingId);
      }
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "Failed to assign groomer."), false);
    } finally {
      setActionLoading(false);
    }
  };

  const submitReschedule = async (slotIds: string[]) => {
    if (!rescheduleState) return;
    setActionLoading(true);
    try {
      await rescheduleAdminBooking(rescheduleState.bookingId, slotIds);
      showToast("Booking rescheduled.", true);
      setRescheduleState(null);
      setDrawerOpen(false);
      await load(filters, page, true);
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
      showToast("Booking metadata updated.", true);
      setMetadataState(null);
      await load(filters, page, true);
      await openDrawer(metadataState.bookingId);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "Failed to update booking metadata."), false);
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
      showToast("Customer message prepared.", true);
      if (drawerBooking?.id === customerMessageState.bookingId) {
        await openDrawer(customerMessageState.bookingId);
      }
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "Failed to prepare customer message."), false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Bookings"
          subtitle="Manage live, upcoming, and historical bookings."
          onRefresh={() => load(filters, page, true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <>
              <Link
                href="/admin/bookings/new"
                className="inline-flex items-center gap-1.5 h-[42px] rounded-[14px] bg-[#6d5bd0] px-4 text-[13px] font-semibold text-white hover:bg-[#5b4ab5] transition-colors"
              >
                New booking
              </Link>
              <Link
                href="/admin/dispatch"
                className="inline-flex items-center gap-1.5 h-[42px] rounded-[14px] border border-[#ece8f5] bg-white px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
              >
                Dispatch <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </>
          }
        />

        {/* Summary */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <AdminSummaryCard label="Pending payment" value={summary?.pendingPaymentCount ?? "—"} tone="warning" />
          <AdminSummaryCard label="Confirmed"        value={summary?.confirmedCount ?? "—"}       tone="success" />
          <AdminSummaryCard label="Completed"        value={summary?.completedCount ?? "—"}                      />
          <AdminSummaryCard label="Cancelled"        value={summary?.cancelledCount ?? "—"}       tone="danger"  />
          <AdminSummaryCard label="Pay expired"      value={summary?.paymentExpiredCount ?? "—"}  tone="danger"  />
          <AdminSummaryCard label="Unassigned"       value={summary?.unassignedCount ?? "—"}      tone="warning" />
          <AdminSummaryCard label="Same day"         value={summary?.sameDayCount ?? "—"}                        />
        </div>

        <AdminBookingsFiltersBar
          filters={filters}
          teams={teams}
          onChange={applyFilters}
          onReset={() => applyFilters(DEFAULT_FILTERS)}
        />

        <AdminBookingsTable
          rows={bookings}
          isLoading={isLoading}
          error={error}
          page={page}
          pageSize={25}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onRowClick={(row) => openDrawer(row.id)}
          onActionClick={handleTableAction}
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
              : "This will release the slots and cancel the booking. Loyalty rewards will be restored if applicable."
          }
          confirmLabel={modal.action === "mark_completed" ? "Mark completed" : "Yes, cancel"}
          confirmCls={
            modal.action === "mark_completed"
              ? "bg-[#6d5bd0] text-white hover:bg-[#5b4ab5]"
              : "bg-[#c24134] text-white hover:bg-[#a83228]"
          }
          onConfirm={confirmAction}
          onClose={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      <AdminActionConfirmModal
        {...sameDayAlertConfirm.modalProps}
        onSubmit={() => void submitSameDayAlert()}
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
        key={metadataState?.bookingId ?? "booking-metadata"}
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
