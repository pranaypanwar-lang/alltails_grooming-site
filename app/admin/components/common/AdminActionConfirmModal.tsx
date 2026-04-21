"use client";

type Tone = "default" | "warning" | "danger" | "success";

const TONE_CLS: Record<Tone, { confirm: string; border: string; bg: string }> = {
  default: { confirm: "bg-[#6d5bd0] text-white hover:bg-[#5b4ab5]", border: "border-[#ece5ff]", bg: "" },
  warning: { confirm: "bg-[#b45309] text-white hover:bg-[#92400e]", border: "border-[#fde7b0]", bg: "bg-[#fffaf0]" },
  danger:  { confirm: "bg-[#c24134] text-white hover:bg-[#a83228]", border: "border-[#f7d7d7]", bg: "bg-[#fff8f8]" },
  success: { confirm: "bg-[#15803d] text-white hover:bg-[#166534]", border: "border-[#d8f0df]", bg: "bg-[#f7fff9]" },
};

type Props = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  tone?: Tone;
  message?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reason?: string;
  requireReason?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onReasonChange?: (value: string) => void;
  onSubmit: () => void;
};

export function AdminActionConfirmModal({
  isOpen,
  title,
  subtitle,
  tone = "default",
  message,
  reasonLabel,
  reasonPlaceholder,
  reason = "",
  requireReason = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isSubmitting,
  onClose,
  onReasonChange,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  const cls = TONE_CLS[tone];
  const canSubmit = !isSubmitting && (!requireReason || reason.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">{title}</div>
        {subtitle && <div className="mt-1 text-[13px] text-[#7c8499]">{subtitle}</div>}

        {message && (
          <div className={`mt-4 rounded-[14px] border px-4 py-3 text-[13px] leading-[1.6] ${cls.border} ${cls.bg || "bg-white"}`}>
            {message}
          </div>
        )}

        {onReasonChange && (
          <div className="mt-4">
            {reasonLabel && (
              <label className="mb-1.5 block text-[12px] font-semibold text-[#6b7280]">
                {reasonLabel}{requireReason && <span className="ml-1 text-[#c24134]">*</span>}
              </label>
            )}
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              placeholder={reasonPlaceholder ?? "Add a note"}
              className="w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none focus:border-[#6d5bd0] resize-none"
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`rounded-[12px] px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50 ${cls.confirm}`}
          >
            {isSubmitting ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
