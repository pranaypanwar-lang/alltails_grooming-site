"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchAdminCustomers } from "../lib/api";
import type {
  AdminCustomerLifecycleStage,
  AdminCustomerListRow,
  AdminCustomersFilters,
  AdminCustomersSummary,
} from "../types";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryBar } from "../components/common/AdminSummaryBar";

const FUNNEL_STAGES: {
  key: AdminCustomerLifecycleStage;
  label: string;
  summaryKey: keyof AdminCustomersSummary;
  color: string;
  activeColor: string;
}[] = [
  { key: "first_time_customer", label: "First-time", summaryKey: "firstTimeCount", color: "bg-[#dbeafe]", activeColor: "bg-[#2563eb]" },
  { key: "repeat_customer", label: "Repeat", summaryKey: "repeatCount", color: "bg-[#d1fae5]", activeColor: "bg-[#059669]" },
  { key: "loyal_customer", label: "Loyal", summaryKey: "loyalCount", color: "bg-[#f5f3ff]", activeColor: "bg-[#6d5bd0]" },
  { key: "at_risk", label: "At Risk", summaryKey: "atRiskCount", color: "bg-[#fef3c7]", activeColor: "bg-[#d97706]" },
  { key: "support_hold", label: "Support Hold", summaryKey: "supportHoldCount", color: "bg-[#fee2e2]", activeColor: "bg-[#dc2626]" },
];

function LifecycleFunnel({
  summary,
  activeStage,
  onStageClick,
}: {
  summary: AdminCustomersSummary;
  activeStage: AdminCustomerLifecycleStage | "";
  onStageClick: (stage: AdminCustomerLifecycleStage) => void;
}) {
  const total = Math.max(
    FUNNEL_STAGES.reduce((s, f) => s + (summary[f.summaryKey] as number), 0),
    1
  );

  return (
    <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[14px] font-black tracking-[-0.02em] text-[#1f1f2c]">Customer Lifecycle</div>
        {activeStage && (
          <button
            type="button"
            onClick={() => onStageClick(activeStage)}
            className="text-[11px] font-semibold text-[#6d5bd0] hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="flex gap-3">
        {FUNNEL_STAGES.map((stage, idx) => {
          const count = summary[stage.summaryKey] as number;
          const widthPct = Math.max((count / total) * 100, 4);
          const isActive = activeStage === stage.key;
          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => onStageClick(stage.key)}
              className={`group flex flex-col gap-2 rounded-[14px] p-3 text-left transition-all hover:shadow-md ${
                isActive ? `${stage.activeColor} text-white shadow-md` : "border border-[#f0ecfa] bg-[#faf9fd] hover:bg-white"
              }`}
              style={{ flex: `${widthPct} 0 0`, minWidth: 80 }}
            >
              <div className={`text-[22px] font-black tracking-[-0.03em] ${isActive ? "text-white" : "text-[#1f1f2c]"}`}>
                {count}
              </div>
              <div className={`text-[11px] font-semibold leading-tight ${isActive ? "text-white/80" : "text-[#7c8499]"}`}>
                {stage.label}
              </div>
              {/* Mini bar */}
              <div className={`h-1 w-full rounded-full ${isActive ? "bg-white/30" : "bg-[#ece5ff]"}`}>
                <div
                  className={`h-1 rounded-full ${isActive ? "bg-white" : stage.color.replace("bg-[", "bg-[")}`}
                  style={{ width: `${Math.min(widthPct, 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_FILTERS: AdminCustomersFilters = {
  search: "",
  city: "",
  lifecycleStage: "",
  loyaltyState: "",
  hasUpcomingBooking: false,
  hasOpenSupportCase: false,
  isAtRisk: false,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const PAGE_SIZE = 25;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStageClass(stage: AdminCustomerLifecycleStage) {
  if (stage === "support_hold") return "bg-[#fff1f2] text-[#be123c]";
  if (stage === "at_risk" || stage === "lost") return "bg-[#fff8eb] text-[#b45309]";
  if (stage === "loyal_customer" || stage === "active_with_upcoming") return "bg-[#effaf3] text-[#15803d]";
  return "bg-[#eef2ff] text-[#4338ca]";
}

function getRiskFlagClass(flag: string) {
  if (flag === "support_open" || flag === "complaint_history") return "bg-[#fff1f2] text-[#be123c]";
  if (flag === "payment_risk" || flag === "due_soon") return "bg-[#fff8eb] text-[#b45309]";
  if (flag === "loyalty_unlocked" || flag === "upcoming_booking") return "bg-[#effaf3] text-[#15803d]";
  return "bg-[#eef2ff] text-[#4338ca]";
}

function prettyFlag(flag: string) {
  return flag.replace(/_/g, " ");
}

export default function AdminCustomersPage() {
  const [filters, setFilters] = useState<AdminCustomersFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminCustomerListRow[]>([]);
  const [summary, setSummary] = useState<AdminCustomersSummary | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextFilters: AdminCustomersFilters, nextPage: number, silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const data = await fetchAdminCustomers({
        filters: nextFilters,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setRows(data.customers);
      setSummary(data.summary);
      setAvailableCities(data.availableCities);
      setTotalPages(data.totalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load customers.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(filters, page);
  }, [filters, load, page]);

  const applyFilters = (patch: Partial<AdminCustomersFilters>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Customers"
          subtitle="Customer 360 for booking history, loyalty, message history, support state, and lifecycle risk."
          onRefresh={() => void load(filters, page, true)}
          isRefreshing={isRefreshing}
        />

        <AdminSummaryBar
          columnsClassName="sm:grid-cols-2 xl:grid-cols-5"
          items={[
            { label: "Total customers", value: summary?.totalCustomers ?? "—" },
            { label: "First-time", value: summary?.firstTimeCount ?? "—" },
            { label: "Repeat", value: summary?.repeatCount ?? "—", tone: "success" },
            { label: "Due soon", value: summary?.dueSoonCount ?? "—", tone: "warning" },
            { label: "At risk", value: summary?.atRiskCount ?? "—", tone: "danger" },
          ]}
        />

        {/* Lifecycle funnel */}
        {summary && (
          <LifecycleFunnel
            summary={summary}
            activeStage={filters.lifecycleStage}
            onStageClick={(stage) =>
              applyFilters({ lifecycleStage: filters.lifecycleStage === stage ? "" : stage })
            }
          />
        )}

        {/* Opportunity grabber */}
        {rows.length > 0 && (() => {
          const dueCount = rows.filter(
            (r) => r.bookingSummary.daysOverdue !== null && r.bookingSummary.daysOverdue >= 27 && r.bookingSummary.daysOverdue <= 42
          ).length;
          if (dueCount === 0) return null;
          return (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-[16px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
              <div className="text-[13px] font-semibold text-[#92400e]">
                ⚡ {dueCount} customer{dueCount > 1 ? "s" : ""} due for rebooking — last visit 27–42 days ago
              </div>
              <Link
                href="/admin/campaigns"
                className="shrink-0 rounded-[10px] bg-[#d97706] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#b45309] transition-colors"
              >
                Prepare messages →
              </Link>
            </div>
          );
        })()}

        <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => applyFilters({ search: event.target.value })}
              placeholder="Name, phone, city, pet"
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none xl:col-span-2"
            />
            <select
              value={filters.city}
              onChange={(event) => applyFilters({ city: event.target.value })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <select
              value={filters.lifecycleStage}
              onChange={(event) => applyFilters({ lifecycleStage: event.target.value as AdminCustomerLifecycleStage | "" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All lifecycles</option>
              <option value="lead">Lead</option>
              <option value="first_booking_scheduled">First booking scheduled</option>
              <option value="first_time_customer">First-time</option>
              <option value="repeat_customer">Repeat</option>
              <option value="loyal_customer">Loyal</option>
              <option value="active_with_upcoming">Active with upcoming</option>
              <option value="at_risk">At risk</option>
              <option value="lost">Lost</option>
              <option value="support_hold">Support hold</option>
            </select>
            <select
              value={filters.loyaltyState}
              onChange={(event) => applyFilters({ loyaltyState: event.target.value as "unlocked" | "locked" | "" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All loyalty states</option>
              <option value="unlocked">Loyalty unlocked</option>
              <option value="locked">Loyalty locked</option>
            </select>
            <select
              value={filters.sortBy}
              onChange={(event) => applyFilters({ sortBy: event.target.value as AdminCustomersFilters["sortBy"] })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="createdAt">Newest profile</option>
              <option value="name">Name</option>
              <option value="city">City</option>
              <option value="lastCompletedAt">Last completed</option>
              <option value="nextBookingAt">Next booking</option>
              <option value="totalSpent">Total spent</option>
              <option value="completedBookings">Completed bookings</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(event) => applyFilters({ sortOrder: event.target.value as "asc" | "desc" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <div className="flex items-center gap-3 xl:col-span-2">
              <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#6b7280]">
                <input
                  type="checkbox"
                  checked={filters.hasUpcomingBooking}
                  onChange={(event) => applyFilters({ hasUpcomingBooking: event.target.checked })}
                />
                Upcoming
              </label>
              <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#6b7280]">
                <input
                  type="checkbox"
                  checked={filters.hasOpenSupportCase}
                  onChange={(event) => applyFilters({ hasOpenSupportCase: event.target.checked })}
                />
                Support open
              </label>
              <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#6b7280]">
                <input
                  type="checkbox"
                  checked={filters.isAtRisk}
                  onChange={(event) => applyFilters({ isAtRisk: event.target.checked })}
                />
                At risk only
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#ece5ff] bg-white shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          {isLoading ? (
            <div className="p-8 text-[14px] text-[#7c8499]">Loading customers…</div>
          ) : error ? (
            <div className="p-8 text-[14px] text-[#b42318]">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-[14px] text-[#7c8499]">No customers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1480px] w-full">
                <thead className="bg-[#faf9fd]">
                  <tr className="text-left">
                    {["Customer", "Pets", "Lifecycle", "Signals", "Last completed", "Next booking", "Bookings", "Value", "Support", "Actions"].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6] whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f0ecfa] hover:bg-[#fcfbff] transition-colors">
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/customers/${row.id}`} className="block">
                          <div className="text-[13px] font-semibold text-[#2a2346]">{row.name}</div>
                          <div className="mt-0.5 text-[12px] text-[#6b7280]">{row.phoneFull}</div>
                          <div className="mt-0.5 text-[11px] text-[#8a90a6]">{row.city ?? "—"}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                        <div className="font-semibold text-[#2a2346]">{row.pets.count} pets</div>
                        <div className="mt-1 max-w-[180px] truncate">{row.pets.names.join(", ") || row.pets.breeds.join(", ")}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getStageClass(row.lifecycleStage)}`}>
                          {row.lifecycleLabel}
                        </div>
                        <div className="mt-2 max-w-[240px] text-[12px] leading-[1.5] text-[#6b7280]">{row.lifecycleReason}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-[220px] flex-wrap gap-1.5">
                          {row.riskFlags.length === 0 ? (
                            <span className="text-[12px] text-[#8a90a6]">No active flags</span>
                          ) : (
                            row.riskFlags.map((flag) => (
                              <span
                                key={flag}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getRiskFlagClass(flag)}`}
                              >
                                {prettyFlag(flag)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563] whitespace-nowrap">
                        {formatDate(row.bookingSummary.lastCompletedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563] whitespace-nowrap">
                        {formatDate(row.bookingSummary.nextBookingAt)}
                        {row.bookingSummary.expectedNextBookingAt && !row.bookingSummary.nextBookingAt ? (
                          <div className="mt-1 text-[11px] text-[#8a90a6]">
                            Expected {formatDate(row.bookingSummary.expectedNextBookingAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                        <div>{row.bookingSummary.completed} completed</div>
                        <div className="mt-1 text-[#8a90a6]">{row.bookingSummary.total} total</div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                        <div className="font-semibold text-[#2a2346]">{formatCurrency(row.bookingSummary.totalSpent)}</div>
                        <div className="mt-1 text-[#8a90a6]">AOV {formatCurrency(row.bookingSummary.averageOrderValue)}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                        <div>{row.supportSummary.openCaseCount} open</div>
                        <div className="mt-1 text-[#8a90a6]">{row.supportSummary.unresolvedComplaintCount} unresolved complaints</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/customers/${row.id}`}
                          className="inline-flex h-[34px] items-center rounded-[12px] border border-[#ddd1fb] px-3 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
                        >
                          Open 360
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-[12px] text-[#8a90a6]">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex h-[38px] items-center rounded-[12px] border border-[#ddd1fb] bg-white px-3 text-[12px] font-semibold text-[#6d5bd0] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="inline-flex h-[38px] items-center rounded-[12px] border border-[#ddd1fb] bg-white px-3 text-[12px] font-semibold text-[#6d5bd0] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
