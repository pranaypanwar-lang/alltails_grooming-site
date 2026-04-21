"use client";

import type { AdminTeamRow } from "../../lib/api";

type Props = {
  rows: AdminTeamRow[];
  isLoading: boolean;
  error: string;
  testingTeamId?: string | null;
  onEdit: (team: AdminTeamRow) => void;
  onManageMembers: (team: AdminTeamRow) => void;
  onEditCoverage: (team: AdminTeamRow) => void;
  onTestTelegram: (team: AdminTeamRow) => void;
};

export function AdminTeamsTable({ rows, isLoading, error, testingTeamId, onEdit, onManageMembers, onEditCoverage, onTestTelegram }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-[#ece5ff] bg-white p-6 text-[14px] text-[#7c8499]">
        Loading teams…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[22px] border border-[#f7d7d7] bg-[#fff8f8] p-6 text-[14px] text-[#b42318]">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-[22px] border border-[#ece5ff] bg-white p-8 text-center text-[14px] text-[#7c8499]">
        No teams found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#ece5ff] bg-white shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="overflow-x-auto">
        <table className="min-w-[1020px] w-full">
          <thead className="bg-[#faf9fd]">
            <tr className="text-left">
              {["Team", "Status", "Members", "Telegram chat", "Alerts", "Ops lead", "Lead phone", "Actions"].map((label) => (
                <th key={label} className="px-4 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isTesting = testingTeamId === row.id;
              const canTest = !!row.telegramChatId && row.telegramAlertsEnabled;
              return (
                <tr key={row.id} className="border-t border-[#f0ecfa] hover:bg-[#fcfbff]">
                  <td className="px-4 py-4 text-[13px] font-semibold text-[#2a2346]">{row.name}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      row.isActive === false ? "bg-[#f3f4f6] text-[#4b5563]" : "bg-[#effaf3] text-[#15803d]"
                    }`}>
                      {row.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[13px] text-[#4b5563]">
                    {(row.members ?? []).length}
                  </td>
                  <td className="px-4 py-4 text-[13px] text-[#4b5563] font-mono">{row.telegramChatId || "—"}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      row.telegramAlertsEnabled ? "bg-[#effaf3] text-[#15803d]" : "bg-[#f3f4f6] text-[#4b5563]"
                    }`}>
                      {row.telegramAlertsEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[13px] text-[#4b5563]">{row.opsLeadName || "—"}</td>
                  <td className="px-4 py-4 text-[13px] text-[#4b5563]">{row.opsLeadPhone || "—"}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onManageMembers(row)}
                        className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
                      >
                        Members
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditCoverage(row)}
                        className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
                      >
                        Coverage
                      </button>
                      <button
                        type="button"
                        onClick={() => onTestTelegram(row)}
                        disabled={!canTest || isTesting}
                        title={!canTest ? "Enable alerts and set a chat ID first" : undefined}
                        className="rounded-[10px] border border-[#d8f0df] bg-[#f7fff9] px-3 py-1.5 text-[12px] font-semibold text-[#15803d] disabled:opacity-40 hover:enabled:bg-[#effaf3] transition-colors"
                      >
                        {isTesting ? "Sending…" : "Test Telegram"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
