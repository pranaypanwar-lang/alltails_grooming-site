"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import type {
  AdminDispatchActionId,
  AdminDispatchCard,
  AdminDispatchGroup,
  AdminBookingStatus,
  AdminPaymentStatus,
} from "../../types";

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

// ─── Card ────────────────────────────────────────────────────────────────────

function DispatchCard({
  card,
  isSelected,
  onToggleSelection,
  onClick,
  onActionClick,
}: {
  card: AdminDispatchCard;
  isSelected: boolean;
  onToggleSelection: () => void;
  onClick: () => void;
  onActionClick: (action: AdminDispatchActionId) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canSelect = card.availableActions.includes("send_same_day_alert");

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className={`rounded-[18px] border bg-white shadow-[0_12px_24px_rgba(73,44,120,0.05)] transition-shadow hover:shadow-[0_16px_32px_rgba(73,44,120,0.1)] ${
        card.urgency.issueFlag ? "border-[#f7d7d7]" : card.urgency.sameDay ? "border-[#fde7b0]" : "border-[#ece5ff]"
      } ${isSelected ? "ring-2 ring-[#6d5bd0] ring-offset-2 ring-offset-[#f7f7fb]" : ""}`}
    >
      <button type="button" onClick={onClick} className="w-full text-left p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-[#2a2346] truncate">{card.serviceName}</div>
            <div className="mt-0.5 text-[12px] text-[#7c8499]">{card.customer.name}</div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${STATUS_CLS[card.status]}`}>
            {card.status.replace(/_/g, " ")}
          </span>
        </div>

        {card.bookingWindow && (
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#6b7280]">
            <Clock className="w-3 h-3 shrink-0" />
            {card.bookingWindow.displayLabel}
            {card.city && <span>· {card.city}</span>}
          </div>
        )}

        <div className="mt-1 text-[12px] text-[#6b7280] truncate">{card.pets.summary}</div>
        <div className="mt-1 text-[11px] text-[#8a90a6] truncate">
          {card.groomerMember
            ? `Groomer: ${card.groomerMember.name} · ${card.groomerMember.currentRank}`
            : "Groomer pending"}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#4f46e5]">
            {card.dispatchState.replace(/_/g, " ")}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_CLS[card.paymentStatus]}`}>
            {card.paymentStatus.replace(/_/g, " ")}
          </span>
          {card.loyalty.rewardApplied && (
            <span className="rounded-full bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#6d28d9]">
              Loyalty
            </span>
          )}
          {card.urgency.sameDay && (
            <span className="rounded-full bg-[#fff8eb] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">Today</span>
          )}
          {card.urgency.lateFill && (
            <span className="rounded-full bg-[#fff1f2] px-2 py-0.5 text-[10px] font-semibold text-[#be123c]">Late fill</span>
          )}
          {card.urgency.paymentExpiringSoon && (
            <span className="rounded-full bg-[#fff1f2] px-2 py-0.5 text-[10px] font-semibold text-[#be123c]">Expiring</span>
          )}
          {card.urgency.delayRisk && (
            <span className="rounded-full bg-[#fff1f2] px-2 py-0.5 text-[10px] font-semibold text-[#be123c]">Escalate in 25m</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              card.addressInfo.status === "complete"
                ? "bg-[#effaf3] text-[#15803d]"
                : card.addressInfo.status === "partial"
                  ? "bg-[#fff8eb] text-[#b45309]"
                  : "bg-[#fff1f2] text-[#be123c]"
            }`}
          >
            {card.addressInfo.statusLabel}
          </span>
        </div>
      </button>

      {/* Footer */}
      <div className="border-t border-[#f0ecfa] px-3.5 py-2.5 flex flex-wrap items-center gap-2">
        {canSelect && (
          <label className="inline-flex items-center gap-2 rounded-[10px] border border-[#ddd1fb] bg-[#faf9fd] px-2.5 py-1.5 text-[11px] font-semibold text-[#6d5bd0]">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="h-3.5 w-3.5 rounded border-[#c7b7f5] text-[#6d5bd0] focus:ring-[#6d5bd0]"
            />
            Select
          </label>
        )}

        <button
          type="button"
          onClick={() => onActionClick("open_details")}
          className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[11px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
        >
          Details
        </button>

        {card.status === "confirmed" && (
          <button
            type="button"
            onClick={() => onActionClick("send_same_day_alert")}
            className="rounded-[10px] border border-[#fde7b0] bg-[#fffaf0] px-3 py-1.5 text-[11px] font-semibold text-[#b45309] hover:bg-[#fff8eb] transition-colors"
          >
            Send alert
          </button>
        )}

        {card.availableActions.includes("mark_completed") && (
          <button
            type="button"
            onClick={() => onActionClick("mark_completed")}
            className="rounded-[10px] bg-[#6d5bd0] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5b4ab5] transition-colors"
          >
            Complete
          </button>
        )}

        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#f6f4fd] text-[#8a90a6] hover:text-[#6d5bd0] transition-colors"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-9 w-44 rounded-[14px] border border-[#ece5ff] bg-white py-1 shadow-lg z-20">
              {card.availableActions.includes("cancel") && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onActionClick("cancel"); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#c24134] hover:bg-[#fff1f2]"
                >
                  Cancel booking
                </button>
              )}
              {(card.availableActions.includes("assign_team") || card.availableActions.includes("reassign_team")) && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onActionClick(card.availableActions.includes("reassign_team") ? "reassign_team" : "assign_team"); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#6b7280] hover:bg-[#f6f4fd]"
                >
                  {card.availableActions.includes("reassign_team") ? "Reassign team" : "Assign team"}
                </button>
              )}
              {(card.availableActions.includes("assign_groomer") || card.availableActions.includes("reassign_groomer")) && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onActionClick(card.availableActions.includes("reassign_groomer") ? "reassign_groomer" : "assign_groomer"); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#6b7280] hover:bg-[#f6f4fd]"
                >
                  {card.availableActions.includes("reassign_groomer") ? "Reassign groomer" : "Assign groomer"}
                </button>
              )}
              {card.availableActions.includes("reschedule") && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onActionClick("reschedule"); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#6b7280] hover:bg-[#f6f4fd]"
                >
                  Reschedule
                </button>
              )}
              {card.availableActions.includes("mark_en_route") && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onActionClick("mark_en_route"); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#6b7280] hover:bg-[#f6f4fd]"
                >
                  Mark en route
                </button>
              )}
              {card.availableActions.includes("mark_started") && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onActionClick("mark_started"); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#6b7280] hover:bg-[#f6f4fd]"
                >
                  Mark started
                </button>
              )}
              {card.availableActions.includes("relay_call") && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onActionClick("relay_call"); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#6b7280] hover:bg-[#f6f4fd]"
                >
                  Relay call
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lane ────────────────────────────────────────────────────────────────────

function DispatchLane({
  title,
  subtitle,
  overload,
  cards,
  selectedBookingIds,
  onToggleSelection,
  onCardClick,
  onActionClick,
}: {
  title: string;
  subtitle?: string;
  overload?: boolean;
  cards: AdminDispatchCard[];
  selectedBookingIds: string[];
  onToggleSelection: (card: AdminDispatchCard) => void;
  onCardClick: (card: AdminDispatchCard) => void;
  onActionClick: (card: AdminDispatchCard, action: AdminDispatchActionId) => void;
}) {
  return (
    <div className="w-72 shrink-0 flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#2a2346]">{title}</span>
            {overload && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#be123c]">
                <AlertTriangle className="w-3 h-3" /> Overload
              </span>
            )}
          </div>
          {subtitle && <div className="mt-0.5 text-[12px] text-[#7c8499]">{subtitle}</div>}
        </div>
        <span className="rounded-full bg-[#f6f4fd] px-2.5 py-1 text-[11px] font-semibold text-[#6d5bd0] shrink-0">
          {cards.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {cards.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#ddd1fb] bg-[#faf9fd] py-8 text-center text-[12px] text-[#8a90a6]">
            No jobs
          </div>
        ) : (
          cards.map((card) => (
            <DispatchCard
              key={card.bookingId}
              card={card}
              isSelected={selectedBookingIds.includes(card.bookingId)}
              onToggleSelection={() => onToggleSelection(card)}
              onClick={() => onCardClick(card)}
              onActionClick={(action) => onActionClick(card, action)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

type Props = {
  groups: AdminDispatchGroup[];
  unassigned: AdminDispatchCard[];
  selectedBookingIds: string[];
  isLoading: boolean;
  error: string;
  onToggleSelection: (card: AdminDispatchCard) => void;
  onCardClick: (card: AdminDispatchCard) => void;
  onActionClick: (card: AdminDispatchCard, action: AdminDispatchActionId) => void;
};

export function AdminDispatchBoard({
  groups,
  unassigned,
  selectedBookingIds,
  isLoading,
  error,
  onToggleSelection,
  onCardClick,
  onActionClick,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-[#ece5ff] bg-white p-8 text-[14px] text-[#7c8499]">
        Loading dispatch board…
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

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-5" style={{ minWidth: "max-content" }}>
        <DispatchLane
          title="Unassigned"
          subtitle={unassigned.length > 0 ? `${unassigned.length} need assignment` : "All assigned"}
          cards={unassigned}
          selectedBookingIds={selectedBookingIds}
          onToggleSelection={onToggleSelection}
          onCardClick={onCardClick}
          onActionClick={onActionClick}
        />
        {groups.map((group) => (
          <DispatchLane
            key={group.team.id}
            title={group.team.name}
            subtitle={`${group.capacity.assignedJobs} assigned`}
            overload={group.capacity.overload}
            cards={group.bookings}
            selectedBookingIds={selectedBookingIds}
            onToggleSelection={onToggleSelection}
            onCardClick={onCardClick}
            onActionClick={onActionClick}
          />
        ))}
        {groups.length === 0 && unassigned.length === 0 && (
          <div className="flex-1 rounded-[22px] border border-dashed border-[#ddd1fb] bg-[#faf9fd] py-20 text-center text-[13px] text-[#8a90a6]">
            No bookings for this date
          </div>
        )}
      </div>
    </div>
  );
}
