"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createAdminSupportCase,
  fetchAdminBookingDetail,
  fetchAdminSupportCases,
  scanAdminSupportSignals,
  updateAdminSupportCase,
} from "../lib/api";
import type {
  AdminBookingDetail,
  AdminSupportCase,
  AdminSupportFilters,
  AdminSupportSummary,
} from "../types";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { AdminBookingDetailDrawer } from "../components/booking-detail/AdminBookingDetailDrawer";
import { AdminActionConfirmModal } from "../components/common/AdminActionConfirmModal";
import { useAdminToast } from "../components/common/AdminToastProvider";

const DEFAULT_FILTERS: AdminSupportFilters = {
  search: "",
  category: "",
  status: "",
  priority: "",
  date: "",
};

const CATEGORY_OPTIONS = [
  { value: "failed_payment", label: "Failed payment" },
  { value: "no_slot_availability", label: "No slot availability" },
  { value: "missing_address", label: "Missing address" },
  { value: "groomer_delay", label: "Groomer delay" },
  { value: "quality_complaint", label: "Quality complaint" },
  { value: "payment_dispute", label: "Payment dispute" },
];

function formatCategory(value: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value.replace(/_/g, " ");
}

export default function AdminSupportPage() {
  const { showToast } = useAdminToast();
  const [filters, setFilters] = useState<AdminSupportFilters>(DEFAULT_FILTERS);
  const [summary, setSummary] = useState<AdminSupportSummary | null>(null);
  const [cases, setCases] = useState<AdminSupportCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBooking, setDrawerBooking] = useState<AdminBookingDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");

  const [createState, setCreateState] = useState({
    open: false,
    bookingId: "",
    category: "failed_payment",
    priority: "high",
    summary: "",
    details: "",
    customerName: "",
    customerPhone: "",
    city: "",
  });

  const [resolveState, setResolveState] = useState<{ caseId: string; resolution: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [signalScanLoading, setSignalScanLoading] = useState(false);

  const load = useCallback(async (nextFilters: AdminSupportFilters, silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const data = await fetchAdminSupportCases(nextFilters);
      setSummary(data.summary);
      setCases(data.cases);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load support cases.");
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

  const applyFilters = (patch: Partial<AdminSupportFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const submitCreate = async () => {
    setActionLoading(true);
    try {
      await createAdminSupportCase({
        bookingId: createState.bookingId || null,
        category: createState.category,
        priority: createState.priority,
        summary: createState.summary,
        details: createState.details,
        customerName: createState.customerName,
        customerPhone: createState.customerPhone,
        city: createState.city,
      });
      setCreateState({
        open: false,
        bookingId: "",
        category: "failed_payment",
        priority: "high",
        summary: "",
        details: "",
        customerName: "",
        customerPhone: "",
        city: "",
      });
      await load(filters, true);
    } finally {
      setActionLoading(false);
    }
  };

  const submitResolve = async () => {
    if (!resolveState) return;
    setActionLoading(true);
    try {
      await updateAdminSupportCase(resolveState.caseId, {
        status: "resolved",
        resolution: resolveState.resolution,
      });
      setResolveState(null);
      await load(filters, true);
    } finally {
      setActionLoading(false);
    }
  };

  const runSignalScan = async () => {
    setSignalScanLoading(true);
    try {
      const result = await scanAdminSupportSignals();
      showToast(
        `${result.createdCount} automated support case${result.createdCount === 1 ? "" : "s"} created.`,
        true
      );
      await load(filters, true);
    } catch (scanError) {
      showToast(
        scanError instanceof Error ? scanError.message : "Failed to scan support signals.",
        false
      );
    } finally {
      setSignalScanLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Support"
          subtitle="Manage customer exceptions and keep a structured ops queue for launch-critical issues."
          onRefresh={() => void load(filters, true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runSignalScan()}
                disabled={signalScanLoading}
                className="inline-flex h-[42px] items-center rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] disabled:opacity-50"
              >
                {signalScanLoading ? "Scanning…" : "Scan signals"}
              </button>
              <button
                type="button"
                onClick={() => setCreateState((prev) => ({ ...prev, open: true }))}
                className="inline-flex h-[42px] items-center rounded-[14px] bg-[#6d5bd0] px-4 text-[13px] font-semibold text-white hover:bg-[#5b4ab5]"
              >
                New case
              </button>
            </div>
          }
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <AdminSummaryCard label="Open" value={summary?.openCount ?? "—"} tone="warning" />
          <AdminSummaryCard label="In progress" value={summary?.inProgressCount ?? "—"} />
          <AdminSummaryCard label="Resolved" value={summary?.resolvedCount ?? "—"} tone="success" />
          <AdminSummaryCard label="Urgent" value={summary?.urgentCount ?? "—"} tone="danger" />
          <AdminSummaryCard label="Failed pay signals" value={summary?.failedPaymentSignals ?? "—"} tone="warning" />
          <AdminSummaryCard label="Missing address" value={summary?.missingAddressSignals ?? "—"} tone="warning" />
          <AdminSummaryCard label="Groomer delay" value={summary?.groomerDelaySignals ?? "—"} tone="danger" />
        </div>

        <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => applyFilters({ search: event.target.value })}
              placeholder="Booking, customer, phone, summary"
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            />
            <select
              value={filters.category}
              onChange={(event) => applyFilters({ category: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => applyFilters({ status: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filters.priority}
              onChange={(event) => applyFilters({ priority: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
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
            <div className="p-8 text-[14px] text-[#7c8499]">Loading support cases…</div>
          ) : error ? (
            <div className="p-8 text-[14px] text-[#b42318]">{error}</div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center text-[14px] text-[#7c8499]">No support cases found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1540px] w-full">
                <thead className="bg-[#faf9fd]">
                  <tr className="text-left">
                    {["Opened", "Category", "Customer", "Booking", "Priority", "Status", "Summary", "Resolution", "Actions"].map((label) => (
                      <th key={label} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6] whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((item) => (
                    <tr key={item.id} className="border-t border-[#f0ecfa] hover:bg-[#fcfbff] transition-colors">
                      <td className="px-4 py-3.5 text-[12px] text-[#8a90a6] whitespace-nowrap">
                        {new Date(item.openedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-[#2a2346] whitespace-nowrap">
                        {formatCategory(item.category)}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">
                        <div>{item.customerName ?? "—"}</div>
                        <div className="mt-0.5 text-[11px] text-[#8a90a6]">{item.customerPhone ?? item.city ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                        {item.booking ? (
                          <button
                            type="button"
                            onClick={() => void openDrawer(item.booking!.id)}
                            className="font-semibold text-[#6d5bd0] hover:text-[#5b4ab5]"
                          >
                            {item.booking.customerName} · {item.booking.serviceName}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.priority === "urgent"
                            ? "bg-[#fff1f2] text-[#be123c]"
                            : item.priority === "high"
                              ? "bg-[#fff8eb] text-[#b45309]"
                              : "bg-[#f3f4f6] text-[#4b5563]"
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.status === "resolved"
                            ? "bg-[#effaf3] text-[#15803d]"
                            : item.status === "in_progress"
                              ? "bg-[#eef2ff] text-[#4338ca]"
                              : "bg-[#fff8eb] text-[#b45309]"
                        }`}>
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#4b5563] max-w-[320px]">
                        <div className="font-medium text-[#2a2346]">{item.summary}</div>
                        {item.details ? <div className="mt-1 text-[12px] text-[#8a90a6]">{item.details}</div> : null}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563] max-w-[260px]">
                        {item.resolution ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-2">
                          {item.booking ? (
                            <button
                              type="button"
                              onClick={() => void openDrawer(item.booking!.id)}
                              className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[11px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
                            >
                              View booking
                            </button>
                          ) : null}
                          {item.status !== "resolved" ? (
                            <button
                              type="button"
                              onClick={() => setResolveState({ caseId: item.id, resolution: item.resolution ?? "" })}
                              className="rounded-[10px] bg-[#15803d] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#166534]"
                            >
                              Resolve
                            </button>
                          ) : null}
                        </div>
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

      {createState.open ? (
        <div className="fixed inset-0 z-[410] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-[24px] bg-white p-6 shadow-2xl">
            <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Create support case</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select
                value={createState.category}
                onChange={(event) => setCreateState((prev) => ({ ...prev, category: event.target.value }))}
                className="h-[46px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={createState.priority}
                onChange={(event) => setCreateState((prev) => ({ ...prev, priority: event.target.value }))}
                className="h-[46px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                type="text"
                value={createState.bookingId}
                onChange={(event) => setCreateState((prev) => ({ ...prev, bookingId: event.target.value }))}
                placeholder="Optional booking ID"
                className="h-[46px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              />
              <input
                type="text"
                value={createState.customerName}
                onChange={(event) => setCreateState((prev) => ({ ...prev, customerName: event.target.value }))}
                placeholder="Customer name"
                className="h-[46px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              />
              <input
                type="text"
                value={createState.customerPhone}
                onChange={(event) => setCreateState((prev) => ({ ...prev, customerPhone: event.target.value }))}
                placeholder="Customer phone"
                className="h-[46px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              />
              <input
                type="text"
                value={createState.city}
                onChange={(event) => setCreateState((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="City"
                className="h-[46px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              />
              <input
                type="text"
                value={createState.summary}
                onChange={(event) => setCreateState((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Summary"
                className="md:col-span-2 h-[46px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              />
              <textarea
                value={createState.details}
                onChange={(event) => setCreateState((prev) => ({ ...prev, details: event.target.value }))}
                rows={5}
                placeholder="Details"
                className="md:col-span-2 w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateState((prev) => ({ ...prev, open: false }))}
                className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !createState.summary.trim()}
                onClick={() => void submitCreate()}
                className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-60"
              >
                {actionLoading ? "Saving…" : "Create case"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminActionConfirmModal
        isOpen={!!resolveState}
        title="Resolve support case"
        subtitle={resolveState?.caseId ? `Case ${resolveState.caseId.slice(0, 8)}` : undefined}
        tone="success"
        message="Add a resolution note before closing this case."
        reasonLabel="Resolution note"
        reasonPlaceholder="What was done to resolve this issue?"
        reason={resolveState?.resolution ?? ""}
        requireReason
        confirmLabel="Resolve case"
        isSubmitting={actionLoading}
        onClose={() => setResolveState(null)}
        onReasonChange={(value) => setResolveState((prev) => (prev ? { ...prev, resolution: value } : prev))}
        onSubmit={() => void submitResolve()}
      />
    </div>
  );
}
