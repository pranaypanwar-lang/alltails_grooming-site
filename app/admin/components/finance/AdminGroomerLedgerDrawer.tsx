"use client";

import { X } from "lucide-react";

type LedgerEntry = {
  id: string;
  monthBucket: string;
  type: string;
  direction: string;
  amount: number;
  description: string | null;
  occurredAt: string;
  createdBy: string | null;
};

type FinanceGroomer = {
  id: string;
  name: string;
  phone: string | null;
  team: { id: string; name: string } | null;
  cash: {
    held: number;
    collected: number;
    deposited: number;
  };
  recentLedgerEntries: LedgerEntry[];
};

type PendingItem = {
  id: string;
  label: string;
  amount?: number;
  detail: string;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminGroomerLedgerDrawer({
  groomer,
  pendingItems,
  onClose,
  onRecordDeposit,
}: {
  groomer: FinanceGroomer | null;
  pendingItems: PendingItem[];
  onClose: () => void;
  onRecordDeposit: (groomerId: string) => void;
}) {
  if (!groomer) return null;

  const chronological = [...groomer.recentLedgerEntries].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );
  const rows = chronological
    .reduce<Array<LedgerEntry & { runningBalance: number }>>((acc, entry) => {
      const previousBalance = acc[acc.length - 1]?.runningBalance ?? 0;
      const runningBalance =
        previousBalance + (entry.direction === "credit" ? entry.amount : -entry.amount);
      return [...acc, { ...entry, runningBalance }];
    }, [])
    .reverse();

  return (
    <div className="fixed inset-0 z-[300] flex justify-end">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[620px] translate-x-0 flex-col overflow-hidden border-l border-[#ece5ff] bg-white shadow-[0_20px_60px_rgba(17,12,33,0.18)] transition-transform">
        <div className="flex shrink-0 items-start justify-between border-b border-[#f0ecfa] px-5 py-4">
          <div>
            <h2 className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">{groomer.name}</h2>
            <p className="mt-0.5 text-[12px] text-[#7c8499]">
              {groomer.team?.name ?? "No team"} · {groomer.phone ?? "No phone"}
            </p>
            <div className={`mt-3 text-[28px] font-black ${groomer.cash.held > 2000 ? "text-[#dc2626]" : "text-[#1f1f2c]"}`}>
              {formatCurrency(groomer.cash.held)}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">Current cash held</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="overflow-hidden rounded-[18px] border border-[#ece5ff] bg-white">
            <div className="border-b border-[#f0ecfa] px-4 py-3">
              <div className="text-[13px] font-black uppercase tracking-[0.08em] text-[#8a90a6]">Ledger entries</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[560px] w-full text-[12px]">
                <thead className="bg-[#faf9fd] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Running</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ecfa]">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#9ca3af]">No ledger entries yet.</td>
                    </tr>
                  ) : (
                    rows.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 text-[#6b7280]">{formatDate(entry.occurredAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#2a2346]">{entry.type.replace(/_/g, " ")}</div>
                          <div className="mt-0.5 text-[#8a90a6]">{entry.description ?? entry.monthBucket}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-[#15803d]">
                          {entry.direction === "credit" ? formatCurrency(entry.amount) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-[#dc2626]">
                          {entry.direction === "debit" ? formatCurrency(entry.amount) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-[#1f1f2c]">{formatCurrency(entry.runningBalance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-4 rounded-[18px] border border-[#fde68a] bg-[#fffbeb] p-4">
            <div className="text-[13px] font-black uppercase tracking-[0.08em] text-[#92400e]">Pending items</div>
            <div className="mt-3 space-y-2">
              {pendingItems.length === 0 ? (
                <div className="text-[12px] text-[#92400e]">No pending expenses or fuel adjustments.</div>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="rounded-[12px] border border-[#fde68a] bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold text-[#78350f]">{item.label}</span>
                      {typeof item.amount === "number" ? (
                        <span className="text-[12px] font-black text-[#78350f]">{formatCurrency(item.amount)}</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#92400e]">{item.detail}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-[#f0ecfa] bg-white p-4">
          <button
            type="button"
            onClick={() => onRecordDeposit(groomer.id)}
            className="h-11 w-full rounded-[14px] bg-[#6d5bd0] text-[13px] font-semibold text-white hover:bg-[#5b4ab5] transition-colors"
          >
            Record Deposit
          </button>
        </div>
      </div>
    </div>
  );
}
