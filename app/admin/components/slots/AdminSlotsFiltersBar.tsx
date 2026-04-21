"use client";

import type { AdminTeamRow } from "../../lib/api";

type Props = {
  date: string;
  teamId: string;
  includeBlocked: boolean;
  teams: AdminTeamRow[];
  onChange: (next: { date?: string; teamId?: string; includeBlocked?: boolean }) => void;
};

export function AdminSlotsFiltersBar({ date, teamId, includeBlocked, teams, onChange }: Props) {
  return (
    <div className="mb-5 rounded-[22px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="date"
          value={date}
          onChange={(e) => onChange({ date: e.target.value })}
          className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
        />
        <select
          value={teamId}
          onChange={(e) => onChange({ teamId: e.target.value })}
          className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
        <label className="inline-flex h-[44px] items-center gap-2 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] text-[#4b5563] cursor-pointer">
          <input
            type="checkbox"
            checked={includeBlocked}
            onChange={(e) => onChange({ includeBlocked: e.target.checked })}
            className="accent-[#6d5bd0]"
          />
          Include blocked
        </label>
      </div>
    </div>
  );
}
