"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminBookingDetail,
  fetchAdminCustomerMessages,
  processAdminCustomerMessageQueue,
  updateAdminCustomerMessageStatus,
} from "../lib/api";
import type {
  AdminBookingDetail,
  AdminCustomerMessagesFilters,
  AdminCustomerMessagesSummary,
  AdminCustomerMessageRow,
} from "../types";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { AdminBookingDetailDrawer } from "../components/booking-detail/AdminBookingDetailDrawer";
import { useAdminToast } from "../components/common/AdminToastProvider";

const DEFAULT_FILTERS: AdminCustomerMessagesFilters = {
  search: "",
  messageType: "",
  status: "",
  date: "",
};

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  booking_confirmation: "Booking confirmation",
  team_on_the_way: "Team on the way",
  groomer_delay_update: "Delay update",
  night_before_reminder: "Night-before reminder",
  post_groom_care: "Post-groom care",
  review_request: "Review request",
  rebooking_reminder: "5th-week rebooking",
  periodic_care_tip: "Care tip",
  custom_offer: "Custom offer",
};

export default function AdminMessagesPage() {
  const { showToast } = useAdminToast();
  const [filters, setFilters] = useState<AdminCustomerMessagesFilters>(DEFAULT_FILTERS);
  const [summary, setSummary] = useState<AdminCustomerMessagesSummary | null>(null);
  const [rows, setRows] = useState<AdminCustomerMessageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBooking, setDrawerBooking] = useState<AdminBookingDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");

  const load = useCallback(async (nextFilters: AdminCustomerMessagesFilters, silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError("");
    try {
      const data = await fetchAdminCustomerMessages(nextFilters);
      setSummary(data.summary);
      setRows(data.messages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load messages.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

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
    await Promise.all([load(filters, true), openDrawer(drawerBooking.id)]);
  }, [drawerBooking, filters, load, openDrawer]);

  const applyFilters = (patch: Partial<AdminCustomerMessagesFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const updateStatus = useCallback(async (
    row: AdminCustomerMessageRow,
    status: "prepared" | "queued" | "sent" | "failed"
  ) => {
    setStatusLoadingId(row.id);
    try {
      await updateAdminCustomerMessageStatus(row.id, {
        status,
        errorMsg: status === "failed" ? "Manual delivery follow-up required" : undefined,
      });
      showToast(`Message moved to ${status.replace(/_/g, " ")}.`, true);
      await load(filters, true);
      if (drawerBooking?.id === row.bookingId) {
        await openDrawer(row.bookingId);
      }
    } catch (statusError) {
      showToast(
        statusError instanceof Error ? statusError.message : "Failed to update message status.",
        false
      );
    } finally {
      setStatusLoadingId(null);
    }
  }, [drawerBooking?.id, filters, load, openDrawer, showToast]);

  const statusToneClass = (status: string) => {
    if (status === "sent") return "bg-[#effaf3] text-[#15803d]";
    if (status === "failed") return "bg-[#fff1f2] text-[#be123c]";
    if (status === "queued") return "bg-[#eef2ff] text-[#4338ca]";
    return "bg-[#fff8eb] text-[#b45309]";
  };

  const processQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const result = await processAdminCustomerMessageQueue();
      if (!result.diagnostics.configured) {
        showToast("WhatsApp provider is not configured yet.", false);
      } else {
        showToast(
          `${result.acceptedCount} queued message${result.acceptedCount === 1 ? "" : "s"} handed to the provider.`,
          true
        );
      }
      await load(filters, true);
      if (drawerBooking) {
        await openDrawer(drawerBooking.id);
      }
    } catch (queueError) {
      showToast(
        queueError instanceof Error ? queueError.message : "Failed to process customer message queue.",
        false
      );
    } finally {
      setQueueLoading(false);
    }
  }, [drawerBooking, filters, load, openDrawer, showToast]);

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Messages"
          subtitle="Review customer lifecycle messages across confirmations, reminders, care guides, and review nudges."
          onRefresh={() => void load(filters, true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <button
              type="button"
              onClick={() => void processQueue()}
              disabled={queueLoading}
              className="inline-flex h-[42px] items-center rounded-[14px] bg-[#6d5bd0] px-4 text-[13px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-50"
            >
              {queueLoading ? "Processing…" : "Process queued"}
            </button>
          }
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <AdminSummaryCard label="Total" value={summary?.totalMessages ?? "—"} />
          <AdminSummaryCard label="Queued" value={summary?.queuedCount ?? "—"} tone="warning" />
          <AdminSummaryCard label="Sent" value={summary?.sentCount ?? "—"} tone="success" />
          <AdminSummaryCard label="Failed" value={summary?.failedCount ?? "—"} tone="danger" />
          <AdminSummaryCard label="Confirmations" value={summary?.bookingConfirmationCount ?? "—"} />
          <AdminSummaryCard label="Reminders" value={summary?.reminderCount ?? "—"} />
        </div>

        <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => applyFilters({ search: event.target.value })}
              placeholder="Booking, customer, phone, service"
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            />
            <select
              value={filters.messageType}
              onChange={(event) => applyFilters({ messageType: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All message types</option>
              {Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => applyFilters({ status: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All statuses</option>
              <option value="prepared">Prepared</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={(event) => applyFilters({ date: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#ece5ff] bg-white shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          {isLoading ? (
            <div className="p-8 text-[14px] text-[#7c8499]">Loading messages…</div>
          ) : error ? (
            <div className="p-8 text-[14px] text-[#b42318]">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-[14px] text-[#7c8499]">No customer messages found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] w-full">
                <thead className="bg-[#faf9fd]">
                  <tr className="text-left">
                    {["Prepared", "Type", "Pet parent", "Contact", "Service", "Date", "Channel", "Status", "Recipient", "Preview", "Actions"].map((label) => (
                      <th key={label} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6] whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f0ecfa] hover:bg-[#fcfbff] transition-colors">
                      <td className="px-4 py-3.5 text-[12px] text-[#8a90a6] whitespace-nowrap">
                        {new Date(row.preparedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-[#2a2346] whitespace-nowrap">
                        {MESSAGE_TYPE_LABELS[row.messageType] ?? row.messageType.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3.5 cursor-pointer hover:text-[#6d5bd0]" onClick={() => void openDrawer(row.bookingId)}>
                        <div className="text-[13px] font-semibold text-[#2a2346]">{row.customerName}</div>
                        <div className="mt-0.5 text-[11px] text-[#8a90a6]">{row.city ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">{row.customerPhone}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">{row.serviceName}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">{row.selectedDate ?? "—"}</td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563] whitespace-nowrap">{row.channel.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${statusToneClass(row.status)}`}>
                          {row.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563] whitespace-nowrap">{row.recipient}</td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563] max-w-[360px]">
                        <p className="max-h-16 overflow-hidden whitespace-pre-wrap leading-[1.6]">{row.content}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void openDrawer(row.bookingId)}
                            className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[11px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
                          >
                            View booking
                          </button>
                          {row.actionUrl ? (
                            <a
                              href={row.actionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-[10px] bg-[#6d5bd0] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5b4ab5]"
                            >
                              Open WhatsApp
                            </a>
                          ) : null}
                          {row.status === "prepared" ? (
                            <button
                              type="button"
                              disabled={statusLoadingId === row.id}
                              onClick={() => void updateStatus(row, "queued")}
                              className="rounded-[10px] border border-[#d6d9f3] px-3 py-1.5 text-[11px] font-semibold text-[#4338ca] hover:bg-[#eef2ff] disabled:opacity-50"
                            >
                              Queue
                            </button>
                          ) : null}
                          {row.status !== "sent" ? (
                            <button
                              type="button"
                              disabled={statusLoadingId === row.id}
                              onClick={() => void updateStatus(row, "sent")}
                              className="rounded-[10px] border border-[#d7f2df] px-3 py-1.5 text-[11px] font-semibold text-[#15803d] hover:bg-[#effaf3] disabled:opacity-50"
                            >
                              Mark sent
                            </button>
                          ) : null}
                          {row.status !== "failed" ? (
                            <button
                              type="button"
                              disabled={statusLoadingId === row.id}
                              onClick={() => void updateStatus(row, "failed")}
                              className="rounded-[10px] border border-[#f3d6d6] px-3 py-1.5 text-[11px] font-semibold text-[#be123c] hover:bg-[#fff1f2] disabled:opacity-50"
                            >
                              Mark failed
                            </button>
                          ) : null}
                        </div>
                        {row.providerRef ? (
                          <div className="mt-2 text-[10px] text-[#8a90a6]">
                            Provider ref: {row.providerRef}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AdminBookingDetailDrawer
        isOpen={drawerOpen}
        booking={drawerBooking}
        isLoading={drawerLoading}
        error={drawerError}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerBooking(null);
        }}
        onAction={() => {}}
        onRefreshBooking={refreshDrawerBooking}
      />
    </div>
  );
}
