"use client";

import { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

type AdminPageHeaderProps = {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  rightSlot?: ReactNode;
};

export function AdminPageHeader({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  rightSlot,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-[28px] font-black tracking-[-0.03em] text-[#1f1f2c]">{title}</h1>
        <p className="mt-1 text-[14px] leading-[1.6] text-[#7c8499]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {rightSlot}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-[42px] items-center gap-2 rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] disabled:opacity-60 transition-opacity"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>
    </div>
  );
}
