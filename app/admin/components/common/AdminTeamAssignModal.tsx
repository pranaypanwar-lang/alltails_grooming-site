"use client";

import type { AdminTeamRow } from "../../lib/api";

type Props = {
  isOpen: boolean;
  bookingLabel?: string;
  teams: AdminTeamRow[];
  selectedTeamId: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSelect: (teamId: string) => void;
  onSubmit: () => void;
};

export function AdminTeamAssignModal({
  isOpen,
  bookingLabel,
  teams,
  selectedTeamId,
  isSubmitting,
  onClose,
  onSelect,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  const activeTeams = teams.filter((team) => team.isActive !== false);

  return (
    <div className="fixed inset-0 z-[340] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[520px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">Assign team</div>
        {bookingLabel ? <div className="mt-1 text-[13px] text-[#7c8499]">{bookingLabel}</div> : null}

        <div className="mt-4 grid gap-2">
          {activeTeams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelect(team.id)}
              className={`rounded-[16px] border px-4 py-3 text-left transition-colors ${
                selectedTeamId === team.id
                  ? "border-[#6d5bd0] bg-[#f6f4fd]"
                  : "border-[#ece5ff] bg-white hover:bg-[#faf9fd]"
              }`}
            >
              <div className="text-[14px] font-semibold text-[#2a2346]">{team.name}</div>
              <div className="mt-1 text-[12px] text-[#7c8499]">
                {team.opsLeadName ? `${team.opsLeadName}${team.opsLeadPhone ? ` · ${team.opsLeadPhone}` : ""}` : "No ops lead set"}
              </div>
            </button>
          ))}
          {activeTeams.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[#ddd1fb] bg-[#faf9fd] px-4 py-6 text-[13px] text-[#7c8499]">
              No active teams are available.
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !selectedTeamId}
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 hover:bg-[#5b4ab5] transition-colors"
          >
            {isSubmitting ? "Saving…" : "Save assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
