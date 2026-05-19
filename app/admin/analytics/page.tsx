"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import type { AnalyticsResponse } from "../types/analytics";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
function delta(current: number, previous: number) {
  if (previous === 0) return null;
  const d = ((current - previous) / previous) * 100;
  return { value: Math.abs(d).toFixed(1), up: d >= 0 };
}

function StatCard({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "up" | "down" | "neutral" }) {
  return (
    <div className="rounded-[18px] border border-[#ece5ff] bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{label}</div>
      <div className={`mt-2 text-[24px] font-black tracking-[-0.03em] ${tone === "down" ? "text-[#dc2626]" : tone === "up" ? "text-[#15803d]" : "text-[#1f1f2c]"}`}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-[12px] text-[#6b7280]">{sub}</div> : null}
    </div>
  );
}

function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pctWidth = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="text-[#2a2346]">{label}</span>
        <span className="font-semibold text-[#1f1f2c]">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#f3f0fb]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pctWidth}%` }} />
      </div>
      <div className="mt-0.5 text-right text-[11px] text-[#8a90a6]">{pctWidth}%</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load analytics");
      setData(json as AnalyticsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (isLoading) {
    return <div className="p-8 text-[14px] text-[#7c8499]">Loading analytics…</div>;
  }
  if (error || !data) {
    return <div className="p-8 text-[14px] text-[#b42318]">{error || "Failed to load."}</div>;
  }

  const bookingDelta = delta(data.acquisition.bookingsThisWeek, data.acquisition.bookingsLastWeek);
  const gmvDelta = delta(data.revenue.gmvThisWeek, data.revenue.gmvLastWeek);

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Analytics"
          subtitle="Internal metrics — bookings, revenue, conversion, retention."
          onRefresh={() => void load(true)}
          isRefreshing={isRefreshing}
        />

        {/* AI Report */}
        {data.latestReport ? (
          <section className="mb-6 rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">Claude Analysis · {data.latestReport.type}</div>
                <div className="mt-0.5 text-[12px] text-[#8a90a6]">
                  Generated {new Date(data.latestReport.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
            <div className="mt-4 prose prose-sm max-w-none text-[13px] leading-[1.6] text-[#2a2346] [&_strong]:font-bold [&_ul]:mt-2 [&_ul]:space-y-1 [&_li]:text-[#4b5563]">
              {data.latestReport.markdown.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h2 key={i} className="mt-3 text-[15px] font-black text-[#1f1f2c]">{line.slice(3)}</h2>;
                if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="mt-2 font-bold text-[#1f1f2c]">{line.slice(2, -2)}</p>;
                if (line.startsWith("- ")) return <p key={i} className="ml-3 text-[#4b5563] before:mr-2 before:content-['•']">{line.slice(2)}</p>;
                if (!line.trim()) return null;
                return <p key={i} className="mt-2 text-[#4b5563]">{line}</p>;
              })}
            </div>
          </section>
        ) : (
          <section className="mb-6 rounded-[22px] border border-[#ece5ff] bg-white p-5">
            <div className="text-[13px] text-[#8a90a6]">No analysis reports yet. The Claude digest runs daily at 9:00 AM.</div>
          </section>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Acquisition */}
          <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">Acquisition</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                label="Bookings this week"
                value={data.acquisition.bookingsThisWeek}
                sub={bookingDelta ? `${bookingDelta.up ? "+" : "-"}${bookingDelta.value}% vs last week` : undefined}
                tone={bookingDelta ? (bookingDelta.up ? "up" : "down") : "neutral"}
              />
              <StatCard
                label="New customers"
                value={data.acquisition.newCustomersThisWeek}
                sub={`${data.acquisition.newCustomersLastWeek} last week`}
              />
              <StatCard label="Bookings today" value={data.acquisition.bookingsToday} />
            </div>
            {data.acquisition.sourceBreakdown.length > 0 ? (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Source (this month)</div>
                <div className="space-y-1.5">
                  {data.acquisition.sourceBreakdown.map((row) => (
                    <div key={row.source} className="flex items-center justify-between rounded-[10px] bg-[#f7f6fb] px-3 py-2 text-[12px]">
                      <span className="text-[#2a2346] capitalize">{row.source.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-[#1f1f2c]">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* Conversion funnel */}
          <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">Conversion Funnel</h2>
            <div className="mt-1 text-[12px] text-[#8a90a6]">Trailing 30 days</div>
            <div className="mt-4 space-y-4">
              <FunnelBar label="Bookings initiated" count={data.conversionFunnel.slotsHeld} max={data.conversionFunnel.slotsHeld} color="bg-[#c4b5fd]" />
              <FunnelBar label="Razorpay order created" count={data.conversionFunnel.ordersCreated} max={data.conversionFunnel.slotsHeld} color="bg-[#a78bfa]" />
              <FunnelBar label="Payment captured" count={data.conversionFunnel.paymentCaptured} max={data.conversionFunnel.slotsHeld} color="bg-[#7c3aed]" />
              <FunnelBar label="Booking confirmed" count={data.conversionFunnel.bookingsConfirmed} max={data.conversionFunnel.slotsHeld} color="bg-[#6d5bd0]" />
            </div>
            {data.conversionFunnel.slotsHeld > 0 ? (
              <div className="mt-4 rounded-[14px] bg-[#f6f4fd] px-4 py-3 text-[13px]">
                <span className="font-semibold text-[#6d5bd0]">
                  {pct(data.conversionFunnel.bookingsConfirmed / data.conversionFunnel.slotsHeld)}
                </span>
                <span className="ml-1 text-[#7c8499]">end-to-end conversion</span>
              </div>
            ) : null}
          </section>

          {/* Revenue */}
          <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">Revenue</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                label="GMV this week"
                value={inr(data.revenue.gmvThisWeek)}
                sub={gmvDelta ? `${gmvDelta.up ? "+" : "-"}${gmvDelta.value}% vs last week` : undefined}
                tone={gmvDelta ? (gmvDelta.up ? "up" : "down") : "neutral"}
              />
              <StatCard label="GMV this month" value={inr(data.revenue.gmvThisMonth)} />
              <StatCard label="Avg booking value" value={inr(data.revenue.avgBookingValue)} />
              <StatCard label="Coupon usage" value={pct(data.revenue.couponUsageRate)} sub={`Avg discount ${inr(data.revenue.avgDiscount)}`} />
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Payment split (this month)</div>
              <div className="flex gap-2">
                {[
                  { label: "Online", count: data.revenue.paidCount, color: "bg-[#6d5bd0]" },
                  { label: "COD", count: data.revenue.codCount, color: "bg-[#d97706]" },
                  { label: "Cash", count: data.revenue.cashCount, color: "bg-[#15803d]" },
                ].map((item) => (
                  <div key={item.label} className="flex-1 rounded-[12px] bg-[#f7f6fb] px-3 py-2.5 text-center">
                    <div className={`mx-auto mb-1 h-2 w-8 rounded-full ${item.color}`} />
                    <div className="text-[16px] font-black text-[#1f1f2c]">{item.count}</div>
                    <div className="text-[11px] text-[#8a90a6]">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Retention + Ops */}
          <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">Retention & Operations</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                label="Repeat booking rate"
                value={pct(data.retention.repeatBookingRate)}
                sub="customers with 2+ bookings"
              />
              <StatCard
                label="At-risk customers"
                value={data.retention.atRiskCount}
                sub="45d+ since last visit"
                tone={data.retention.atRiskCount > 20 ? "down" : "neutral"}
              />
              <StatCard
                label="Rebooked in 35 days"
                value={data.retention.rebookedWithin35Days}
                sub={`of ${data.retention.totalCompletedLast35Days} completed`}
              />
              <StatCard
                label="SOP completion"
                value={pct(data.operations.sopCompletionRate)}
                tone={data.operations.sopCompletionRate < 0.9 ? "down" : "up"}
              />
              <StatCard
                label="Dispatch issue rate"
                value={pct(data.operations.dispatchIssueRate)}
                tone={data.operations.dispatchIssueRate > 0.05 ? "down" : "neutral"}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
