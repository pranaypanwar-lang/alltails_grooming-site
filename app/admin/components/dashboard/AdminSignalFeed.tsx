import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";
import type { DashboardSignal } from "../../types/dashboard";

type Props = {
  signals: DashboardSignal[];
};

const TONE = {
  danger: {
    wrapper: "border-[#fecaca] bg-[#fff5f5]",
    icon: "text-[#dc2626]",
    IconEl: AlertCircle,
    dot: "bg-[#dc2626]",
    text: "text-[#991b1b]",
    sub: "text-[#b91c1c]",
  },
  warning: {
    wrapper: "border-[#fde68a] bg-[#fffbeb]",
    icon: "text-[#d97706]",
    IconEl: AlertTriangle,
    dot: "bg-[#d97706]",
    text: "text-[#92400e]",
    sub: "text-[#78350f]",
  },
  default: {
    wrapper: "border-[#dbeafe] bg-[#eff6ff]",
    icon: "text-[#2563eb]",
    IconEl: Info,
    dot: "bg-[#2563eb]",
    text: "text-[#1e40af]",
    sub: "text-[#1d4ed8]",
  },
};

export function AdminSignalFeed({ signals }: Props) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#d1fae5] bg-[#f0fdf4] py-10 text-center">
        <div className="mb-2 text-[28px]">✓</div>
        <div className="text-[15px] font-bold text-[#15803d]">All clear</div>
        <div className="mt-1 text-[13px] text-[#6b7280]">No signals requiring attention right now</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signals.map((signal) => {
        const t = TONE[signal.tone];
        const { IconEl } = t;
        return (
          <Link
            key={signal.id}
            href={signal.href}
            className={`flex items-start gap-3 rounded-[16px] border p-3.5 transition-opacity hover:opacity-80 ${t.wrapper}`}
          >
            <IconEl className={`mt-0.5 h-4 w-4 shrink-0 ${t.icon}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-semibold leading-snug ${t.text}`}>
                {signal.title}
              </div>
              <div className={`mt-0.5 text-[12px] ${t.sub}`}>{signal.description}</div>
            </div>
            <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${t.icon}`} />
          </Link>
        );
      })}
    </div>
  );
}
