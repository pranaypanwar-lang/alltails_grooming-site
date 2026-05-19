"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Send, ListTodo, Radar } from "lucide-react";
import { AdminPageHeader } from "./components/common/AdminPageHeader";
import { AdminSummaryCard } from "./components/common/AdminSummaryCard";
import { AdminSignalFeed } from "./components/dashboard/AdminSignalFeed";
import { AdminDailyTimeline } from "./components/dashboard/AdminDailyTimeline";
import { AdminCashPositionTable } from "./components/dashboard/AdminCashPositionTable";
import { AdminRevenueTracker } from "./components/dashboard/AdminRevenueTracker";
import type { DashboardResponse } from "./types/dashboard";

const QUICK_LINKS = [
  { label: "New Booking", icon: PlusCircle, href: "/admin/bookings/new", color: "text-[#6d5bd0]", bg: "bg-[#f6f4fd] hover:bg-[#ede9fe]" },
  { label: "Send Digest", icon: Send, href: "/admin/dispatch", color: "text-[#0891b2]", bg: "bg-[#ecfeff] hover:bg-[#cffafe]" },
  { label: "Process Queue", icon: ListTodo, href: "/admin/messages", color: "text-[#059669]", bg: "bg-[#f0fdf4] hover:bg-[#d1fae5]" },
  { label: "Scan Signals", icon: Radar, href: "/admin/support", color: "text-[#d97706]", bg: "bg-[#fffbeb] hover:bg-[#fef3c7]" },
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } catch {
      setError("Could not load dashboard data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Command Center"
          subtitle={today}
          onRefresh={() => void load(true)}
          isRefreshing={isRefreshing}
        />

        {/* Pulse stats */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-[18px] bg-[#ece5ff]/50" />
            ))}
          </div>
        ) : data ? (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <AdminSummaryCard label="Confirmed" value={data.pulse.confirmed} />
            <AdminSummaryCard label="En Route" value={data.pulse.enRoute} tone="warning" />
            <AdminSummaryCard label="In Progress" value={data.pulse.started} tone="warning" />
            <AdminSummaryCard label="Completed Today" value={data.pulse.completed} tone="success" />
            <AdminSummaryCard label="Issues" value={data.pulse.issues} tone={data.pulse.issues > 0 ? "danger" : "default"} />
            <AdminSummaryCard label="Pending Payment" value={data.pulse.pendingPayment} tone={data.pulse.pendingPayment > 0 ? "warning" : "default"} />
          </div>
        ) : null}

        {error && (
          <div className="mt-4 rounded-[14px] border border-[#f7d7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
            {error}
          </div>
        )}

        {/* Revenue Tracker — always mounted, self-fetching */}
        <div className="mt-6">
          <AdminRevenueTracker />
        </div>

        {/* Main grid */}
        {data && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Signal feed */}
              <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">
                      Signals
                    </div>
                    <div className="text-[12px] text-[#9ca3af]">
                      {data.signals.length === 0 ? "Nothing needs attention" : `${data.signals.length} item${data.signals.length > 1 ? "s" : ""} require attention`}
                    </div>
                  </div>
                  {data.signals.filter((s) => s.tone === "danger").length > 0 && (
                    <span className="rounded-full bg-[#fee2e2] px-2.5 py-0.5 text-[11px] font-bold text-[#dc2626]">
                      {data.signals.filter((s) => s.tone === "danger").length} critical
                    </span>
                  )}
                </div>
                <AdminSignalFeed signals={data.signals} />
              </div>

              {/* Today's timeline */}
              <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
                <div className="mb-4">
                  <div className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">
                    Today&apos;s Schedule
                  </div>
                  <div className="text-[12px] text-[#9ca3af]">
                    Bookings by hour — {data.todayTimeline.reduce((s, d) => s + d.count, 0)} total today
                  </div>
                </div>
                {data.todayTimeline.every((d) => d.count === 0) ? (
                  <div className="py-6 text-center text-[13px] text-[#9ca3af]">No bookings scheduled today</div>
                ) : (
                  <AdminDailyTimeline data={data.todayTimeline} />
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Cash position */}
              <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
                <div className="mb-4">
                  <div className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">
                    Cash Position
                  </div>
                  <div className="text-[12px] text-[#9ca3af]">Groomers currently holding cash</div>
                </div>
                <AdminCashPositionTable rows={data.cashPosition} />
              </div>

              {/* Quick links */}
              <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
                <div className="mb-4 text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">
                  Quick Actions
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_LINKS.map(({ label, icon: Icon, href, color, bg }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 rounded-[14px] px-3 py-3 text-[13px] font-semibold transition-colors ${color} ${bg}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
