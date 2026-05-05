"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminBookingActionId, AdminBookingListItem, AdminBookingStatus, AdminPaymentStatus } from "../../types";

const STATUS_CLS: Record<AdminBookingStatus, string> = {
  pending_payment: "bg-[#fff8eb] text-[#b45309]",
  confirmed:       "bg-[#effaf3] text-[#15803d]",
  completed:       "bg-[#f3f4f6] text-[#374151]",
  cancelled:       "bg-[#fff1f2] text-[#be123c]",
  payment_expired: "bg-[#fff1f2] text-[#be123c]",
};

const PAYMENT_CLS: Record<AdminPaymentStatus, string> = {
  unpaid:                  "bg-[#fff8eb] text-[#b45309]",
  paid:                    "bg-[#effaf3] text-[#15803d]",
  pending_cash_collection: "bg-[#f3f4f6] text-[#374151]",
  covered_by_loyalty:      "bg-[#f5f3ff] text-[#6d28d9]",
  expired:                 "bg-[#fff1f2] text-[#be123c]",
};

function formatPetsSummary(pets: AdminBookingListItem["pets"]): string {
  const labels = Array.from({ length: pets.count }, (_, index) => {
    const name = pets.names[index]?.trim();
    const breed = pets.breeds[index]?.trim();

    if (name && breed) return `${name} (${breed})`;
    if (name) return name;
    if (breed) return breed;
    return "";
  }).filter(Boolean);

  if (!labels.length) return "—";

  const visible = labels.slice(0, 2).join(", ");
  return labels.length > 2 ? `${visible} +${labels.length - 2}` : visible;
}

type Props = {
  rows: AdminBookingListItem[];
  isLoading: boolean;
  error: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowClick: (row: AdminBookingListItem) => void;
  onActionClick: (row: AdminBookingListItem, action: AdminBookingActionId) => void;
};

const COLS = [
  "Pet Parent",
  "Contact",
  "Date",
  "Window",
  "Service",
  "Pets",
  "City",
  "Team",
  "Status",
  "Payment",
  "Amount",
  "Created",
  "ID",
  "Actions",
];

export function AdminBookingsTable({
  rows,
  isLoading,
  error,
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onRowClick,
  onActionClick,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-[#ece5ff] bg-white p-8 text-[14px] text-[#7c8499]">
        Loading bookings…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[22px] border border-[#f7d7d7] bg-[#fff8f8] p-8 text-[14px] text-[#b42318]">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-[22px] border border-[#ece5ff] bg-white p-12 text-center text-[14px] text-[#7c8499]">
        No bookings found.
      </div>
    );
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#ece5ff] bg-white shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="overflow-x-auto">
        <table className="min-w-[1480px] w-full">
          <thead className="bg-[#faf9fd]">
            <tr>
              {COLS.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[#f0ecfa] hover:bg-[#fcfbff] transition-colors"
              >
                <td
                  className="px-4 py-3.5 cursor-pointer hover:text-[#6d5bd0]"
                  onClick={() => onRowClick(row)}
                >
                  <div className="text-[13px] font-semibold text-[#2a2346]">
                    {row.customer.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#8a90a6]">
                    {row.pets.count} pet{row.pets.count !== 1 ? "s" : ""}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">
                  {row.customer.phoneMasked}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">
                  {row.selectedDate ?? "—"}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-[#4b5563] whitespace-nowrap">
                  {row.bookingWindow?.displayLabel ?? "—"}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">{row.service.name}</td>
                <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">
                  {formatPetsSummary(row.pets)}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">{row.city ?? "—"}</td>
                <td className="px-4 py-3.5 text-[13px] text-[#4b5563]">
                  {row.team ? (
                    <div>
                      <div>{row.team.name}</div>
                      <div className="mt-0.5 text-[11px] text-[#8a90a6]">
                        {row.groomerMember
                          ? `${row.groomerMember.name} · ${row.groomerMember.currentRank}`
                          : "Groomer not assigned"}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#b45309] font-medium">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${STATUS_CLS[row.status]}`}>
                    {row.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${PAYMENT_CLS[row.paymentStatus]}`}>
                    {row.paymentStatusLabel}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[13px] font-semibold text-[#2a2346] whitespace-nowrap">
                  ₹{row.financials.finalAmount.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3.5 text-[12px] text-[#8a90a6] whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td
                  className="px-4 py-3.5 text-[12px] font-mono text-[#7c8499] cursor-pointer hover:text-[#6d5bd0] whitespace-nowrap"
                  onClick={() => onRowClick(row)}
                >
                  {row.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onActionClick(row, "view_details")}
                      className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[11px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors whitespace-nowrap"
                    >
                      View
                    </button>
                    {row.urgency?.sameDay && (
                      <button
                        type="button"
                        onClick={() => onActionClick(row, "send_same_day_alert")}
                        className="rounded-[10px] border border-[#fde7b0] bg-[#fffaf0] px-3 py-1.5 text-[11px] font-semibold text-[#b45309] hover:bg-[#fff8eb] transition-colors whitespace-nowrap"
                      >
                        Send alert
                      </button>
                    )}
                    {row.availableActions.includes("mark_completed") && (
                      <button
                        type="button"
                        onClick={() => onActionClick(row, "mark_completed")}
                        className="rounded-[10px] bg-[#6d5bd0] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5b4ab5] transition-colors whitespace-nowrap"
                      >
                        Complete
                      </button>
                    )}
                    {row.availableActions.includes("cancel") && (
                      <button
                        type="button"
                        onClick={() => onActionClick(row, "cancel")}
                        className="rounded-[10px] border border-[#f3d6d6] px-3 py-1.5 text-[11px] font-semibold text-[#c24134] hover:bg-[#fff1f2] transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    )}
                    {row.availableActions.includes("issue_refund") && (
                      <button
                        type="button"
                        onClick={() => onActionClick(row, "issue_refund")}
                        className="rounded-[10px] bg-[#c24134] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#a93528] transition-colors whitespace-nowrap"
                      >
                        Issue refund
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[#f0ecfa] px-5 py-3">
        <span className="text-[12px] text-[#7c8499]">
          {start}–{end} of {totalCount} bookings
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center justify-center h-8 w-8 rounded-[10px] border border-[#ddd1fb] text-[#6d5bd0] disabled:opacity-30 hover:bg-[#f6f4fd] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[12px] text-[#6b7280] px-2">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center justify-center h-8 w-8 rounded-[10px] border border-[#ddd1fb] text-[#6d5bd0] disabled:opacity-30 hover:bg-[#f6f4fd] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
