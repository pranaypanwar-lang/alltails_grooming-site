"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AdminBookingsFilters, AdminBookingStatus, AdminPaymentStatus, AdminLoyaltyState } from "../../types";
import type { AdminTeamRow } from "../../lib/api";

const TABS: { id: AdminBookingsFilters["tab"]; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled_expired", label: "Cancelled / expired" },
];

type Props = {
  filters: AdminBookingsFilters;
  teams: AdminTeamRow[];
  onChange: (next: Partial<AdminBookingsFilters>) => void;
  onReset: () => void;
};

export function AdminBookingsFiltersBar({ filters, teams, onChange, onReset }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(teams.map((team) => team.name.split(" Team")[0]?.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [teams]
  );

  return (
    <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange({ tab: tab.id })}
            className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              filters.tab === tab.id
                ? "bg-[#6d5bd0] text-white"
                : "bg-[#f6f4fd] text-[#6d5bd0] hover:bg-[#ede9fc]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1.5 xl:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Search</span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Booking ID, customer, phone, pet"
            className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#6d5bd0]/20"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Team</span>
          <select
            value={filters.teamId}
            onChange={(e) => onChange({ teamId: e.target.value })}
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
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">City</span>
          <input
            type="text"
            list="admin-bookings-city-options"
            value={filters.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="City"
            className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
          />
          <datalist id="admin-bookings-city-options">
            {cityOptions.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Payment</span>
          <select
            value={filters.paymentStatus}
            onChange={(e) => onChange({ paymentStatus: e.target.value as AdminPaymentStatus | "" })}
            className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
          >
            <option value="">All payment states</option>
            <option value="unpaid">Pending payment</option>
            <option value="paid">Paid</option>
            <option value="pending_cash_collection">Pay after service</option>
            <option value="covered_by_loyalty">Covered by loyalty</option>
            <option value="expired">Expired</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Date</span>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onChange({ date: e.target.value, dateFrom: "", dateTo: "" })}
            className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="inline-flex items-center gap-2 text-[13px] text-[#6b7280] cursor-pointer">
          <input
            type="checkbox"
            checked={filters.sameDayOnly}
            onChange={(e) => onChange({ sameDayOnly: e.target.checked })}
            className="h-4 w-4 accent-[#6d5bd0]"
          />
          Same-day only
        </label>

        <label className="inline-flex items-center gap-2 text-[13px] text-[#6b7280] cursor-pointer">
          <input
            type="checkbox"
            checked={filters.needsAssignment}
            onChange={(e) => onChange({ needsAssignment: e.target.checked })}
            className="h-4 w-4 accent-[#6d5bd0]"
          />
          Needs assignment
        </label>

        <label className="inline-flex items-center gap-2 text-[13px] text-[#6b7280] cursor-pointer">
          <input
            type="checkbox"
            checked={filters.paymentExpiringSoon}
            onChange={(e) => onChange({ paymentExpiringSoon: e.target.checked })}
            className="h-4 w-4 accent-[#6d5bd0]"
          />
          Payment expiring soon
        </label>

        <label className="inline-flex items-center gap-2 text-[13px] text-[#6b7280] cursor-pointer">
          <input
            type="checkbox"
            checked={filters.tomorrowOnly}
            onChange={(e) => onChange({ tomorrowOnly: e.target.checked })}
            className="h-4 w-4 accent-[#6d5bd0]"
          />
          Tomorrow only
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="inline-flex h-[40px] items-center gap-1 rounded-[12px] border border-[#ece8f5] bg-white px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
          >
            More filters
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="h-[40px] rounded-[12px] border border-[#ece8f5] bg-[#faf9fc] px-4 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f0ecfa] transition-colors"
          >
            Reset filters
          </button>
        </div>
      </div>

      {showAdvanced ? (
        <div className="mt-4 grid gap-3 border-t border-[#f0ecfa] pt-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Booking status</span>
            <select
              value={filters.bookingStatus}
              onChange={(e) => onChange({ bookingStatus: e.target.value as AdminBookingStatus | "" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All booking states</option>
              <option value="pending_payment">Pending payment</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="payment_expired">Expired</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Service</span>
            <input
              type="text"
              value={filters.serviceName}
              onChange={(e) => onChange({ serviceName: e.target.value })}
              placeholder="Service name"
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Loyalty</span>
            <select
              value={filters.loyaltyState}
              onChange={(e) => onChange({ loyaltyState: e.target.value as AdminLoyaltyState | "" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="">All loyalty states</option>
              <option value="reward_applied">Reward applied</option>
              <option value="reward_restored">Reward restored</option>
              <option value="counted">Counted</option>
              <option value="not_counted">Not counted</option>
              <option value="unlock_ready">Unlock ready</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Sort by</span>
            <select
              value={`${filters.sortBy}__${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split("__") as [AdminBookingsFilters["sortBy"], "asc" | "desc"];
                onChange({ sortBy, sortOrder });
              }}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            >
              <option value="createdAt__desc">Booking made: newest first</option>
              <option value="createdAt__asc">Booking made: oldest first</option>
              <option value="serviceDate__asc">Service date: earliest first</option>
              <option value="serviceDate__desc">Service date: latest first</option>
              <option value="updatedAt__desc">Recently updated first</option>
              <option value="team__asc">Team: A-Z</option>
              <option value="team__desc">Team: Z-A</option>
              <option value="city__asc">City: A-Z</option>
              <option value="city__desc">City: Z-A</option>
              <option value="finalAmount__desc">Amount: high to low</option>
              <option value="finalAmount__asc">Amount: low to high</option>
              <option value="customerName__asc">Customer name: A-Z</option>
              <option value="customerName__desc">Customer name: Z-A</option>
              <option value="paymentPriority__desc">Payment priority</option>
              <option value="assignmentPriority__desc">Unassigned first</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ dateFrom: e.target.value, date: "" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ dateTo: e.target.value, date: "" })}
              className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
