"use client";

type Tone = "default" | "warning" | "success" | "danger";

const TONE_CLS: Record<Tone, string> = {
  default: "border-[#ece5ff] bg-white",
  warning: "border-[#fde7b0] bg-[#fffaf0]",
  success: "border-[#d8f0df] bg-[#f7fff9]",
  danger:  "border-[#f7d7d7] bg-[#fff8f8]",
};

type AdminSummaryCardProps = {
  label: string;
  value: string | number;
  tone?: Tone;
};

export function AdminSummaryCard({ label, value, tone = "default" }: AdminSummaryCardProps) {
  return (
    <div className={`rounded-[18px] border p-4 ${TONE_CLS[tone]}`}>
      <div className="text-[12px] font-semibold text-[#8a90a6]">{label}</div>
      <div className="mt-1 text-[24px] font-black tracking-[-0.03em] text-[#1f1f2c]">{value}</div>
    </div>
  );
}
