"use client";

import type { AdminDispatchFilters } from "../../types";

type Props = {
  filters: AdminDispatchFilters;
  onChange: (next: Partial<AdminDispatchFilters>) => void;
};

export function AdminDispatchFiltersBar({ filters, onChange }: Props) {
  return (
    <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="grid gap-3 md:grid-cols-5">
        <select
          value={filters.viewMode}
          onChange={(e) => onChange({ viewMode: e.target.value as AdminDispatchFilters["viewMode"] })}
          className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="custom_date">Custom date</option>
        </select>

        <input
          type="date"
          value={filters.date}
          onChange={(e) => onChange({ date: e.target.value })}
          className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
        />

        <input
          type="text"
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="Filter by city"
          className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
        />

        <label className="inline-flex h-[44px] cursor-pointer items-center gap-2.5 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] text-[#4b5563]">
          <input
            type="checkbox"
            checked={filters.includeCompleted}
            onChange={(e) => onChange({ includeCompleted: e.target.checked })}
            className="w-4 h-4 accent-[#6d5bd0]"
          />
          Include completed
        </label>

        <label className="inline-flex h-[44px] cursor-pointer items-center gap-2.5 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] text-[#4b5563]">
          <input
            type="checkbox"
            checked={filters.addressPendingOnly}
            onChange={(e) => onChange({ addressPendingOnly: e.target.checked })}
            className="w-4 h-4 accent-[#6d5bd0]"
          />
          Address pending only
        </label>
      </div>
    </div>
  );
}
