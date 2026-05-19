"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import type {
  AnalyticsAction,
  AnalyticsBreakdownRow,
  AnalyticsPerformanceRow,
  PlatformCampaignRow,
  AnalyticsResponse,
} from "../types/analytics";

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

const priorityClass: Record<AnalyticsAction["priority"], string> = {
  high: "border-[#fecaca] bg-[#fff7f7] text-[#b42318]",
  medium: "border-[#fde7b0] bg-[#fffaf0] text-[#9a5b00]",
  low: "border-[#d8f0df] bg-[#f7fff9] text-[#166534]",
};

function MetricCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-[18px] border border-[#ece5ff] bg-white p-4 shadow-[0_12px_30px_rgba(73,44,120,0.04)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{label}</div>
      <div
        className={`mt-2 text-[24px] font-black ${
          tone === "down" ? "text-[#dc2626]" : tone === "up" ? "text-[#15803d]" : "text-[#1f1f2c]"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-[12px] leading-[1.4] text-[#6b7280]">{sub}</div> : null}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  color = "bg-[#6d5bd0]",
  helper,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  helper?: string;
}) {
  const width = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
        <span className="font-semibold text-[#2a2346]">{label}</span>
        <span className="text-[#1f1f2c]">{value}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#f3f0fb]">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      {helper ? <div className="mt-1 text-[11px] text-[#8a90a6]">{helper}</div> : null}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="mb-4">
        <h2 className="text-[16px] font-black text-[#1f1f2c]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12px] leading-[1.5] text-[#8a90a6]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ActionCard({ action, index }: { action: AnalyticsAction; index: number }) {
  return (
    <a
      href={action.href}
      className="group block rounded-[18px] border border-[#ece5ff] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#cfc4ff] hover:shadow-[0_16px_34px_rgba(73,44,120,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#f5f2ff] text-[13px] font-black text-[#6d5bd0]">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${priorityClass[action.priority]}`}>
                {action.priority}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{action.area}</span>
            </div>
            <h3 className="mt-2 text-[15px] font-black leading-[1.25] text-[#1f1f2c]">{action.title}</h3>
            <p className="mt-1 text-[12px] leading-[1.55] text-[#586174]">{action.finding}</p>
            <p className="mt-2 text-[12px] font-semibold leading-[1.55] text-[#2a2346]">{action.recommendedAction}</p>
            <div className="mt-2 text-[11px] text-[#8a90a6]">
              Impact: {action.impact} · Confidence: {action.confidence}
            </div>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#9ca3af] transition group-hover:translate-x-1 group-hover:text-[#6d5bd0]" />
      </div>
    </a>
  );
}

function BreakdownList({ rows, empty }: { rows: AnalyticsBreakdownRow[]; empty: string }) {
  if (!rows.length) return <div className="rounded-[14px] bg-[#f7f6fb] px-4 py-3 text-[12px] text-[#8a90a6]">{empty}</div>;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <ProgressRow
          key={row.label}
          label={row.label.replace(/_/g, " ")}
          value={row.count}
          max={max}
          helper={row.revenue > 0 ? inr(row.revenue) : undefined}
        />
      ))}
    </div>
  );
}

function PerformanceTable({ rows, kind }: { rows: AnalyticsPerformanceRow[]; kind: "city" | "service" }) {
  if (!rows.length) {
    return <div className="rounded-[14px] bg-[#f7f6fb] px-4 py-3 text-[12px] text-[#8a90a6]">No recent {kind} performance yet.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[12px]">
        <thead className="text-[10px] uppercase tracking-[0.08em] text-[#8a90a6]">
          <tr className="border-b border-[#ece5ff]">
            <th className="py-2 pr-3">{kind === "city" ? "City" : "Service"}</th>
            <th className="py-2 pr-3">Starts</th>
            <th className="py-2 pr-3">Confirmed</th>
            <th className="py-2 pr-3">Revenue</th>
            <th className="py-2 pr-3">Conv.</th>
            <th className="py-2 pr-3">Issue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#f1eefb] last:border-0">
              <td className="max-w-[180px] py-3 pr-3 font-bold text-[#1f1f2c]">{row.label}</td>
              <td className="py-3 pr-3 text-[#586174]">{row.bookings}</td>
              <td className="py-3 pr-3 text-[#586174]">{row.confirmedBookings}</td>
              <td className="py-3 pr-3 font-semibold text-[#1f1f2c]">{inr(row.revenue)}</td>
              <td className="py-3 pr-3 text-[#586174]">{pct(row.conversionRate)}</td>
              <td className={`py-3 pr-3 font-semibold ${row.issueRate > 0.05 ? "text-[#b42318]" : "text-[#15803d]"}`}>
                {pct(row.issueRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConnectionPill({
  label,
  status,
}: {
  label: string;
  status: AnalyticsResponse["marketing"]["platformRoi"]["meta"];
}) {
  const cls =
    status.status === "connected"
      ? "border-[#d8f0df] bg-[#f7fff9] text-[#166534]"
      : status.status === "error"
        ? "border-[#fecaca] bg-[#fff7f7] text-[#b42318]"
        : "border-[#fde7b0] bg-[#fffaf0] text-[#9a5b00]";
  return (
    <div className={`rounded-[14px] border px-3 py-2 ${cls}`}>
      <div className="text-[11px] font-black uppercase">{label}</div>
      <div className="mt-1 text-[11px] leading-[1.4]">{status.message}</div>
    </div>
  );
}

function MatchBadge({ value }: { value: PlatformCampaignRow["matchQuality"] }) {
  const cls =
    value === "strong"
      ? "bg-[#ecfdf3] text-[#166534]"
      : value === "partial"
        ? "bg-[#fff7ed] text-[#9a5b00]"
        : value === "weak"
          ? "bg-[#fff1f2] text-[#b42318]"
          : "bg-[#f3f4f6] text-[#6b7280]";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${cls}`}>{value}</span>;
}

function PlatformRoi({ data }: { data: AnalyticsResponse }) {
  const roi = data.marketing.platformRoi;
  return (
    <Section title="Paid Marketing ROI" subtitle={`${roi.periodLabel} platform spend beside internal booking outcomes.`}>
      <div className="grid gap-3 md:grid-cols-2">
        <ConnectionPill label="Meta Ads" status={roi.meta} />
        <ConnectionPill label="Google Ads" status={roi.google} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ad spend" value={inr(roi.spend)} />
        <MetricCard label="Clicks" value={roi.clicks.toLocaleString("en-IN")} sub={`${roi.impressions.toLocaleString("en-IN")} impressions`} />
        <MetricCard label="CPC / CPM" value={`${inr(roi.cpc)} / ${inr(roi.cpm)}`} />
        <MetricCard label="ROAS" value={`${roi.roas.toFixed(2)}x`} sub={`Internal matched ${inr(roi.internalAttributedRevenue)}`} />
      </div>

      {roi.campaigns.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.08em] text-[#8a90a6]">
              <tr className="border-b border-[#ece5ff]">
                <th className="py-2 pr-3">Platform</th>
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3">Spend</th>
                <th className="py-2 pr-3">CPC</th>
                <th className="py-2 pr-3">CTR</th>
                <th className="py-2 pr-3">Platform conv.</th>
                <th className="py-2 pr-3">Internal revenue</th>
                <th className="py-2 pr-3">Match</th>
              </tr>
            </thead>
            <tbody>
              {roi.campaigns.map((row) => (
                <tr key={`${row.platform}-${row.campaignId}`} className="border-b border-[#f1eefb] last:border-0">
                  <td className="py-3 pr-3 font-bold text-[#6d5bd0]">{row.platform}</td>
                  <td className="max-w-[260px] py-3 pr-3 font-bold text-[#1f1f2c]">{row.campaignName}</td>
                  <td className="py-3 pr-3 text-[#586174]">{inr(row.spend)}</td>
                  <td className="py-3 pr-3 text-[#586174]">{inr(row.cpc)}</td>
                  <td className="py-3 pr-3 text-[#586174]">{pct(row.ctr)}</td>
                  <td className="py-3 pr-3 text-[#586174]">{row.conversions.toFixed(1)}</td>
                  <td className="py-3 pr-3 font-semibold text-[#1f1f2c]">{inr(row.internalRevenue)}</td>
                  <td className="py-3 pr-3"><MatchBadge value={row.matchQuality} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-[16px] bg-[#f7f6fb] px-4 py-4 text-[13px] leading-[1.6] text-[#586174]">
          Platform ROI is ready, but API credentials are not configured yet. Once connected, this section will show spend, CPC,
          CPM, CTR, platform conversions, ROAS, and internal revenue matched by campaign name.
        </div>
      )}
    </Section>
  );
}

function AiReport({ data }: { data: AnalyticsResponse }) {
  if (!data.latestReport) {
    return (
      <Section title="AI Digest" subtitle="The scheduled digest will appear here after the next successful analytics cron run.">
        <div className="text-[13px] text-[#8a90a6]">No analysis reports yet.</div>
      </Section>
    );
  }

  return (
    <Section
      title={`AI Digest · ${data.latestReport.type}`}
      subtitle={`Generated ${new Date(data.latestReport.generatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`}
    >
      <div className="space-y-2 text-[13px] leading-[1.6] text-[#4b5563]">
        {data.latestReport.markdown.split("\n").map((line, i) => {
          if (line.startsWith("## ")) return <h3 key={i} className="pt-2 text-[15px] font-black text-[#1f1f2c]">{line.slice(3)}</h3>;
          if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-[#1f1f2c]">{line.slice(2, -2)}</p>;
          if (line.startsWith("- ")) return <p key={i} className="pl-3 before:mr-2 before:content-['•']">{line.slice(2)}</p>;
          if (!line.trim()) return null;
          return <p key={i}>{line}</p>;
        })}
      </div>
    </Section>
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
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
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

  if (isLoading) return <div className="p-8 text-[14px] text-[#7c8499]">Loading analytics...</div>;
  if (error || !data) return <div className="p-8 text-[14px] text-[#b42318]">{error || "Failed to load."}</div>;

  const bookingDelta = delta(data.acquisition.bookingsThisWeek, data.acquisition.bookingsLastWeek);
  const gmvDelta = delta(data.revenue.gmvThisWeek, data.revenue.gmvLastWeek);
  const funnelMax = Math.max(data.conversionFunnel.slotsHeld, 1);

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Analytics Command"
          subtitle="Booking truth, marketing signal quality, operating leakage, and AI-ranked next actions."
          onRefresh={() => void load(true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <div className="inline-flex items-center gap-2 rounded-[14px] border border-[#d8f0df] bg-[#f7fff9] px-3 py-2 text-[12px] font-bold text-[#166534]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Live booking data
            </div>
          }
        />

        <section className="mb-6 rounded-[26px] border border-[#ded7ff] bg-[#1f1f2c] p-5 text-white shadow-[0_18px_48px_rgba(31,31,44,0.16)]">
          <div className="grid gap-5 lg:grid-cols-[260px_1fr_260px] lg:items-center">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">Operating health</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[52px] font-black">{data.command.healthScore}</span>
                <span className="mb-2 text-[14px] font-bold text-white/60">/ 100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#c9c3ff]">
                <Brain className="h-4 w-4" />
                Decision engine
              </div>
              <h2 className="mt-2 text-[24px] font-black">{data.command.headline}</h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-[1.6] text-white/68">
                This score blends conversion leakage, payment recovery, attribution coverage, retention risk, dispatch issues, and SOP completion.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] bg-white/8 p-3">
                <div className="text-[11px] text-white/58">High priority</div>
                <div className="mt-1 text-[24px] font-black">{data.command.priorityCount}</div>
              </div>
              <div className="rounded-[18px] bg-white/8 p-3">
                <div className="text-[11px] text-white/58">Actions</div>
                <div className="mt-1 text-[24px] font-black">{data.command.actionQueue.length}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Bookings this week"
            value={data.acquisition.bookingsThisWeek}
            sub={bookingDelta ? `${bookingDelta.up ? "+" : "-"}${bookingDelta.value}% vs last week` : "No last-week baseline"}
            tone={bookingDelta ? (bookingDelta.up ? "up" : "down") : "neutral"}
          />
          <MetricCard
            label="GMV this week"
            value={inr(data.revenue.gmvThisWeek)}
            sub={gmvDelta ? `${gmvDelta.up ? "+" : "-"}${gmvDelta.value}% vs last week` : "No last-week baseline"}
            tone={gmvDelta ? (gmvDelta.up ? "up" : "down") : "neutral"}
          />
          <MetricCard label="Attribution coverage" value={pct(data.marketing.attributionCoverage)} sub="Recent bookings with UTM/gclid data" />
          <MetricCard
            label="Payment leakage"
            value={inr(data.paymentRecovery.failedOrExpiredValue)}
            sub={`${data.paymentRecovery.failedOrExpiredCount} failed or expired attempts`}
            tone={data.paymentRecovery.failedOrExpiredValue > 0 ? "down" : "up"}
          />
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Section title="Ranked Action Queue" subtitle="AI-ready actions generated from booking truth and marketing signal quality.">
            <div className="space-y-3">
              {data.command.actionQueue.length ? (
                data.command.actionQueue.map((action, index) => <ActionCard key={action.id} action={action} index={index} />)
              ) : (
                <div className="rounded-[18px] bg-[#f7f6fb] px-4 py-4 text-[13px] text-[#7c8499]">No urgent action detected from recent data.</div>
              )}
            </div>
          </Section>

          <Section title="Conversion Control" subtitle="Trailing 30-day booking path from intent to confirmation.">
            <div className="space-y-4">
              <ProgressRow label="Bookings initiated" value={data.conversionFunnel.slotsHeld} max={funnelMax} color="bg-[#c4b5fd]" />
              <ProgressRow label="Razorpay orders created" value={data.conversionFunnel.ordersCreated} max={funnelMax} color="bg-[#a78bfa]" />
              <ProgressRow label="Payments captured" value={data.conversionFunnel.paymentCaptured} max={funnelMax} color="bg-[#7c3aed]" />
              <ProgressRow label="Bookings confirmed" value={data.conversionFunnel.bookingsConfirmed} max={funnelMax} color="bg-[#6d5bd0]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Retryable" value={data.paymentRecovery.retryableCount} sub="Unpaid with Razorpay order" />
              <MetricCard label="Recovered" value={data.paymentRecovery.paidAfterFailureCount} sub="Paid after failed attempt" tone="up" />
              <MetricCard label="Drop-off rate" value={pct(data.paymentRecovery.dropOffRate)} tone={data.paymentRecovery.dropOffRate > 0.2 ? "down" : "neutral"} />
            </div>
          </Section>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <Section title="Marketing Signal" subtitle="Meta and Google are signal sources; paid/completed bookings remain the truth.">
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="Google" value={data.marketing.googleAttributedBookings} />
              <MetricCard label="Meta" value={data.marketing.metaAttributedBookings} />
              <MetricCard label="Unknown" value={data.marketing.directOrUnknownBookings} />
            </div>
            <div className="mt-4 space-y-2">
              {data.marketing.dataQualityNotes.map((note) => (
                <div key={note} className="rounded-[12px] bg-[#f7f6fb] px-3 py-2 text-[12px] leading-[1.5] text-[#586174]">
                  {note}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Top Sources" subtitle="Recent booking starts, ranked by paid revenue.">
            <BreakdownList rows={data.marketing.topSources} empty="No source data yet." />
          </Section>

          <Section title="Top Campaigns" subtitle="UTM campaign labels found in booking attribution.">
            <BreakdownList rows={data.marketing.topCampaigns} empty="No campaign labels captured yet." />
          </Section>
        </div>

        <div className="mb-6">
          <PlatformRoi data={data} />
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Section title="City Performance" subtitle="Where demand converts into confirmed revenue.">
            <PerformanceTable rows={data.cityPerformance} kind="city" />
          </Section>
          <Section title="Service Performance" subtitle="Package/service mix by revenue, conversion, and issue rate.">
            <PerformanceTable rows={data.servicePerformance} kind="service" />
          </Section>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Section title="Retention & Revenue Quality" subtitle="Repeat demand and payment mix.">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Repeat booking rate" value={pct(data.retention.repeatBookingRate)} sub="Customers with 2+ completed bookings" />
              <MetricCard label="At-risk customers" value={data.retention.atRiskCount} sub="45d+ since last visit" tone={data.retention.atRiskCount > 20 ? "down" : "neutral"} />
              <MetricCard label="Rebooked in 35 days" value={data.retention.rebookedWithin35Days} sub={`of ${data.retention.totalCompletedLast35Days} completed`} />
              <MetricCard label="Coupon usage" value={pct(data.revenue.couponUsageRate)} sub={`Avg discount ${inr(data.revenue.avgDiscount)}`} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricCard label="Online" value={data.revenue.paidCount} />
              <MetricCard label="Pay later" value={data.revenue.codCount} />
              <MetricCard label="Admin cash" value={data.revenue.cashCount} />
            </div>
          </Section>

          <Section title="Operations Leakage" subtitle="The hidden friction that can erase marketing gains.">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="SOP completion" value={pct(data.operations.sopCompletionRate)} tone={data.operations.sopCompletionRate < 0.9 ? "down" : "up"} />
              <MetricCard label="Dispatch issue rate" value={pct(data.operations.dispatchIssueRate)} tone={data.operations.dispatchIssueRate > 0.05 ? "down" : "neutral"} />
              <MetricCard label="Unassigned upcoming" value={data.operationsDeepDive.unassignedUpcoming} tone={data.operationsDeepDive.unassignedUpcoming > 0 ? "down" : "up"} />
              <MetricCard label="Missing addresses" value={data.operationsDeepDive.bookingsMissingAddress} tone={data.operationsDeepDive.bookingsMissingAddress > 0 ? "down" : "up"} />
            </div>
            <div className="mt-4">
              <BreakdownList rows={data.operationsDeepDive.topIssueCities} empty="No dispatch issue hotspots in the recent window." />
            </div>
          </Section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <AiReport data={data} />
          <Section title="What This Uses" subtitle="Current tracker ingredients, so the team knows what is truth versus signal.">
            <div className="space-y-3 text-[13px] leading-[1.6] text-[#586174]">
              <div className="flex gap-3">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#6d5bd0]" />
                <span>Booking and payment records are treated as business truth.</span>
              </div>
              <div className="flex gap-3">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#6d5bd0]" />
                <span>UTM, gclid, Meta, and Google signals explain where demand came from.</span>
              </div>
              <div className="flex gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#6d5bd0]" />
                <span>Payment failure and retryability identify revenue the team can still recover.</span>
              </div>
              <div className="flex gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#6d5bd0]" />
                <span>Retention and ops signals protect repeat revenue after acquisition.</span>
              </div>
              <div className="flex gap-3">
                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-[#6d5bd0]" />
                <span>The AI layer ranks actions and keeps the written digest as supporting context.</span>
              </div>
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
                <span>Platform-side spend, CPC, ROAS, and match quality still need Meta/Google dashboards until their APIs are connected.</span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {isRefreshing ? (
        <div className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-[14px] bg-[#1f1f2c] px-4 py-3 text-[12px] font-bold text-white shadow-[0_14px_34px_rgba(31,31,44,0.18)]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Refreshing analytics
        </div>
      ) : null}
    </div>
  );
}
