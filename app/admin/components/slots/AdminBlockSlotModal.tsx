"use client";

type SlotRef = {
  id: string;
  teamName: string;
  startTime: string;
  endTime: string;
};

type Props = {
  isOpen: boolean;
  slot: SlotRef | null;
  reason: string;
  isSubmitting: boolean;
  onClose: () => void;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
};

export function AdminBlockSlotModal({ isOpen, slot, reason, isSubmitting, onClose, onReasonChange, onSubmit }: Props) {
  if (!isOpen || !slot) return null;

  const timeLabel = `${new Date(slot.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${new Date(slot.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[460px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">Block slot</div>
        <div className="mt-1 text-[13px] text-[#7c8499]">{slot.teamName} · {timeLabel}</div>

        <div className="mt-4 rounded-[14px] border border-[#f7d7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
          Blocking this slot prevents it from being used for new bookings.
        </div>

        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          placeholder="Reason for blocking this slot"
          className="mt-4 w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none focus:border-[#6d5bd0] resize-none"
        />

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
            disabled={!reason.trim() || isSubmitting}
            className="rounded-[12px] bg-[#c24134] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 hover:bg-[#a83228] transition-colors"
          >
            {isSubmitting ? "Blocking…" : "Confirm block"}
          </button>
        </div>
      </div>
    </div>
  );
}
