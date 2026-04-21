"use client";

import type { AdminTeamRow } from "../../lib/api";

type Draft = {
  name: string;
  phone: string;
  password: string;
  role: string;
  isActive: boolean;
  memberId?: string | null;
};

export function AdminTeamMembersModal({
  isOpen,
  team,
  draft,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
  onEditMember,
}: {
  isOpen: boolean;
  team: AdminTeamRow | null;
  draft: Draft;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onSubmit: () => void;
  onEditMember: (member: NonNullable<AdminTeamRow["members"]>[number]) => void;
}) {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[rgba(17,12,33,0.44)] p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#ece5ff] bg-white shadow-[0_32px_80px_rgba(34,18,74,0.18)]">
        <div className="border-b border-[#f0ecfa] px-6 py-5">
          <h3 className="text-[22px] font-black tracking-[-0.02em] text-[#1f1f2c]">{team.name} members</h3>
          <p className="mt-1 text-[13px] text-[#6b7280]">Manage groomers and helpers who belong to this team.</p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="space-y-3 overflow-y-auto">
            {(team.members ?? []).length === 0 ? (
              <div className="rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] p-4 text-[13px] text-[#7c8499]">
                No team members added yet.
              </div>
            ) : (
              (team.members ?? []).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onEditMember(member)}
                  className="w-full rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] p-4 text-left hover:bg-[#f7f4ff]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-semibold text-[#2a2346]">{member.name}</div>
                      <div className="mt-1 text-[12px] text-[#6b7280]">
                        {member.role} {member.phone ? `· ${member.phone}` : ""}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${member.isActive ? "bg-[#effaf3] text-[#15803d]" : "bg-[#f3f4f6] text-[#4b5563]"}`}>
                      {member.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-[#6b7280]">
                    <div>XP: <span className="font-semibold text-[#2a2346]">{member.currentXp}</span></div>
                    <div>Rank: <span className="font-semibold text-[#2a2346]">{member.currentRank}</span></div>
                    <div>Level: <span className="font-semibold text-[#2a2346]">{member.currentLevel}</span></div>
                    <div>Reviews: <span className="font-semibold text-[#2a2346]">{member.reviewCount}</span></div>
                    <div>RP: <span className="font-semibold text-[#2a2346]">{member.rewardPoints}</span></div>
                    <div>Trust: <span className="font-semibold text-[#2a2346]">{member.trustScore}</span></div>
                    <div>Perf: <span className="font-semibold text-[#2a2346]">{member.performanceScore}</span></div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="rounded-[22px] border border-[#ece5ff] bg-[#faf9fd] p-5">
            <h4 className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">
              {draft.memberId ? "Edit member" : "Add member"}
            </h4>
            <div className="mt-4 space-y-3">
              <input
                value={draft.name}
                onChange={(event) => onChange({ name: event.target.value })}
                placeholder="Full name"
                className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
              />
              <input
                value={draft.phone}
                onChange={(event) => onChange({ phone: event.target.value })}
                placeholder="Phone (login ID)"
                className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
              />
              <input
                type="password"
                value={draft.password}
                onChange={(event) => onChange({ password: event.target.value })}
                placeholder={draft.memberId ? "New password (optional)" : "Password"}
                className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
              />
              <select
                value={draft.role}
                onChange={(event) => onChange({ role: event.target.value })}
                className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
              >
                <option value="groomer">Groomer</option>
                <option value="helper">Helper</option>
                <option value="team_lead">Team lead</option>
              </select>
              <label className="flex items-center gap-2 text-[13px] text-[#4b5563]">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => onChange({ isActive: event.target.checked })}
                />
                Active member
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="rounded-[14px] bg-[#6d5bd0] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : draft.memberId ? "Update member" : "Add member"}
              </button>
              <button
                type="button"
                onClick={() => onChange({ memberId: null, name: "", phone: "", password: "", role: "groomer", isActive: true })}
                className="rounded-[14px] border border-[#ddd1fb] px-4 py-2.5 text-[13px] font-semibold text-[#6d5bd0]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[14px] border border-[#ece8f5] px-4 py-2.5 text-[13px] font-semibold text-[#4b5563]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
