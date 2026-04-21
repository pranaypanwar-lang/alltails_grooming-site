"use client";

import type { AdminSlotsResponse } from "../../lib/api";

type SlotRow = AdminSlotsResponse["slots"][number];

type Props = {
  rows: SlotRow[];
  isLoading: boolean;
  error: string;
  onBlock: (slot: SlotRow) => void;
  onUnblock: (slot: SlotRow) => void;
  onReleaseHold: (slot: SlotRow) => void;
};

const STATE_CLS: Record<SlotRow["state"], string> = {
  free:    "bg-[#effaf3] text-[#15803d] border-[#d8f0df]",
  held:    "bg-[#fff8eb] text-[#b45309] border-[#fde7b0]",
  booked:  "bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]",
  blocked: "bg-[#fff1f2] text-[#be123c] border-[#f7d7d7]",
};

const CARD_BORDER: Record<SlotRow["state"], string> = {
  free:    "border-[#ece5ff]",
  held:    "border-[#fde7b0]",
  booked:  "border-[#c7d2fe]",
  blocked: "border-[#f7d7d7]",
};

function SlotCard({
  slot,
  onBlock,
  onUnblock,
  onReleaseHold,
}: {
  slot: SlotRow;
  onBlock: (s: SlotRow) => void;
  onUnblock: (s: SlotRow) => void;
  onReleaseHold: (s: SlotRow) => void;
}) {
  const timeLabel = `${new Date(slot.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${new Date(slot.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

  return (
    <div className={`rounded-[16px] border bg-white p-3 shadow-[0_4px_12px_rgba(73,44,120,0.06)] ${CARD_BORDER[slot.state]}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[12px] font-semibold text-[#2a2346]">{timeLabel}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${STATE_CLS[slot.state]}`}>
          {slot.state}
        </span>
      </div>

      {slot.bookingId && (
        <div className="text-[11px] text-[#6b7280] mb-1">
          <span className="font-mono">{slot.bookingId.slice(0, 8)}</span>
          {slot.customerMasked && <span> · {slot.customerMasked}</span>}
        </div>
      )}

      {slot.blockedReason && (
        <div className="text-[11px] text-[#be123c] mb-1 truncate">{slot.blockedReason}</div>
      )}

      {slot.holdExpiresAt && (
        <div className="text-[11px] text-[#b45309] mb-1">
          Expires {new Date(slot.holdExpiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {slot.state !== "blocked" && slot.state !== "booked" && (
          <button
            type="button"
            onClick={() => onBlock(slot)}
            className="rounded-[8px] border border-[#f3d6d6] bg-[#fffafa] px-2.5 py-1 text-[11px] font-semibold text-[#c24134] hover:bg-[#fff1f2] transition-colors"
          >
            Block
          </button>
        )}
        {slot.state === "blocked" && (
          <button
            type="button"
            onClick={() => onUnblock(slot)}
            className="rounded-[8px] border border-[#ddd1fb] px-2.5 py-1 text-[11px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
          >
            Unblock
          </button>
        )}
        {slot.state === "held" && (
          <button
            type="button"
            onClick={() => onReleaseHold(slot)}
            className="rounded-[8px] border border-[#ece8f5] px-2.5 py-1 text-[11px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
          >
            Release
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminSlotsBoard({ rows, isLoading, error, onBlock, onUnblock, onReleaseHold }: Props) {
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

  // Group by team
  const teamMap = new Map<string, { teamName: string; slots: SlotRow[] }>();
  for (const row of rows) {
    if (!teamMap.has(row.teamId)) {
      teamMap.set(row.teamId, { teamName: row.teamName, slots: [] });
    }
    teamMap.get(row.teamId)!.slots.push(row);
  }

  if (teamMap.size === 0) {
    return (
      <div className="rounded-[22px] border border-[#ece5ff] bg-white p-8 text-center text-[14px] text-[#7c8499]">
        No slots found for this date and filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-5" style={{ minWidth: "max-content" }}>
        {Array.from(teamMap.entries()).map(([teamId, { teamName, slots }]) => {
          const byState = {
            free:    slots.filter((s) => s.state === "free"),
            held:    slots.filter((s) => s.state === "held"),
            booked:  slots.filter((s) => s.state === "booked"),
            blocked: slots.filter((s) => s.state === "blocked"),
          };

          return (
            <div key={teamId} className="w-64 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#2a2346]">{teamName}</span>
                <span className="rounded-full bg-[#f6f4fd] px-2.5 py-1 text-[11px] font-semibold text-[#6d5bd0]">
                  {slots.length}
                </span>
              </div>

              {(["free", "held", "booked", "blocked"] as const).map((state) => (
                byState[state].length > 0 && (
                  <div key={state} className="mb-3">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a90a6]">
                      {state} ({byState[state].length})
                    </div>
                    <div className="flex flex-col gap-2">
                      {byState[state].map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          onBlock={onBlock}
                          onUnblock={onUnblock}
                          onReleaseHold={onReleaseHold}
                        />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
