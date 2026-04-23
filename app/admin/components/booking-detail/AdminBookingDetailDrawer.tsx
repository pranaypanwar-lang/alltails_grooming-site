"use client";

import Image from "next/image";
import { X } from "lucide-react";
import type { AdminBookingActionId, AdminBookingDetail, AdminBookingStatus, AdminPaymentStatus } from "../../types";
import { AdminBookingSopSection } from "./AdminBookingSopSection";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[#ece5ff] bg-white p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-[#f0ecfa] last:border-0">
      <span className="text-[12px] text-[#8a90a6] shrink-0">{label}</span>
      <span className="text-[13px] text-[#2a2346] text-right">{value ?? "—"}</span>
    </div>
  );
}

function Badge({ text, cls }: { text: string; cls: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{text}</span>
  );
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative block h-14 w-14 overflow-hidden rounded-[10px] border border-[#ece5ff]">
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        loader={({ src: imageSrc }) => imageSrc}
        className="object-cover"
        sizes="56px"
      />
    </span>
  );
}

type Props = {
  isOpen: boolean;
  booking: AdminBookingDetail | null;
  isLoading: boolean;
  error: string;
  onClose: () => void;
  onAction: (action: AdminBookingActionId) => void;
  onRefreshBooking: () => Promise<void> | void;
};

export function AdminBookingDetailDrawer({ isOpen, booking, isLoading, error, onClose, onAction, onRefreshBooking }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end">
      <div className="absolute inset-0 bg-[rgba(17,12,33,0.45)]" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-[720px] flex-col overflow-hidden border-l border-[#ece5ff] bg-white shadow-[0_20px_60px_rgba(17,12,33,0.18)]">
        {/* Sticky header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#f0ecfa] bg-white px-5 py-4">
          <div>
            <h2 className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c]">Booking details</h2>
            {booking && (
              <p className="mt-0.5 text-[12px] text-[#7c8499] font-mono">{booking.id}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ece8f5] text-[#8a90a6] hover:bg-[#f6f4fd] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-20 text-[14px] text-[#7c8499]">Loading…</div>
          )}
          {error && !isLoading && (
            <div className="p-5 text-[14px] text-[#b42318]">{error}</div>
          )}

          {booking && !isLoading && (
            <div className="space-y-4 p-5">
              {/* Status + actions */}
              <Section title="Booking">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge text={booking.statusLabel} cls={STATUS_CLS[booking.status]} />
                  <Badge text={booking.paymentStatusLabel} cls={PAYMENT_CLS[booking.paymentStatus]} />
                  {booking.paymentMethodLabel && (
                    <Badge text={booking.paymentMethodLabel} cls="bg-[#f6f4fd] text-[#6d5bd0]" />
                  )}
                </div>
                <p className="text-[13px] text-[#6b7280] mb-4">{booking.supportingText}</p>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  {(booking.availableActions.includes("assign_team") || booking.availableActions.includes("reassign_team")) && (
                    <button
                      type="button"
                      onClick={() => onAction(booking.availableActions.includes("reassign_team") ? "reassign_team" : "assign_team")}
                      className="rounded-[12px] border border-[#ddd1fb] bg-white px-4 py-2 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
                    >
                      {booking.availableActions.includes("reassign_team") ? "Reassign team" : "Assign team"}
                    </button>
                  )}
                  {(booking.availableActions.includes("assign_groomer") || booking.availableActions.includes("reassign_groomer")) && (
                    <button
                      type="button"
                      onClick={() => onAction(booking.availableActions.includes("reassign_groomer") ? "reassign_groomer" : "assign_groomer")}
                      className="rounded-[12px] border border-[#ddd1fb] bg-white px-4 py-2 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
                    >
                      {booking.availableActions.includes("reassign_groomer") ? "Reassign groomer" : "Assign groomer"}
                    </button>
                  )}
                  {booking.availableActions.includes("reschedule") && (
                    <button
                      type="button"
                      onClick={() => onAction("reschedule")}
                      className="rounded-[12px] border border-[#ece8f5] bg-white px-4 py-2 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Reschedule
                    </button>
                  )}
                  {booking.availableActions.includes("send_same_day_alert") && (
                    <button
                      type="button"
                      onClick={() => onAction("send_same_day_alert")}
                      className="rounded-[12px] border border-[#fde7b0] bg-[#fffaf0] px-4 py-2 text-[12px] font-semibold text-[#b45309] hover:bg-[#fff8eb] transition-colors"
                    >
                      Send alert
                    </button>
                  )}
                  {booking.availableActions.includes("mark_completed") && (
                    <button
                      type="button"
                      onClick={() => onAction("mark_completed")}
                      className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#5b4ab5] transition-colors"
                    >
                      Mark completed
                    </button>
                  )}
                  {booking.availableActions.includes("cancel") && (
                    <button
                      type="button"
                      onClick={() => onAction("cancel")}
                      className="rounded-[12px] border border-[#f3d6d6] bg-[#fffafa] px-4 py-2 text-[12px] font-semibold text-[#c24134] hover:bg-[#fff1f2] transition-colors"
                    >
                      Cancel booking
                    </button>
                  )}
                  {booking.availableActions.includes("relay_call") && (
                    <button
                      type="button"
                      onClick={() => onAction("relay_call")}
                      className="rounded-[12px] border border-[#ece8f5] bg-white px-4 py-2 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Relay call
                    </button>
                  )}
                  {booking.availableActions.includes("retry_payment_support") && (
                    <button
                      type="button"
                      onClick={() => onAction("retry_payment_support")}
                      className="rounded-[12px] border border-[#ece8f5] bg-white px-4 py-2 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Retry payment support
                    </button>
                  )}
                  {booking.availableActions.includes("send_payment_link") && (
                    <button
                      type="button"
                      onClick={() => onAction("send_payment_link")}
                      className="rounded-[12px] border border-[#ece8f5] bg-white px-4 py-2 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Generate payment link
                    </button>
                  )}
                  {booking.availableActions.includes("send_customer_message") && (
                    <button
                      type="button"
                      onClick={() => onAction("send_customer_message")}
                      className="rounded-[12px] border border-[#ddd1fb] bg-white px-4 py-2 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Customer message
                    </button>
                  )}
                  {booking.availableActions.includes("mark_en_route") && (
                    <button
                      type="button"
                      onClick={() => onAction("mark_en_route")}
                      className="rounded-[12px] border border-[#ddd1fb] bg-white px-4 py-2 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Mark en route
                    </button>
                  )}
                  {booking.availableActions.includes("mark_started") && (
                    <button
                      type="button"
                      onClick={() => onAction("mark_started")}
                      className="rounded-[12px] border border-[#ddd1fb] bg-white px-4 py-2 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Mark started
                    </button>
                  )}
                  {booking.availableActions.includes("mark_issue") && (
                    <button
                      type="button"
                      onClick={() => onAction("mark_issue")}
                      className="rounded-[12px] border border-[#f3d6d6] bg-[#fffafa] px-4 py-2 text-[12px] font-semibold text-[#c24134] hover:bg-[#fff1f2] transition-colors"
                    >
                      Flag issue
                    </button>
                  )}
                  {booking.availableActions.includes("edit_metadata") && (
                    <button
                      type="button"
                      onClick={() => onAction("edit_metadata")}
                      className="rounded-[12px] border border-[#ece8f5] bg-white px-4 py-2 text-[12px] font-semibold text-[#2a2346] hover:bg-[#f6f4fd] transition-colors"
                    >
                      Edit booking info
                    </button>
                  )}
                </div>
              </Section>

              <Section title="Assignment">
                <Row label="Team" value={booking.bookingWindow?.team?.name ?? "—"} />
                <Row
                  label="Groomer"
                  value={
                    booking.groomerMember ? (
                      <span className="inline-flex flex-col items-end">
                        <span className="font-semibold">{booking.groomerMember.name}</span>
                        <span className="text-[11px] text-[#8a90a6]">
                          {booking.groomerMember.currentRank} · {booking.groomerMember.currentXp} XP
                        </span>
                      </span>
                    ) : "—"
                  }
                />
              </Section>

              {/* Customer */}
              <Section title="Customer">
                <Row label="Name" value={<span className="font-semibold">{booking.customer.name}</span>} />
                <Row label="Phone" value={booking.customer.phoneFull ?? booking.customer.phoneMasked} />
                <Row label="City" value={booking.customer.city} />
              </Section>

              <Section title="Address & location">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge
                    text={booking.addressInfo.statusLabel}
                    cls={
                      booking.addressInfo.status === "complete"
                        ? "bg-[#effaf3] text-[#15803d]"
                        : booking.addressInfo.status === "partial"
                          ? "bg-[#fff8eb] text-[#b45309]"
                          : "bg-[#fff1f2] text-[#be123c]"
                    }
                  />
                  <Badge
                    text={booking.addressInfo.addressReceived ? "Address received" : "Address missing"}
                    cls={booking.addressInfo.addressReceived ? "bg-[#f6f4fd] text-[#6d5bd0]" : "bg-[#fff8eb] text-[#b45309]"}
                  />
                  <Badge
                    text={booking.addressInfo.locationReceived ? "Location received" : "Location missing"}
                    cls={booking.addressInfo.locationReceived ? "bg-[#eef2ff] text-[#4338ca]" : "bg-[#fff8eb] text-[#b45309]"}
                  />
                </div>
                <Row label="Service address" value={booking.addressInfo.serviceAddress} />
                <Row label="Landmark" value={booking.addressInfo.serviceLandmark} />
                <Row label="Pin code" value={booking.addressInfo.servicePincode} />
                <Row
                  label="Google Maps link"
                  value={
                    booking.addressInfo.serviceLocationUrl ? (
                      <a
                        href={booking.addressInfo.serviceLocationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#6d5bd0] hover:text-[#5b4ab5]"
                      >
                        Open location
                      </a>
                    ) : null
                  }
                />
                <Row
                  label="Updated"
                  value={
                    booking.addressInfo.addressUpdatedAt
                      ? new Date(booking.addressInfo.addressUpdatedAt).toLocaleString("en-IN")
                      : null
                  }
                />
              </Section>

              {booking.adminNote ? (
                <Section title="Ops note">
                  <p className="whitespace-pre-line text-[13px] leading-[1.7] text-[#4b5563]">
                    {booking.adminNote}
                  </p>
                </Section>
              ) : null}

              <AdminBookingSopSection
                bookingId={booking.id}
                steps={booking.sopSteps}
                paymentMethod={booking.paymentMethod}
                expectedAmount={booking.financials.finalAmount}
                paymentCollection={booking.paymentCollection}
                onRefresh={onRefreshBooking}
              />

              {/* Service + window */}
              <Section title="Service & booking window">
                <Row label="Service" value={booking.service.name} />
                <Row label="Date" value={booking.selectedDate} />
                <Row label="Window" value={booking.bookingWindow?.displayLabel} />
                <Row label="Team" value={booking.bookingWindow?.team?.name} />
                <Row label="Source" value={booking.bookingSource.replace(/_/g, " ")} />
                <Row label="Dispatch" value={booking.dispatchState?.replace(/_/g, " ")} />
              </Section>

              {/* Pets */}
              <Section title="Pets">
                {booking.pets.map((pet, i) => (
                  <div key={pet.bookingPetId} className={i > 0 ? "pt-3 mt-3 border-t border-[#f0ecfa]" : ""}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-[#2a2346]">
                        {pet.name ?? "Unnamed"} · {pet.breed}
                      </span>
                      {pet.isSavedProfile && (
                        <Badge text="Saved" cls="bg-[#f5f3ff] text-[#6d28d9]" />
                      )}
                    </div>
                    {pet.groomingNotes && (
                      <p className="text-[12px] text-[#6b7280]">
                        <span className="font-semibold text-[#4b5563]">Grooming: </span>{pet.groomingNotes}
                      </p>
                    )}
                    {pet.stylingNotes && (
                      <p className="text-[12px] text-[#6b7280]">
                        <span className="font-semibold text-[#4b5563]">Styling: </span>{pet.stylingNotes}
                      </p>
                    )}
                    {pet.concernPhotoUrls.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] font-semibold text-[#8a90a6] mb-1.5">Concern photos</div>
                        <div className="flex flex-wrap gap-2">
                          {pet.concernPhotoUrls.map((url, j) => (
                            <a key={j} href={url} target="_blank" rel="noreferrer">
                              <Thumb src={url} alt="Concern" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {pet.stylingReferenceUrls.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] font-semibold text-[#8a90a6] mb-1.5">Styling refs</div>
                        <div className="flex flex-wrap gap-2">
                          {pet.stylingReferenceUrls.map((url, j) => (
                            <a key={j} href={url} target="_blank" rel="noreferrer">
                              <Thumb src={url} alt="Style ref" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </Section>

              {/* Payment + Loyalty side by side on wider screens */}
              <div className="grid gap-4 md:grid-cols-2">
                <Section title="Payment">
                  <Row label="Original" value={`₹${booking.financials.originalAmount.toLocaleString("en-IN")}`} />
                  {booking.financials.discountAmount > 0 && (
                    <Row label={`Discount ${booking.financials.couponCode ? `(${booking.financials.couponCode})` : ""}`}
                      value={<span className="text-[#15803d]">−₹{booking.financials.discountAmount.toLocaleString("en-IN")}</span>} />
                  )}
                  <Row label="Final" value={<span className="font-semibold">₹{booking.financials.finalAmount.toLocaleString("en-IN")}</span>} />
                  {booking.paymentCollection ? (
                    <>
                      <Row label="Collected via" value={booking.paymentCollection.collectionMode.replace(/_/g, " ")} />
                      <Row
                        label="Collected amount"
                        value={
                          <span className={booking.paymentCollection.mismatchFlag ? "font-semibold text-[#be123c]" : "font-semibold"}>
                            ₹{booking.paymentCollection.collectedAmount.toLocaleString("en-IN")}
                          </span>
                        }
                      />
                      <Row
                        label="Mismatch flag"
                        value={booking.paymentCollection.mismatchFlag ? (
                          <Badge text="Mismatch" cls="bg-[#fff1f2] text-[#be123c]" />
                        ) : (
                          <Badge text="Matched" cls="bg-[#effaf3] text-[#15803d]" />
                        )}
                      />
                      {booking.paymentCollection.notes ? (
                        <Row label="Collection notes" value={booking.paymentCollection.notes} />
                      ) : null}
                    </>
                  ) : null}
                  <Row label="Razorpay order" value={booking.paymentAudit.razorpayOrderId ? (
                    <span className="font-mono text-[11px] break-all">{booking.paymentAudit.razorpayOrderId}</span>
                  ) : null} />
                  <Row label="Razorpay payment" value={booking.paymentAudit.razorpayPaymentId ? (
                    <span className="font-mono text-[11px] break-all">{booking.paymentAudit.razorpayPaymentId}</span>
                  ) : null} />
                  {booking.paymentAudit.paymentGatewayError && (
                    <Row label="Gateway error" value={<span className="text-[#c24134]">{booking.paymentAudit.paymentGatewayError}</span>} />
                  )}
                  {booking.paymentAudit.paymentExpiresAt && (
                    <Row label="Hold expires" value={new Date(booking.paymentAudit.paymentExpiresAt).toLocaleString("en-IN")} />
                  )}
                  {booking.refundSummary && (
                    <>
                      <Row label="Refund mode" value={booking.refundSummary.refundLabel} />
                      <Row label="Cancel reason" value={booking.refundSummary.reason} />
                      {booking.refundSummary.refundNotes && (
                        <Row label="Refund notes" value={booking.refundSummary.refundNotes} />
                      )}
                      <Row label="Cancelled at" value={new Date(booking.refundSummary.cancelledAt).toLocaleString("en-IN")} />
                    </>
                  )}
                </Section>

                <Section title="Loyalty">
                  <Row label="Eligible" value={booking.loyalty.eligible ? "Yes" : "No"} />
                  <Row label="Reward applied" value={booking.loyalty.rewardApplied ? (
                    <Badge text={booking.loyalty.rewardLabel ?? "Free session"} cls="bg-[#f5f3ff] text-[#6d28d9]" />
                  ) : "No"} />
                  <Row label="Reward restored" value={booking.loyalty.rewardRestored ? (
                    <Badge text="Restored" cls="bg-[#effaf3] text-[#15803d]" />
                  ) : "No"} />
                  <Row label="Count before" value={booking.loyalty.completedCountBefore} />
                  <Row label="Count after" value={booking.loyalty.completedCountAfter} />
                  {booking.loyalty.countedAt && (
                    <Row label="Counted at" value={new Date(booking.loyalty.countedAt).toLocaleString("en-IN")} />
                  )}
                </Section>
              </div>

              {/* Slots */}
              {booking.bookingWindow && (
                <Section title="Slots">
                  {booking.bookingWindow.slots.map((slot) => (
                    <div key={slot.slotId} className="py-2 border-b border-[#f0ecfa] last:border-0 text-[12px] text-[#6b7280]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[#2a2346]">{slot.slotId.slice(0, 12)}…</span>
                        <Badge
                          text={slot.bookingSlotStatus}
                          cls={
                            slot.bookingSlotStatus === "confirmed" ? "bg-[#effaf3] text-[#15803d]"
                            : slot.bookingSlotStatus === "hold"    ? "bg-[#fff8eb] text-[#b45309]"
                            : "bg-[#f3f4f6] text-[#374151]"
                          }
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-[#8a90a6]">
                        booked={String(slot.slotState.isBooked)} · held={String(slot.slotState.isHeld)} · blocked={String(slot.slotState.isBlocked)}
                        {slot.slotState.holdExpiresAt && ` · expires ${new Date(slot.slotState.holdExpiresAt).toLocaleTimeString("en-IN")}`}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {booking.dispatchAlerts.length > 0 && (
                <Section title="Dispatch Alerts">
                  <div className="space-y-3">
                    {booking.dispatchAlerts.map((alert) => (
                      <div key={alert.id} className="rounded-[14px] border border-[#ece5ff] bg-[#faf9fd] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[13px] font-semibold text-[#2a2346]">
                              {alert.alertType.replace(/_/g, " ")} · {alert.team.name}
                            </div>
                            <div className="mt-1 text-[11px] text-[#8a90a6]">
                              {new Date(alert.sentAt).toLocaleString("en-IN")}
                            </div>
                          </div>
                          <Badge
                            text={alert.success ? "Sent" : "Failed"}
                            cls={alert.success ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fff1f2] text-[#be123c]"}
                          />
                        </div>
                        {alert.error ? (
                          <p className="mt-2 text-[12px] text-[#be123c]">{alert.error}</p>
                        ) : null}
                        {alert.telegramMessageId ? (
                          <p className="mt-2 break-all font-mono text-[11px] text-[#8a90a6]">
                            Telegram message: {alert.telegramMessageId}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {booking.customerMessages.length > 0 && (
                <Section title="Customer Messages">
                  <div className="space-y-3">
                    {booking.customerMessages.map((message) => (
                      <div key={message.id} className="rounded-[14px] border border-[#ece5ff] bg-[#faf9fd] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[13px] font-semibold text-[#2a2346]">
                              {message.messageType.replace(/_/g, " ")}
                            </div>
                            <div className="mt-1 text-[11px] text-[#8a90a6]">
                              {new Date(message.preparedAt).toLocaleString("en-IN")} · {message.channel.replace(/_/g, " ")}
                            </div>
                          </div>
                          <Badge text={message.status.replace(/_/g, " ")} cls="bg-[#eef2ff] text-[#4338ca]" />
                        </div>
                        <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-[12px] leading-[1.6] text-[#4b5563]">
                          {message.content}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#8a90a6]">
                          <span>Recipient: {message.recipient}</span>
                          {message.actionUrl ? (
                            <a
                              href={message.actionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[#6d5bd0] hover:text-[#5b4ab5]"
                            >
                              Open WhatsApp
                            </a>
                          ) : null}
                        </div>
                        {message.error ? (
                          <p className="mt-2 text-[12px] text-[#be123c]">{message.error}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Timeline */}
              <Section title="Timeline">
                <div className="space-y-3">
                  {booking.timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-[#6d5bd0] shrink-0" />
                      <div className="flex-1 flex items-start justify-between gap-3">
                        <span className="text-[13px] text-[#2a2346]">{item.label}</span>
                        {item.actor ? (
                          <span className="rounded-full bg-[#f6f4fd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6d5bd0]">
                            {item.actor}
                          </span>
                        ) : null}
                        {item.at && (
                          <span className="text-[11px] text-[#8a90a6] shrink-0">
                            {new Date(item.at).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
