"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Minus,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import type {
  AnalyticsAction,
  AnalyticsPeriod,
  AnalyticsPerformanceRow,
  CampaignVerdict,
  PlatformCampaignRow,
  AnalyticsResponse,
} from "../types/analytics";

// ── Formatters ────────────────────────────────────────────────────────────────

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

// ── Period Switcher ───────────────────────────────────────────────────────────

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

function PeriodSwitcher({
  period,
  onChange,
  loading,
}: {
  period: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[12px] border border-[#ece5ff] bg-white p-1 shadow-[0_2px_8px_rgba(73,44,120,0.06)]">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={loading}
          onClick={() => onChange(p.value)}
          className={`rounded-[9px] px-4 py-1.5 text-[13px] font-bold transition-colors ${
            period === p.value
              ? "bg-[#6d5bd0] text-white shadow-[0_2px_8px_rgba(109,91,208,0.3)]"
              : "text-[#6b7280] hover:text-[#2a2346]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Delta Badge ───────────────────────────────────────────────────────────────

function DeltaBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  const d = delta(current, previous);
  if (!d) return <span className="text-[11px] text-[#9ca3af]">No {label} baseline</span>;
  return (
    <span className={`flex items-center gap-0.5 text-[12px] font-bold ${d.up ? "text-[#15803d]" : "text-[#dc2626]"}`}>
      {d.up ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      {d.up ? "+" : "-"}{d.value}% vs {label}
    </span>
  );
}

// ── Pulse Card ────────────────────────────────────────────────────────────────

function PulseCard({
  label,
  value,
  current,
  previous,
  compLabel,
  format = "number",
}: {
  label: string;
  value: string | number;
  current: number;
  previous: number;
  compLabel: string;
  format?: "number" | "currency";
}) {
  return (
    <div className="rounded-[18px] border border-[#ece5ff] bg-white p-4 shadow-[0_8px_24px_rgba(73,44,120,0.05)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{label}</div>
      <div className="mt-2 text-[26px] font-black tracking-[-0.02em] text-[#1f1f2c]">{value}</div>
      <div className="mt-1.5">
        <DeltaBadge current={current} previous={previous} label={compLabel} />
      </div>
    </div>
  );
}

// ── Campaign Verdict Card ─────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<
  CampaignVerdict,
  { label: string; icon: React.ElementType; bg: string; border: string; badge: string; text: string }
> = {
  scale: {
    label: "SCALE",
    icon: TrendingUp,
    bg: "bg-[#f0fdf4]",
    border: "border-[#bbf7d0]",
    badge: "bg-[#dcfce7] text-[#166534]",
    text: "text-[#15803d]",
  },
  optimise: {
    label: "OPTIMISE",
    icon: Settings2,
    bg: "bg-[#fffbeb]",
    border: "border-[#fde68a]",
    badge: "bg-[#fef3c7] text-[#92400e]",
    text: "text-[#d97706]",
  },
  pause: {
    label: "PAUSE",
    icon: Pause,
    bg: "bg-[#fff1f2]",
    border: "border-[#fecdd3]",
    badge: "bg-[#fee2e2] text-[#991b1b]",
    text: "text-[#dc2626]",
  },
  monitor: {
    label: "MONITOR",
    icon: Play,
    bg: "bg-[#f8fafc]",
    border: "border-[#e2e8f0]",
    badge: "bg-[#f1f5f9] text-[#475569]",
    text: "text-[#64748b]",
  },
};

function CampaignCard({ row }: { row: PlatformCampaignRow }) {
  const cfg = VERDICT_CONFIG[row.verdict];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-[16px] border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${cfg.badge}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-[#6b7280]">
                {row.platform}
              </span>
            </div>
            <div className="mt-1.5 truncate text-[14px] font-black text-[#1f1f2c]">{row.campaignName}</div>
          </div>
        </div>
        {row.roas > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-[11px] text-[#9ca3af]">ROAS</div>
            <div className={`text-[17px] font-black ${cfg.text}`}>{row.roas.toFixed(1)}x</div>
          </div>
        )}
      </div>

      {/* Metrics strip */}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
        <span className="text-[#6b7280]">
          Spend <span className="font-bold text-[#1f1f2c]">{inr(row.spend)}</span>
        </span>
        <span className="text-[#6b7280]">
          CPC <span className="font-bold text-[#1f1f2c]">{row.cpc > 0 ? inr(row.cpc) : "—"}</span>
        </span>
        <span className="text-[#6b7280]">
          CTR <span className="font-bold text-[#1f1f2c]">{row.ctr > 0 ? pct(row.ctr) : "—"}</span>
        </span>
        {row.conversions > 0 && (
          <span className="text-[#6b7280]">
            Conv <span className="font-bold text-[#1f1f2c]">{row.conversions.toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* Recommendation */}
      <div className="mt-3 rounded-[10px] bg-white/60 px-3 py-2 text-[12px] leading-[1.5] text-[#374151]">
        {row.recommendation}
      </div>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────

const priorityBadge: Record<AnalyticsAction["priority"], string> = {
  high: "bg-[#fee2e2] text-[#991b1b]",
  medium: "bg-[#fef3c7] text-[#92400e]",
  low: "bg-[#dcfce7] text-[#166534]",
};

function ActionCard({ action, index }: { action: AnalyticsAction; index: number }) {
  return (
    <a
      href={action.href}
      className="group flex items-start gap-3 rounded-[16px] border border-[#ece5ff] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#cfc4ff] hover:shadow-[0_12px_28px_rgba(73,44,120,0.08)]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#f5f2ff] text-[12px] font-black text-[#6d5bd0]">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${priorityBadge[action.priority]}`}>
            {action.priority}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">{action.area}</span>
        </div>
        <div className="mt-1.5 text-[14px] font-black leading-[1.25] text-[#1f1f2c]">{action.title}</div>
        <div className="mt-1 text-[12px] leading-[1.5] text-[#586174]">{action.finding}</div>
        <div className="mt-1.5 text-[12px] font-semibold text-[#2a2346]">{action.recommendedAction}</div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#c4b5fd] transition group-hover:translate-x-0.5 group-hover:text-[#6d5bd0]" />
    </a>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-black text-[#1f1f2c]">{title}</h2>
          {subtitle && <p className="mt-1 text-[12px] leading-[1.5] text-[#8a90a6]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Platform tabs ─────────────────────────────────────────────────────────────

type CampaignTab = "all" | "Meta" | "Google";

function CampaignIntelligence({ data }: { data: AnalyticsResponse }) {
  const [tab, setTab] = useState<CampaignTab>("all");
  const campaigns = data.marketing.platformRoi.campaigns;
  const filtered = tab === "all" ? campaigns : campaigns.filter((c) => c.platform === tab);

  const metaConnected = data.marketing.platformRoi.meta.status === "connected";
  const googleConnected = data.marketing.platformRoi.google.status === "connected";

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const metaSpend = campaigns.filter((c) => c.platform === "Meta").reduce((s, c) => s + c.spend, 0);
  const googleSpend = campaigns.filter((c) => c.platform === "Google").reduce((s, c) => s + c.spend, 0);
  const scaleCampaigns = campaigns.filter((c) => c.verdict === "scale").length;
  const pauseCampaigns = campaigns.filter((c) => c.verdict === "pause").length;

  return (
    <Section
      title="Campaign Intelligence"
      subtitle={
        campaigns.length > 0
          ? `${campaigns.length} campaigns · ${inr(totalSpend)} total spend · ${scaleCampaigns} scaling · ${pauseCampaigns} to pause`
          : "Connect Meta and Google Ads to unlock campaign-level verdicts and recommendations"
      }
      action={
        campaigns.length > 0 ? (
          <div className="flex items-center gap-1 rounded-[10px] border border-[#ece5ff] p-0.5">
            {(["all", "Meta", "Google"] as CampaignTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-[8px] px-3 py-1 text-[12px] font-bold transition-colors ${
                  tab === t ? "bg-[#6d5bd0] text-white" : "text-[#6b7280] hover:text-[#2a2346]"
                }`}
              >
                {t === "all" ? "All" : t}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {/* Platform connection status */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {[
          { label: "Meta Ads", status: data.marketing.platformRoi.meta, spend: metaSpend },
          { label: "Google Ads", status: data.marketing.platformRoi.google, spend: googleSpend },
        ].map(({ label, status, spend }) => (
          <div
            key={label}
            className={`flex items-center justify-between rounded-[12px] border px-3 py-2.5 ${
              status.status === "connected"
                ? "border-[#bbf7d0] bg-[#f0fdf4]"
                : status.status === "error"
                  ? "border-[#fecdd3] bg-[#fff1f2]"
                  : "border-[#e2e8f0] bg-[#f8fafc]"
            }`}
          >
            <div>
              <div className={`text-[12px] font-black ${status.status === "connected" ? "text-[#166534]" : status.status === "error" ? "text-[#991b1b]" : "text-[#475569]"}`}>
                {label}
              </div>
              <div className="mt-0.5 text-[11px] text-[#6b7280]">{status.message}</div>
            </div>
            {status.status === "connected" && spend > 0 && (
              <div className="text-right">
                <div className="text-[11px] text-[#9ca3af]">spend</div>
                <div className="text-[13px] font-black text-[#166534]">{inr(spend)}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Meta vs Google comparison row */}
      {metaConnected && googleConnected && metaSpend > 0 && googleSpend > 0 && (
        <div className="mb-4 rounded-[12px] bg-[#f7f7fb] px-4 py-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Meta vs Google</div>
          <div className="grid grid-cols-2 gap-4 text-[12px]">
            <div>
              <div className="font-black text-[#1f1f2c]">Meta</div>
              <div className="mt-1 space-y-0.5 text-[#6b7280]">
                <div>Spend <span className="font-semibold text-[#1f1f2c]">{inr(metaSpend)}</span></div>
                {(() => {
                  const metaCampaigns = campaigns.filter((c) => c.platform === "Meta");
                  const avgRoas = metaCampaigns.length > 0 ? metaCampaigns.reduce((s, c) => s + c.roas, 0) / metaCampaigns.length : 0;
                  const avgCpc = metaCampaigns.length > 0 ? metaCampaigns.reduce((s, c) => s + c.cpc, 0) / metaCampaigns.length : 0;
                  return (
                    <>
                      <div>Avg ROAS <span className="font-semibold text-[#1f1f2c]">{avgRoas.toFixed(1)}x</span></div>
                      <div>Avg CPC <span className="font-semibold text-[#1f1f2c]">{avgCpc > 0 ? inr(avgCpc) : "—"}</span></div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div>
              <div className="font-black text-[#1f1f2c]">Google</div>
              <div className="mt-1 space-y-0.5 text-[#6b7280]">
                <div>Spend <span className="font-semibold text-[#1f1f2c]">{inr(googleSpend)}</span></div>
                {(() => {
                  const googleCampaigns = campaigns.filter((c) => c.platform === "Google");
                  const avgRoas = googleCampaigns.length > 0 ? googleCampaigns.reduce((s, c) => s + c.roas, 0) / googleCampaigns.length : 0;
                  const avgCpc = googleCampaigns.length > 0 ? googleCampaigns.reduce((s, c) => s + c.cpc, 0) / googleCampaigns.length : 0;
                  return (
                    <>
                      <div>Avg ROAS <span className="font-semibold text-[#1f1f2c]">{avgRoas.toFixed(1)}x</span></div>
                      <div>Avg CPC <span className="font-semibold text-[#1f1f2c]">{avgCpc > 0 ? inr(avgCpc) : "—"}</span></div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign cards */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((row) => (
            <CampaignCard key={`${row.platform}-${row.campaignId}`} row={row} />
          ))}
        </div>
      ) : campaigns.length > 0 ? (
        <div className="rounded-[14px] bg-[#f7f6fb] px-4 py-3 text-[13px] text-[#8a90a6]">
          No {tab} campaigns in this period.
        </div>
      ) : (
        <div className="rounded-[16px] bg-[#f7f6fb] px-5 py-5 text-[13px] leading-[1.7] text-[#586174]">
          <p className="font-bold text-[#2a2346]">How to connect:</p>
          <p>1. Set <code className="rounded bg-[#ece5ff] px-1 text-[12px] text-[#6d5bd0]">META_AD_ACCOUNT_ID</code> and <code className="rounded bg-[#ece5ff] px-1 text-[12px] text-[#6d5bd0]">META_MARKETING_ACCESS_TOKEN</code> in Vercel environment variables.</p>
          <p>2. Set <code className="rounded bg-[#ece5ff] px-1 text-[12px] text-[#6d5bd0]">GOOGLE_ADS_CUSTOMER_ID</code>, <code className="rounded bg-[#ece5ff] px-1 text-[12px] text-[#6d5bd0]">GOOGLE_ADS_DEVELOPER_TOKEN</code>, <code className="rounded bg-[#ece5ff] px-1 text-[12px] text-[#6d5bd0]">GOOGLE_ADS_CLIENT_ID</code>, <code className="rounded bg-[#ece5ff] px-1 text-[12px] text-[#6d5bd0]">GOOGLE_ADS_CLIENT_SECRET</code>, and <code className="rounded bg-[#ece5ff] px-1 text-[12px] text-[#6d5bd0]">GOOGLE_ADS_REFRESH_TOKEN</code>.</p>
          <p>3. Once connected, each campaign will show a Scale / Optimise / Pause verdict with a specific recommendation.</p>
        </div>
      )}

      {/* Attribution quality note */}
      {data.marketing.dataQualityNotes.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {data.marketing.dataQualityNotes.map((note) => (
            <div key={note} className="flex items-start gap-2 rounded-[10px] bg-[#f7f6fb] px-3 py-2 text-[11px] leading-[1.5] text-[#586174]">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[#d97706]" />
              {note}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Conversion Funnel ─────────────────────────────────────────────────────────

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  const dropPct = max > 0 && value < max ? Math.round(((max - value) / max) * 100) : null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[#2a2346]">{label}</span>
        <span className="font-black text-[#1f1f2c]">{value.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#f3f0fb]">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      {dropPct !== null && (
        <div className="mt-0.5 text-[10px] text-[#9ca3af]">
          {dropPct}% dropped from previous step
        </div>
      )}
    </div>
  );
}

// ── Performance Table ─────────────────────────────────────────────────────────

function PerformanceTable({ rows, kind }: { rows: AnalyticsPerformanceRow[]; kind: "city" | "service" }) {
  if (!rows.length) {
    return <div className="rounded-[14px] bg-[#f7f6fb] px-4 py-3 text-[12px] text-[#8a90a6]">No {kind} data yet.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[12px]">
        <thead className="text-[10px] uppercase tracking-[0.08em] text-[#8a90a6]">
          <tr className="border-b border-[#ece5ff]">
            <th className="py-2 pr-4">{kind === "city" ? "City" : "Service"}</th>
            <th className="py-2 pr-4">Revenue</th>
            <th className="py-2 pr-4">Conv.</th>
            <th className="py-2 pr-4">Issues</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#f1eefb] last:border-0">
              <td className="py-2.5 pr-4 font-bold text-[#1f1f2c]">{row.label}</td>
              <td className="py-2.5 pr-4 font-semibold text-[#1f1f2c]">{inr(row.revenue)}</td>
              <td className={`py-2.5 pr-4 font-semibold ${row.conversionRate < 0.5 ? "text-[#d97706]" : "text-[#15803d]"}`}>
                {pct(row.conversionRate)}
              </td>
              <td className={`py-2.5 pr-4 font-semibold ${row.issueRate > 0.05 ? "text-[#dc2626]" : "text-[#9ca3af]"}`}>
                {pct(row.issueRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (p: AnalyticsPeriod, silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`, { cache: "no-store" });
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

  useEffect(() => { void load(period); }, [load, period]);

  const handlePeriodChange = (p: AnalyticsPeriod) => {
    setPeriod(p);
    setData(null);
    setIsLoading(true);
  };

  if (error) {
    return <div className="p-8 text-[14px] text-[#b42318]">{error}</div>;
  }

  const pm = data?.periodMeta;
  const compLabel = pm?.comparisonLabel ?? "last period";

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-black tracking-[-0.03em] text-[#1f1f2c]">Analytics Command</h1>
            <p className="mt-1 text-[13px] text-[#9ca3af]">Booking truth, campaign intelligence, and ranked actions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSwitcher period={period} onChange={handlePeriodChange} loading={isLoading} />
            <button
              type="button"
              onClick={() => void load(period, true)}
              disabled={isLoading || isRefreshing}
              className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#ddd1fb] px-3 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Hero — Operating Health */}
        {isLoading ? (
          <div className="mb-6 h-[120px] animate-pulse rounded-[26px] bg-[#1f1f2c]/10" />
        ) : data ? (
          <section className="mb-6 rounded-[26px] border border-[#ded7ff] bg-[#1f1f2c] p-5 text-white shadow-[0_18px_48px_rgba(31,31,44,0.18)]">
            <div className="grid gap-5 lg:grid-cols-[220px_1fr_auto] lg:items-center">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">Operating Health</div>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-[54px] font-black leading-none">{data.command.healthScore}</span>
                  <span className="mb-1.5 text-[16px] font-bold text-white/40">/ 100</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#c9c3ff]">
                  <Brain className="h-3.5 w-3.5" />
                  Decision Engine · {pm?.label ?? "this week"}
                </div>
                <h2 className="mt-2 text-[22px] font-black leading-[1.2]">{data.command.headline}</h2>
                {data.command.actionQueue.length > 0 && (
                  <p className="mt-2 text-[12px] leading-[1.6] text-white/55">
                    {data.command.actionQueue.filter(a => a.priority === "high").length} high priority ·{" "}
                    {data.command.actionQueue.length} total actions queued
                  </p>
                )}
              </div>
              <div className="flex gap-3 lg:flex-col">
                <div className="rounded-[16px] bg-white/8 px-4 py-3 text-center">
                  <div className="text-[11px] text-white/50">Bookings</div>
                  <div className="mt-1 text-[22px] font-black">{pm?.bookingsCurrent ?? "—"}</div>
                  {pm && pm.bookingsPrevious > 0 && (() => {
                    const d = delta(pm.bookingsCurrent, pm.bookingsPrevious);
                    return d ? (
                      <div className={`flex items-center justify-center gap-0.5 text-[10px] font-bold ${d.up ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                        {d.up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {d.up ? "+" : "-"}{d.value}%
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="rounded-[16px] bg-white/8 px-4 py-3 text-center">
                  <div className="text-[11px] text-white/50">Revenue</div>
                  <div className="mt-1 text-[18px] font-black">{pm ? inr(pm.gmvCurrent) : "—"}</div>
                  {pm && pm.gmvPrevious > 0 && (() => {
                    const d = delta(pm.gmvCurrent, pm.gmvPrevious);
                    return d ? (
                      <div className={`flex items-center justify-center gap-0.5 text-[10px] font-bold ${d.up ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                        {d.up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {d.up ? "+" : "-"}{d.value}%
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Pulse metrics */}
        {isLoading ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0,1,2,3].map((i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-[18px] bg-[#ece5ff]/50" />
            ))}
          </div>
        ) : data && pm ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PulseCard
              label="Bookings"
              value={pm.bookingsCurrent}
              current={pm.bookingsCurrent}
              previous={pm.bookingsPrevious}
              compLabel={compLabel}
            />
            <PulseCard
              label="Revenue"
              value={inr(pm.gmvCurrent)}
              current={pm.gmvCurrent}
              previous={pm.gmvPrevious}
              compLabel={compLabel}
              format="currency"
            />
            <PulseCard
              label="New Customers"
              value={pm.newCustomersCurrent}
              current={pm.newCustomersCurrent}
              previous={pm.newCustomersPrevious}
              compLabel={compLabel}
            />
            <div className="rounded-[18px] border border-[#ece5ff] bg-white p-4 shadow-[0_8px_24px_rgba(73,44,120,0.05)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Attribution</div>
              <div className="mt-2 text-[26px] font-black tracking-[-0.02em] text-[#1f1f2c]">
                {pct(data.marketing.attributionCoverage)}
              </div>
              <div className={`mt-1.5 flex items-center gap-1 text-[12px] font-bold ${
                data.marketing.attributionCoverage < 0.65 ? "text-[#d97706]" : "text-[#15803d]"
              }`}>
                {data.marketing.attributionCoverage < 0.65
                  ? <><AlertTriangle className="h-3.5 w-3.5" /> Low — UTM hygiene needed</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> Good coverage</>
                }
              </div>
            </div>
          </div>
        ) : null}

        {/* Main 2-column grid */}
        {data ? (
          <>
            <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_380px]">
              {/* Left: Campaign Intelligence */}
              <CampaignIntelligence data={data} />

              {/* Right: Ranked Actions */}
              <Section
                title="Ranked Actions"
                subtitle={
                  data.command.actionQueue.length > 0
                    ? `${data.command.actionQueue.length} item${data.command.actionQueue.length !== 1 ? "s" : ""} — highest impact first`
                    : "No urgent actions detected"
                }
              >
                <div className="space-y-3">
                  {data.command.actionQueue.length > 0 ? (
                    data.command.actionQueue.map((action, i) => (
                      <ActionCard key={action.id} action={action} index={i} />
                    ))
                  ) : (
                    <div className="flex items-center gap-3 rounded-[16px] bg-[#f0fdf4] px-4 py-4 text-[13px] font-semibold text-[#166534]">
                      <CheckCircle2 className="h-5 w-5" />
                      Business is running clean — no urgent actions right now.
                    </div>
                  )}
                </div>
              </Section>
            </div>

            {/* Conversion Funnel */}
            <div className="mb-6 grid gap-6 xl:grid-cols-2">
              <Section title="Conversion Funnel" subtitle="Trailing 30 days — booking intent to confirmed revenue">
                <div className="space-y-4">
                  <FunnelBar label="Bookings initiated" value={data.conversionFunnel.slotsHeld} max={data.conversionFunnel.slotsHeld} color="bg-[#c4b5fd]" />
                  <FunnelBar label="Razorpay orders created" value={data.conversionFunnel.ordersCreated} max={data.conversionFunnel.slotsHeld} color="bg-[#a78bfa]" />
                  <FunnelBar label="Payments captured" value={data.conversionFunnel.paymentCaptured} max={data.conversionFunnel.slotsHeld} color="bg-[#7c3aed]" />
                  <FunnelBar label="Bookings confirmed" value={data.conversionFunnel.bookingsConfirmed} max={data.conversionFunnel.slotsHeld} color="bg-[#6d5bd0]" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-[12px] bg-[#f7f6fb] py-3">
                    <div className="text-[11px] text-[#9ca3af]">Retryable</div>
                    <div className="mt-1 text-[18px] font-black text-[#1f1f2c]">{data.paymentRecovery.retryableCount}</div>
                  </div>
                  <div className="rounded-[12px] bg-[#f0fdf4] py-3">
                    <div className="text-[11px] text-[#9ca3af]">Recovered</div>
                    <div className="mt-1 text-[18px] font-black text-[#15803d]">{data.paymentRecovery.paidAfterFailureCount}</div>
                  </div>
                  <div className={`rounded-[12px] py-3 ${data.paymentRecovery.dropOffRate > 0.2 ? "bg-[#fff1f2]" : "bg-[#f7f6fb]"}`}>
                    <div className="text-[11px] text-[#9ca3af]">Drop-off</div>
                    <div className={`mt-1 text-[18px] font-black ${data.paymentRecovery.dropOffRate > 0.2 ? "text-[#dc2626]" : "text-[#1f1f2c]"}`}>
                      {pct(data.paymentRecovery.dropOffRate)}
                    </div>
                  </div>
                </div>
                {data.paymentRecovery.failedOrExpiredValue > 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-[#fecdd3] bg-[#fff1f2] px-3 py-2.5 text-[12px]">
                    <Zap className="h-4 w-4 shrink-0 text-[#dc2626]" />
                    <span className="font-bold text-[#991b1b]">{inr(data.paymentRecovery.failedOrExpiredValue)}</span>
                    <span className="text-[#6b7280]">sitting in failed or expired payments — call or WhatsApp these customers first.</span>
                  </div>
                )}
              </Section>

              {/* Retention */}
              <Section title="Retention & Loyalty" subtitle="Repeat revenue health">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] border border-[#ece5ff] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Repeat rate</div>
                    <div className="mt-1.5 text-[22px] font-black text-[#1f1f2c]">{pct(data.retention.repeatBookingRate)}</div>
                    <div className="mt-0.5 text-[11px] text-[#9ca3af]">Customers with 2+ completed visits</div>
                  </div>
                  <div className={`rounded-[14px] border p-3 ${data.retention.atRiskCount > 20 ? "border-[#fecdd3] bg-[#fff1f2]" : "border-[#ece5ff]"}`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">At-risk</div>
                    <div className={`mt-1.5 text-[22px] font-black ${data.retention.atRiskCount > 20 ? "text-[#dc2626]" : "text-[#1f1f2c]"}`}>
                      {data.retention.atRiskCount}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#9ca3af]">45+ days since last visit</div>
                  </div>
                  <div className="rounded-[14px] border border-[#ece5ff] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Rebooked 35d</div>
                    <div className="mt-1.5 text-[22px] font-black text-[#1f1f2c]">{data.retention.rebookedWithin35Days}</div>
                    <div className="mt-0.5 text-[11px] text-[#9ca3af]">of {data.retention.totalCompletedLast35Days} completed</div>
                  </div>
                  <div className="rounded-[14px] border border-[#ece5ff] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Coupon usage</div>
                    <div className="mt-1.5 text-[22px] font-black text-[#1f1f2c]">{pct(data.revenue.couponUsageRate)}</div>
                    <div className="mt-0.5 text-[11px] text-[#9ca3af]">Avg discount {inr(data.revenue.avgDiscount)}</div>
                  </div>
                </div>
                {data.retention.atRiskCount > 0 && (
                  <a
                    href="/admin/customers"
                    className="mt-3 flex items-center justify-between rounded-[12px] border border-[#ece5ff] bg-[#f5f2ff] px-3 py-2.5 text-[12px] transition hover:border-[#cfc4ff]"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-[#6d5bd0]" />
                      <span className="font-semibold text-[#2a2346]">
                        {data.retention.atRiskCount} customers due for rebooking outreach
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#6d5bd0]" />
                  </a>
                )}
              </Section>
            </div>

            {/* City & Service */}
            <div className="mb-6 grid gap-6 xl:grid-cols-2">
              <Section title="City Performance" subtitle="Trailing 30 days — where demand converts">
                <PerformanceTable rows={data.cityPerformance} kind="city" />
              </Section>
              <Section title="Service Performance" subtitle="Package mix — revenue, conversion, and issue rate">
                <PerformanceTable rows={data.servicePerformance} kind="service" />
              </Section>
            </div>

            {/* Operations + Payment mix */}
            <div className="mb-6 grid gap-6 xl:grid-cols-2">
              <Section title="Operations" subtitle="Dispatch quality and SOP completion">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-[14px] border p-3 ${data.operations.sopCompletionRate < 0.9 ? "border-[#fde68a] bg-[#fffbeb]" : "border-[#ece5ff]"}`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">SOP completion</div>
                    <div className={`mt-1.5 text-[22px] font-black ${data.operations.sopCompletionRate < 0.9 ? "text-[#d97706]" : "text-[#15803d]"}`}>
                      {pct(data.operations.sopCompletionRate)}
                    </div>
                  </div>
                  <div className={`rounded-[14px] border p-3 ${data.operations.dispatchIssueRate > 0.05 ? "border-[#fecdd3] bg-[#fff1f2]" : "border-[#ece5ff]"}`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Issue rate</div>
                    <div className={`mt-1.5 text-[22px] font-black ${data.operations.dispatchIssueRate > 0.05 ? "text-[#dc2626]" : "text-[#15803d]"}`}>
                      {pct(data.operations.dispatchIssueRate)}
                    </div>
                  </div>
                  <div className={`rounded-[14px] border p-3 ${data.operationsDeepDive.unassignedUpcoming > 0 ? "border-[#fde68a] bg-[#fffbeb]" : "border-[#ece5ff]"}`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Unassigned</div>
                    <div className={`mt-1.5 text-[22px] font-black ${data.operationsDeepDive.unassignedUpcoming > 0 ? "text-[#d97706]" : "text-[#1f1f2c]"}`}>
                      {data.operationsDeepDive.unassignedUpcoming}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#9ca3af]">Upcoming bookings</div>
                  </div>
                  <div className={`rounded-[14px] border p-3 ${data.operationsDeepDive.bookingsMissingAddress > 0 ? "border-[#fde68a] bg-[#fffbeb]" : "border-[#ece5ff]"}`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Missing address</div>
                    <div className={`mt-1.5 text-[22px] font-black ${data.operationsDeepDive.bookingsMissingAddress > 0 ? "text-[#d97706]" : "text-[#1f1f2c]"}`}>
                      {data.operationsDeepDive.bookingsMissingAddress}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#9ca3af]">Active bookings</div>
                  </div>
                </div>
                {data.operationsDeepDive.topIssueCities.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Issue hotspots</div>
                    <div className="space-y-1.5">
                      {data.operationsDeepDive.topIssueCities.map((city) => (
                        <div key={city.label} className="flex items-center justify-between rounded-[10px] bg-[#fff1f2] px-3 py-2 text-[12px]">
                          <span className="font-semibold text-[#991b1b]">{city.label}</span>
                          <span className="font-black text-[#dc2626]">{city.count} issues</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Revenue Mix" subtitle="This month — payment method breakdown">
                <div className="space-y-3">
                  {[
                    { label: "Online (pay now)", count: data.revenue.paidCount, color: "bg-[#6d5bd0]" },
                    { label: "Pay after service", count: data.revenue.codCount, color: "bg-[#3b82f6]" },
                    { label: "Admin cash", count: data.revenue.cashCount, color: "bg-[#059669]" },
                  ].map(({ label, count, color }) => {
                    const total = data.revenue.paidCount + data.revenue.codCount + data.revenue.cashCount;
                    const w = total > 0 ? Math.max(3, Math.round((count / total) * 100)) : 0;
                    return (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-[12px]">
                          <span className="font-semibold text-[#2a2346]">{label}</span>
                          <span className="font-black text-[#1f1f2c]">{count}</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-[#f3f0fb]">
                          <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] border border-[#ece5ff] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Avg booking</div>
                    <div className="mt-1.5 text-[20px] font-black text-[#1f1f2c]">{inr(data.revenue.avgBookingValue)}</div>
                  </div>
                  <div className="rounded-[14px] border border-[#ece5ff] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a90a6]">Month GMV</div>
                    <div className="mt-1.5 text-[20px] font-black text-[#1f1f2c]">{inr(data.revenue.gmvThisMonth)}</div>
                  </div>
                </div>
              </Section>
            </div>

            {/* AI Digest */}
            {data.latestReport && (
              <div className="mb-6 rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
                <h2 className="mb-1 text-[16px] font-black text-[#1f1f2c]">AI Digest · {data.latestReport.type}</h2>
                <p className="mb-4 text-[12px] text-[#8a90a6]">
                  Generated {new Date(data.latestReport.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div className="space-y-2 text-[13px] leading-[1.6] text-[#4b5563]">
                  {data.latestReport.markdown.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) return <h3 key={i} className="pt-2 text-[15px] font-black text-[#1f1f2c]">{line.slice(3)}</h3>;
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-[#1f1f2c]">{line.slice(2, -2)}</p>;
                    if (line.startsWith("- ")) return <p key={i} className="pl-3 before:mr-2 before:content-['•']">{line.slice(2)}</p>;
                    if (!line.trim()) return null;
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </div>
            )}
          </>
        ) : isLoading ? (
          <div className="space-y-4">
            {[200, 160, 140].map((h, i) => (
              <div key={i} className={`h-[${h}px] animate-pulse rounded-[22px] bg-[#ece5ff]/40`} />
            ))}
          </div>
        ) : null}

      </div>

      {isRefreshing && (
        <div className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-[14px] bg-[#1f1f2c] px-4 py-3 text-[12px] font-bold text-white shadow-[0_14px_34px_rgba(31,31,44,0.18)]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Refreshing analytics
        </div>
      )}
    </div>
  );
}
