"use client";

import type { AdminTeamRow } from "../../lib/api";

type Draft = {
  name: string;
  isActive: boolean;
  telegramChatId: string;
  telegramAlertsEnabled: boolean;
  opsLeadName: string;
  opsLeadPhone: string;
};

type Props = {
  isOpen: boolean;
  team: AdminTeamRow | null;
  draft: Draft;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (next: Partial<Draft>) => void;
  onSubmit: () => void;
};

export function AdminTeamEditModal({ isOpen, team, draft, isSubmitting, onClose, onChange, onSubmit }: Props) {
  if (!isOpen) return null;

  const isCreate = !team;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[520px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">
          {isCreate ? "Create team" : "Edit team"}
        </div>
        <div className="mt-1 text-[13px] text-[#7c8499]">
          {isCreate ? "Add a new grooming team. You can add members and coverage rules afterwards." : team.name}
        </div>

        <div className="mt-4 grid gap-3">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Team name"
            className="h-[48px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
          />
          <label className="inline-flex items-center gap-2 rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#4b5563] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
              className="accent-[#6d5bd0]"
            />
            Team is active
          </label>
          <input
            type="text"
            value={draft.telegramChatId}
            onChange={(e) => onChange({ telegramChatId: e.target.value })}
            placeholder="Telegram chat ID (e.g. -1001234567890)"
            className="h-[48px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] font-mono outline-none focus:border-[#6d5bd0]"
          />
          <label className="inline-flex items-center gap-2 rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#4b5563] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.telegramAlertsEnabled}
              onChange={(e) => onChange({ telegramAlertsEnabled: e.target.checked })}
              className="accent-[#6d5bd0]"
            />
            Telegram alerts enabled
          </label>
          <input
            type="text"
            value={draft.opsLeadName}
            onChange={(e) => onChange({ opsLeadName: e.target.value })}
            placeholder="Ops lead name"
            className="h-[48px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
          />
          <input
            type="text"
            value={draft.opsLeadPhone}
            onChange={(e) => onChange({ opsLeadPhone: e.target.value })}
            placeholder="Ops lead phone"
            className="h-[48px] rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
          />
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
            disabled={isSubmitting || !draft.name.trim()}
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 hover:bg-[#5b4ab5] transition-colors"
          >
            {isSubmitting ? "Saving…" : isCreate ? "Create team" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
