"use client";

import type { AdminSlotsResponse } from "../../lib/api";

type SlotRow = AdminSlotsResponse["slots"][number];

type Props = {
  rows: SlotRow[];
  isLoading: boolean;
  error: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onBlock: (slot: SlotRow) => void;
  onUnblock: (slot: SlotRow) => void;
  onReleaseHold: (slot: SlotRow) => void;
};

const STATE_CLS: Record<SlotRow["state"], string> = {
  free:    "bg-[#effaf3] text-[#15803d]",
  held:    "bg-[#fff8eb] text-[#b45309]",
  booked:  "bg-[#eef2ff] text-[#4338ca]",
  blocked: "bg-[#fff1f2] text-[#be123c]",
};

export function AdminSlotsTable({ rows, isLoading, error, selectedIds, onToggle, onToggleAll, onBlock, onUnblock, onReleaseHold }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-[#ece5ff] bg-white p-6 text-[14px] text-[#7c8499]">
        Loading slots…
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
        No slots found for this date and filter.
      </div>
    );
  }

  const selectableIds = rows.filter((r) => r.state !== "booked").map((r) => r.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectableIds.some((id) => selectedIds.has(id));

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#ece5ff] bg-white shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full">
          <thead className="bg-[#faf9fd]">
            <tr className="text-left">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                  onChange={() => onToggleAll(selectableIds)}
                  className="h-4 w-4 cursor-pointer rounded border-[#c4c9d4] accent-[#6d5bd0]"
                />
              </th>
              {["Team", "Start", "End", "State", "Hold expires", "Blocked reason", "Booking", "Customer", "Actions"].map((label) => (
                <th key={label} className="px-4 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6] whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selectedIds.has(row.id);
              const isSelectable = row.state !== "booked";
              return (
                <tr key={row.id} className={`border-t border-[#f0ecfa] ${isSelected ? "bg-[#f6f4fd]" : "hover:bg-[#fcfbff]"}`}>
                  <td className="px-4 py-3.5">
                    {isSelectable ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(row.id)}
                        className="h-4 w-4 cursor-pointer rounded border-[#c4c9d4] accent-[#6d5bd0]"
                      />
                    ) : (
                      <span className="block h-4 w-4" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-[#2a2346]">{row.teamName}</td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">
                    {new Date(row.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">
                    {new Date(row.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATE_CLS[row.state]}`}>
                      {row.state}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">
                    {row.holdExpiresAt ? new Date(row.holdExpiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563] max-w-[160px] truncate">
                    {row.blockedReason || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563] font-mono">
                    {row.bookingId ? row.bookingId.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">{row.customerMasked || "—"}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      {row.state !== "blocked" && row.state !== "booked" && (
                        <button type="button" onClick={() => onBlock(row)}
                          className="rounded-[10px] border border-[#f3d6d6] bg-[#fffafa] px-3 py-1.5 text-[12px] font-semibold text-[#c24134] hover:bg-[#fff1f2] transition-colors whitespace-nowrap">
                          Block
                        </button>
                      )}
                      {row.state === "blocked" && (
                        <button type="button" onClick={() => onUnblock(row)}
                          className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors whitespace-nowrap">
                          Unblock
                        </button>
                      )}
                      {row.state === "held" && (
                        <button type="button" onClick={() => onReleaseHold(row)}
                          className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors whitespace-nowrap">
                          Release hold
                        </button>
                      )}
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
