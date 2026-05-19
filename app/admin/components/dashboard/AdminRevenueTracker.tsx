"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, IndianRupee, Wallet, Banknote } from "lucide-react";

type RevenueSnapshot = {
  total: number;
  online: number;
  cash: number;
  bookingCount: number;
};

type CashGroomer = {
  id: string;
  name: string;
  team: string | null;
  held: number;
  daysSince: number | null;
};

type RevenueResponse = {
  from: string;
  to: string;
  lastWeekFrom: string;
  lastWeekTo: string;
  current: RevenueSnapshot;
  lastWeek: RevenueSnapshot;
  cashHeld: CashGroomer[];
};

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-bold text-[#15803d]">
        <TrendingUp className="h-3 w-3" />
        New vs last {label}
      </div>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#6b7280]">
        <Minus className="h-3 w-3" />
        Same as last {label}
      </div>
    );
  }
  const up = pct > 0;
  return (
    <div className={`flex items-center gap-1 text-[11px] font-bold ${up ? "text-[#15803d]" : "text-[#dc2626]"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct}% vs last {label}
    </div>
  );
}

type Mode = "single" | "range";

export function AdminRevenueTracker() {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<Mode>("single");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (f: string, t: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/revenue?from=${f}&to=${t}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Could not load revenue data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on date change
  useEffect(() => {
    const effectiveTo = mode === "single" ? from : to;
    void load(from, effectiveTo);
  }, [from, to, mode, load]);

  const effectiveTo = mode === "single" ? from : to;
  const isSingleDay = from === effectiveTo;
  const compLabel = isSingleDay ? "week" : "period";

  const totalCashHeld = data?.cashHeld.reduce((s, g) => s + g.held, 0) ?? 0;

  return (
    <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">Revenue Tracker</div>
          <div className="text-[12px] text-[#9ca3af]">
            {data
              ? isSingleDay
                ? `${formatDate(data.from)} vs same day last week (${formatDate(data.lastWeekFrom)})`
                : `${formatDate(data.from)} – ${formatDate(data.to)} vs same period last week`
              : "Choose a date or range"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(from, effectiveTo)}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-[10px] border border-[#ddd1fb] px-3 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Mode toggle + date pickers */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-[10px] border border-[#ece5ff] p-0.5">
          {(["single", "range"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-[8px] px-3 py-1.5 text-[12px] font-bold transition-colors ${
                mode === m ? "bg-[#6d5bd0] text-white" : "text-[#6b7280] hover:text-[#2a2346]"
              }`}
            >
              {m === "single" ? "Single day" : "Date range"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            max={today}
            onChange={(e) => {
              setFrom(e.target.value);
              if (mode === "range" && e.target.value > to) setTo(e.target.value);
            }}
            className="h-9 rounded-[10px] border border-[#ddd1fb] px-3 text-[12px] font-semibold text-[#1f1f2c] focus:outline-none focus:ring-2 focus:ring-[#6d5bd0]/30"
          />
          {mode === "range" && (
            <>
              <span className="text-[12px] text-[#9ca3af]">to</span>
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-[10px] border border-[#ddd1fb] px-3 text-[12px] font-semibold text-[#1f1f2c] focus:outline-none focus:ring-2 focus:ring-[#6d5bd0]/30"
              />
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff8f8] px-3 py-2 text-[12px] text-[#b42318]">{error}</div>
      )}

      {/* Revenue cards */}
      {loading && !data ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-[18px] bg-[#ece5ff]/40" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {/* Total */}
            <div className="rounded-[18px] border border-[#ece5ff] bg-[#faf9fd] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                <IndianRupee className="h-3 w-3" />
                Total
              </div>
              <div className={`mt-1.5 text-[22px] font-black tracking-[-0.03em] text-[#1f1f2c] ${loading ? "opacity-50" : ""}`}>
                {fmt(data.current.total)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#9ca3af]">{data.current.bookingCount} booking{data.current.bookingCount !== 1 ? "s" : ""}</div>
              <div className="mt-2">
                <Delta current={data.current.total} previous={data.lastWeek.total} label={compLabel} />
              </div>
            </div>

            {/* Online */}
            <div className="rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#3b82f6]">
                <Wallet className="h-3 w-3" />
                Online
              </div>
              <div className={`mt-1.5 text-[22px] font-black tracking-[-0.03em] text-[#1e40af] ${loading ? "opacity-50" : ""}`}>
                {fmt(data.current.online)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#6b7280]">UPI / card / deposit</div>
              <div className="mt-2">
                <Delta current={data.current.online} previous={data.lastWeek.online} label={compLabel} />
              </div>
            </div>

            {/* Cash */}
            <div className="rounded-[18px] border border-[#d1fae5] bg-[#f0fdf4] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#059669]">
                <Banknote className="h-3 w-3" />
                Cash
              </div>
              <div className={`mt-1.5 text-[22px] font-black tracking-[-0.03em] text-[#15803d] ${loading ? "opacity-50" : ""}`}>
                {fmt(data.current.cash)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#6b7280]">Collected at door</div>
              <div className="mt-2">
                <Delta current={data.current.cash} previous={data.lastWeek.cash} label={compLabel} />
              </div>
            </div>
          </div>

          {/* Last week ghost row */}
          <div className="mt-2 flex items-center gap-4 rounded-[12px] bg-[#f7f7fb] px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">Last {compLabel}</span>
            <span className="text-[12px] font-black text-[#6b7280]">{fmt(data.lastWeek.total)} total</span>
            <span className="text-[11px] text-[#9ca3af]">·</span>
            <span className="text-[12px] text-[#6b7280]">{fmt(data.lastWeek.online)} online</span>
            <span className="text-[11px] text-[#9ca3af]">·</span>
            <span className="text-[12px] text-[#6b7280]">{fmt(data.lastWeek.cash)} cash</span>
            <span className="text-[11px] text-[#9ca3af]">·</span>
            <span className="text-[12px] text-[#6b7280]">{data.lastWeek.bookingCount} booking{data.lastWeek.bookingCount !== 1 ? "s" : ""}</span>
          </div>

          {/* Cash held by groomers */}
          {data.cashHeld.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-black uppercase tracking-[0.08em] text-[#8a90a6]">Cash held by groomers</div>
                <div className={`text-[13px] font-black ${totalCashHeld > 5000 ? "text-[#dc2626]" : "text-[#d97706]"}`}>
                  {fmt(totalCashHeld)} total
                </div>
              </div>
              <div className="divide-y divide-[#f3f0fb] rounded-[14px] border border-[#ece5ff] overflow-hidden">
                {data.cashHeld.map((g) => {
                  const isUrgent = g.held > 2000 && (g.daysSince ?? 999) > 3;
                  return (
                    <div
                      key={g.id}
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        isUrgent ? "bg-[#fff8f8]" : "bg-white"
                      }`}
                    >
                      <div>
                        <span className="text-[13px] font-semibold text-[#1f1f2c]">{g.name}</span>
                        {g.team && <span className="ml-1.5 text-[11px] text-[#9ca3af]">{g.team}</span>}
                        {g.daysSince !== null && (
                          <span className={`ml-2 text-[11px] font-semibold ${isUrgent ? "text-[#dc2626]" : "text-[#9ca3af]"}`}>
                            · {g.daysSince}d since deposit
                          </span>
                        )}
                      </div>
                      <span className={`text-[14px] font-black ${isUrgent ? "text-[#dc2626]" : "text-[#d97706]"}`}>
                        {fmt(g.held)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.cashHeld.length === 0 && (
            <div className="mt-4 rounded-[14px] bg-[#f0fdf4] px-4 py-3 text-center text-[12px] font-semibold text-[#15803d]">
              No cash held by any groomer
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
