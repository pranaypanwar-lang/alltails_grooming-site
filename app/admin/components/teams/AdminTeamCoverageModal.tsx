"use client";

import type { AdminServiceArea, AdminTeamRow } from "../../lib/api";

type RuleDraft = {
  weekday: number;
  areaIds: string[];
};

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Props = {
  isOpen: boolean;
  team: AdminTeamRow | null;
  serviceAreas: AdminServiceArea[];
  rules: RuleDraft[];
  isSubmitting: boolean;
  onClose: () => void;
  onToggleArea: (weekday: number, areaId: string) => void;
  onSubmit: () => void;
};

export function AdminTeamCoverageModal({
  isOpen,
  team,
  serviceAreas,
  rules,
  isSubmitting,
  onClose,
  onToggleArea,
  onSubmit,
}: Props) {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-[330] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[920px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">Edit coverage rules</div>
        <div className="mt-1 text-[13px] text-[#7c8499]">{team.name}</div>

        <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto md:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule.weekday} className="rounded-[18px] border border-[#ece5ff] bg-[#faf9fd] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[14px] font-semibold text-[#2a2346]">{WEEKDAY_LABELS[rule.weekday]}</div>
                <span className="text-[11px] text-[#8a90a6]">
                  {rule.areaIds.length === 0 ? "Off" : rule.areaIds.length === 1 ? "Single city" : "Regional pool"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {serviceAreas.map((area) => {
                  const selected = rule.areaIds.includes(area.id);
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => onToggleArea(rule.weekday, area.id)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        selected
                          ? "border-[#6d5bd0] bg-[#f4efff] text-[#6d5bd0]"
                          : "border-[#ddd1fb] bg-white text-[#4b5563] hover:bg-[#f6f4fd]"
                      }`}
                    >
                      {area.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
            disabled={isSubmitting}
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 hover:bg-[#5b4ab5] transition-colors"
          >
            {isSubmitting ? "Saving…" : "Save coverage"}
          </button>
        </div>
      </div>
    </div>
  );
}
