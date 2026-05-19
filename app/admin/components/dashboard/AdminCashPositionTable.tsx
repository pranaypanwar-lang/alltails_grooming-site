import Link from "next/link";
import type { DashboardResponse } from "../../types/dashboard";

type Props = {
  rows: DashboardResponse["cashPosition"];
};

export function AdminCashPositionTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-[#d1fae5] bg-[#f0fdf4] px-4 py-5 text-center text-[13px] text-[#15803d]">
        No cash currently held by any groomer
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-[#ece5ff]">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[#ece5ff] bg-[#f6f4fd]">
            <th className="px-3 py-2 text-left font-semibold text-[#6b7280]">Groomer</th>
            <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">Held</th>
            <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">Last deposit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isUrgent =
              row.cashHeld > 2000 && row.daysSinceLastDeposit !== null && row.daysSinceLastDeposit > 3;
            const isWarning = row.cashHeld > 0 && !isUrgent;

            return (
              <tr
                key={row.id}
                className={`border-b border-[#f3f0fb] last:border-0 ${
                  isUrgent ? "bg-[#fff5f5]" : isWarning ? "bg-[#fffbeb]" : "bg-white"
                }`}
              >
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-[#1f1f2c]">{row.name}</div>
                  <div className="text-[11px] text-[#9ca3af]">{row.team}</div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`font-black ${
                      isUrgent ? "text-[#dc2626]" : isWarning ? "text-[#d97706]" : "text-[#15803d]"
                    }`}
                  >
                    ₹{row.cashHeld.toLocaleString("en-IN")}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-[#6b7280]">
                  {row.daysSinceLastDeposit !== null ? (
                    <span className={row.daysSinceLastDeposit > 3 ? "text-[#dc2626] font-semibold" : ""}>
                      {row.daysSinceLastDeposit === 0 ? "Today" : `${row.daysSinceLastDeposit}d ago`}
                    </span>
                  ) : (
                    <span className="text-[#9ca3af]">Never</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-[#f3f0fb] px-3 py-2 text-right">
        <Link href="/admin/finance" className="text-[11px] font-semibold text-[#6d5bd0] hover:underline">
          View all finance →
        </Link>
      </div>
    </div>
  );
}
