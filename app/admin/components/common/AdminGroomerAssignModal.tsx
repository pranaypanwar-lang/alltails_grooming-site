"use client";

import type { AdminTeamRow } from "../../lib/api";

type Props = {
  isOpen: boolean;
  bookingLabel?: string;
  teamName?: string;
  members: NonNullable<AdminTeamRow["members"]>;
  selectedMemberId: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSelect: (memberId: string) => void;
  onSubmit: () => void;
};

export function AdminGroomerAssignModal({
  isOpen,
  bookingLabel,
  teamName,
  members,
  selectedMemberId,
  isSubmitting,
  onClose,
  onSelect,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  const activeMembers = members.filter((member) => member.isActive);

  return (
    <div className="fixed inset-0 z-[341] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">Assign groomer</div>
        {bookingLabel ? <div className="mt-1 text-[13px] text-[#7c8499]">{bookingLabel}</div> : null}
        {teamName ? <div className="mt-1 text-[12px] font-medium text-[#6d5bd0]">Team: {teamName}</div> : null}

        <div className="mt-4 grid gap-2">
          {activeMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member.id)}
              className={`rounded-[16px] border px-4 py-3 text-left transition-colors ${
                selectedMemberId === member.id
                  ? "border-[#6d5bd0] bg-[#f6f4fd]"
                  : "border-[#ece5ff] bg-white hover:bg-[#faf9fd]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[14px] font-semibold text-[#2a2346]">{member.name}</div>
                <div className="rounded-full bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#6d28d9]">
                  {member.currentRank}
                </div>
              </div>
              <div className="mt-1 text-[12px] text-[#7c8499]">
                {member.role.replace(/_/g, " ")} · Level {member.currentLevel} · {member.currentXp} XP
              </div>
              <div className="mt-1 text-[11px] text-[#7c8499]">
                Reward pts {member.rewardPoints} · Perf {member.performanceScore} · Trust {member.trustScore}
              </div>
            </button>
          ))}
          {activeMembers.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[#ddd1fb] bg-[#faf9fd] px-4 py-6 text-[13px] text-[#7c8499]">
              No active groomers/helpers are available in this team yet.
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
            disabled={isSubmitting || !selectedMemberId}
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 hover:bg-[#5b4ab5] transition-colors"
          >
            {isSubmitting ? "Saving…" : "Save groomer"}
          </button>
        </div>
      </div>
    </div>
  );
}
