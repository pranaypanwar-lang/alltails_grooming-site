"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminCustomerDetail } from "../../lib/api";
import type { AdminCustomerDetail, AdminCustomerDetailMessage } from "../../types";
import { AdminPageHeader } from "../../components/common/AdminPageHeader";
import { AdminSummaryBar } from "../../components/common/AdminSummaryBar";
import { useAdminToast } from "../../components/common/AdminToastProvider";
import { isLongCoatBreed, shouldSuggestUpgrade } from "../../../../lib/upsell/detectUpsell";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneClass(tone: "default" | "warning" | "success" | "danger") {
  if (tone === "danger") return "bg-[#fff1f2] text-[#be123c]";
  if (tone === "warning") return "bg-[#fff8eb] text-[#b45309]";
  if (tone === "success") return "bg-[#effaf3] text-[#15803d]";
  return "bg-[#eef2ff] text-[#4338ca]";
}

function dateDividerLabel(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function statusMeta(status: string) {
  if (status === "failed") return { icon: "✗", cls: "text-[#dc2626]" };
  if (status === "delivered") return { icon: "✓✓", cls: "text-[#2563eb]" };
  if (status === "sent") return { icon: "✓", cls: "text-[#6b7280]" };
  if (status === "queued") return { icon: "…", cls: "text-[#b45309]" };
  return { icon: "•", cls: "text-[#9ca3af]" };
}

function MessageThread({
  messages,
  composeText,
  composeChannel,
  isSending,
  onComposeTextChange,
  onComposeChannelChange,
  onSend,
}: {
  messages: AdminCustomerDetailMessage[];
  composeText: string;
  composeChannel: "whatsapp" | "sms";
  isSending: boolean;
  onComposeTextChange: (value: string) => void;
  onComposeChannelChange: (value: "whatsapp" | "sms") => void;
  onSend: () => void;
}) {
  let lastDate = "";

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border border-[#f0ecfa] bg-[#fbfaff]">
      <div className="max-h-[420px] space-y-4 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="text-[13px] text-[#8a90a6]">No message history.</div>
        ) : (
          messages.map((message) => {
            const at = message.sentAt ?? message.preparedAt;
            const label = dateDividerLabel(at);
            const showDivider = label !== lastDate;
            lastDate = label;
            const isInbound = message.messageType.startsWith("inbound") || message.messageType === "customer_reply";
            const status = statusMeta(message.status);
            const isWhatsApp = message.channel.toLowerCase().includes("whatsapp");

            return (
              <div key={message.id}>
                {showDivider ? (
                  <div className="mb-3 flex justify-center">
                    <span className="rounded-full border border-[#ece5ff] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                      {label}
                    </span>
                  </div>
                ) : null}
                <div className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
                  <div className={`flex max-w-[86%] flex-col ${isInbound ? "items-start" : "items-end"}`}>
                    <div
                      className={`relative px-3.5 py-2.5 text-[12px] leading-[1.5] shadow-sm ${
                        isInbound
                          ? "rounded-[18px] rounded-tl-[4px] bg-[#f3f4f6] text-[#1f1f2c]"
                          : "rounded-[18px] rounded-tr-[4px] bg-[#6d5bd0] text-white"
                      }`}
                    >
                      <span
                        className={`absolute -top-1.5 ${isInbound ? "-left-1.5" : "-right-1.5"} h-3.5 w-3.5 rounded-full border-2 border-white ${
                          isWhatsApp ? "bg-[#25d366]" : "bg-[#9ca3af]"
                        }`}
                        title={message.channel}
                      />
                      <div className="text-[11px] font-black uppercase tracking-[0.08em] opacity-80">
                        {message.messageType.replace(/_/g, " ")}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
                    </div>
                    <div className={`mt-1 text-[10px] ${isInbound ? "text-left" : "text-right"} text-[#8a90a6]`}>
                      {formatDate(at)}
                      <span className={`ml-2 font-semibold ${status.cls}`}>
                        {status.icon} {message.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-[#f0ecfa] bg-white p-3">
        <div className="flex gap-2">
          <select
            value={composeChannel}
            onChange={(event) => onComposeChannelChange(event.target.value === "sms" ? "sms" : "whatsapp")}
            className="h-10 rounded-[12px] border border-[#ddd1fb] bg-white px-3 text-[12px] font-semibold text-[#2a2346]"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
          <input
            value={composeText}
            onChange={(event) => onComposeTextChange(event.target.value)}
            placeholder="Write a message"
            className="h-10 min-w-0 flex-1 rounded-[12px] border border-[#ddd1fb] px-3 text-[13px] outline-none focus:border-[#6d5bd0]"
          />
          <button
            type="button"
            disabled={isSending || !composeText.trim()}
            onClick={onSend}
            className="h-10 rounded-[12px] bg-[#6d5bd0] px-4 text-[12px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-50"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpsellOpportunityCard({ data }: { data: AdminCustomerDetail }) {
  const longCoatPets = data.pets.filter((p) => isLongCoatBreed(p.breed));
  if (longCoatPets.length === 0) return null;

  // Find most recent booking with a low-tier package
  const recentLowTierBooking = data.bookingHistory.find(
    (b) => b.status === "completed" && shouldSuggestUpgrade(b.finalAmount)
  );
  if (!recentLowTierBooking) return null;

  const petLabel =
    longCoatPets.length === 1
      ? `${longCoatPets[0].name ?? longCoatPets[0].breed} (${longCoatPets[0].breed})`
      : `${longCoatPets.length} long-coat pets`;

  return (
    <section className="rounded-[22px] border border-[#fef3c7] bg-[#fffbeb] p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#92400e]">⚡ Upsell opportunity</div>
      <div className="mt-2 text-[14px] font-semibold text-[#78350f]">
        {petLabel} on {recentLowTierBooking.serviceName}
      </div>
      <div className="mt-1 text-[12px] text-[#92400e]">
        Long-coat breeds benefit from Complete Pampering — coat conditioning and full trim included.
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] text-[#78350f] line-through">
          ₹{recentLowTierBooking.finalAmount.toLocaleString("en-IN")}
        </span>
        <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-[12px] font-bold text-[#78350f]">→ ₹1,799</span>
      </div>
    </section>
  );
}

function NextBestAction({ data }: { data: AdminCustomerDetail }) {
  const { daysOverdue, openCaseCount, nextBookingAt } = data.overview;
  const { lifecycleStage } = data.customer;

  if (lifecycleStage === "support_hold" || openCaseCount > 0) {
    return (
      <section className="rounded-[22px] border border-[#fecaca] bg-[#fff5f5] p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#dc2626]">Next best action</div>
        <div className="mt-2 text-[14px] font-semibold text-[#991b1b]">Resolve open support case first</div>
        <div className="mt-1 text-[12px] text-[#b91c1c]">{openCaseCount} open case{openCaseCount > 1 ? "s" : ""} — this customer cannot rebook until resolved</div>
        <Link href="/admin/support" className="mt-3 inline-flex rounded-[10px] bg-[#dc2626] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#b91c1c] transition-colors">
          Go to Support →
        </Link>
      </section>
    );
  }

  if (nextBookingAt) {
    return (
      <section className="rounded-[22px] border border-[#d1fae5] bg-[#f0fdf4] p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#15803d]">Next best action</div>
        <div className="mt-2 text-[14px] font-semibold text-[#14532d]">Upcoming booking confirmed</div>
        <div className="mt-1 text-[12px] text-[#166534]">No action needed — customer has an upcoming visit scheduled</div>
      </section>
    );
  }

  if (daysOverdue !== null && daysOverdue >= 1 && daysOverdue <= 20) {
    return (
      <section className="rounded-[22px] border border-[#dbeafe] bg-[#eff6ff] p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#2563eb]">Next best action</div>
        <div className="mt-2 text-[14px] font-semibold text-[#1e3a5f]">Send a care tip message</div>
        <div className="mt-1 text-[12px] text-[#1d4ed8]">Last visit was {daysOverdue} days ago — keep the relationship warm</div>
        <Link href="/admin/campaigns" className="mt-3 inline-flex rounded-[10px] bg-[#2563eb] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1d4ed8] transition-colors">
          Prepare message →
        </Link>
      </section>
    );
  }

  if (daysOverdue !== null && daysOverdue >= 21 && daysOverdue <= 45) {
    return (
      <section className="rounded-[22px] border border-[#fde68a] bg-[#fffbeb] p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#d97706]">Next best action</div>
        <div className="mt-2 text-[14px] font-semibold text-[#78350f]">Due for rebooking</div>
        <div className="mt-1 text-[12px] text-[#92400e]">Last visit {daysOverdue} days ago — send a rebooking reminder now</div>
        <Link href="/admin/campaigns" className="mt-3 inline-flex rounded-[10px] bg-[#d97706] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#b45309] transition-colors">
          Send reminder →
        </Link>
      </section>
    );
  }

  if (daysOverdue !== null && daysOverdue > 45) {
    return (
      <section className="rounded-[22px] border border-[#fecaca] bg-[#fff5f5] p-4 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#dc2626]">Next best action</div>
        <div className="mt-2 text-[14px] font-semibold text-[#991b1b]">At risk of churn</div>
        <div className="mt-1 text-[12px] text-[#b91c1c]">Last visit {daysOverdue} days ago — consider a win-back offer with a discount</div>
        <Link href="/admin/coupons" className="mt-3 inline-flex rounded-[10px] bg-[#dc2626] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#b91c1c] transition-colors">
          Create offer →
        </Link>
      </section>
    );
  }

  return null;
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useAdminToast();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const [data, setData] = useState<AdminCustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [composeText, setComposeText] = useState("");
  const [composeChannel, setComposeChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!customerId) return;
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const result = await fetchAdminCustomerDetail(customerId);
      setData(result.customer);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load customer details.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedMessages = useMemo(
    () =>
      [...(data?.communications ?? [])].sort(
        (a, b) =>
          new Date(a.sentAt ?? a.preparedAt).getTime() -
          new Date(b.sentAt ?? b.preparedAt).getTime()
      ),
    [data?.communications]
  );

  const sendInlineMessage = useCallback(async () => {
    const content = composeText.trim();
    if (!customerId || !content) return;
    const tempMessage: AdminCustomerDetailMessage = {
      id: `optimistic-${Date.now()}`,
      bookingId: data?.bookingHistory[0]?.id ?? "",
      messageType: "admin_custom",
      channel: composeChannel,
      status: "queued",
      recipient: data?.customer.phoneFull ?? "",
      preparedAt: new Date().toISOString(),
      sentAt: null,
      content,
    };
    setData((prev) =>
      prev
        ? {
            ...prev,
            communications: [tempMessage, ...prev.communications],
          }
        : prev
    );
    setComposeText("");
    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: composeChannel, content }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to send message");
      setData((prev) =>
        prev
          ? {
              ...prev,
              communications: prev.communications.map((message) =>
                message.id === tempMessage.id ? body.message : message
              ),
            }
          : prev
      );
      showToast(
        body?.message?.status === "failed"
          ? "Message failed before provider handoff."
          : body?.message?.status === "sent"
          ? "Message sent."
          : body?.dispatchResult
            ? "Message handed to provider."
            : composeChannel === "sms"
              ? "SMS message queued."
              : "Message queued. WhatsApp provider is not configured.",
        body?.message?.status !== "failed"
      );
    } catch (sendError) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              communications: prev.communications.map((message) =>
                message.id === tempMessage.id
                  ? { ...message, status: "failed" }
                  : message
              ),
            }
          : prev
      );
      showToast(sendError instanceof Error ? sendError.message : "Failed to send message", false);
    } finally {
      setIsSendingMessage(false);
    }
  }, [composeChannel, composeText, customerId, data?.bookingHistory, data?.customer.phoneFull, showToast]);

  if (isLoading) {
    return <div className="p-8 text-[14px] text-[#7c8499]">Loading customer 360…</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-[14px] text-[#b42318]">{error || "Customer not found."}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title={data.customer.name}
          subtitle={`${data.customer.phoneFull} • ${data.customer.city ?? "No city"} • ${data.customer.lifecycleReason}`}
          onRefresh={() => void load(true)}
          isRefreshing={isRefreshing}
          rightSlot={
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/bookings?search=${encodeURIComponent(data.customer.phoneFull)}`}
                className="inline-flex h-[42px] items-center rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
              >
                Bookings
              </Link>
              <Link
                href={`/admin/messages?search=${encodeURIComponent(data.customer.phoneFull)}`}
                className="inline-flex h-[42px] items-center rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
              >
                Messages
              </Link>
              <Link
                href={`/admin/support?search=${encodeURIComponent(data.customer.phoneFull)}`}
                className="inline-flex h-[42px] items-center rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
              >
                Support
              </Link>
              <div className={`inline-flex rounded-full px-3 py-2 text-[12px] font-semibold ${toneClass(
                data.customer.lifecycleStage === "support_hold"
                  ? "danger"
                  : data.customer.lifecycleStage === "at_risk" || data.customer.lifecycleStage === "lost"
                    ? "warning"
                    : data.customer.lifecycleStage === "loyal_customer" || data.customer.lifecycleStage === "active_with_upcoming"
                      ? "success"
                      : "default"
              )}`}>
                {data.customer.lifecycleLabel}
              </div>
            </div>
          }
        />

        <AdminSummaryBar
          columnsClassName="sm:grid-cols-2 xl:grid-cols-6"
          items={[
            { label: "Completed bookings", value: data.overview.completedBookings },
            { label: "Upcoming bookings", value: data.overview.upcomingConfirmedBookings, tone: "success" },
            { label: "Net value", value: formatCurrency(data.overview.netValue) },
            { label: "Open cases", value: data.overview.openCaseCount, tone: data.overview.openCaseCount ? "warning" : "default" },
            { label: "Days overdue", value: data.overview.daysOverdue ?? "—", tone: data.overview.daysOverdue ? "danger" : "default" },
            { label: "Loyalty completed", value: data.loyalty.completedCount, tone: data.loyalty.freeUnlocked ? "success" : "default" },
          ]}
        />

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Overview</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[16px] border border-[#f0ecfa] p-4">
                  <div className="text-[12px] font-semibold text-[#8a90a6]">First booking</div>
                  <div className="mt-1 text-[13px] text-[#2a2346]">{formatDate(data.overview.firstBookingAt)}</div>
                </div>
                <div className="rounded-[16px] border border-[#f0ecfa] p-4">
                  <div className="text-[12px] font-semibold text-[#8a90a6]">Last completed</div>
                  <div className="mt-1 text-[13px] text-[#2a2346]">{formatDate(data.overview.lastCompletedAt)}</div>
                </div>
                <div className="rounded-[16px] border border-[#f0ecfa] p-4">
                  <div className="text-[12px] font-semibold text-[#8a90a6]">Next booking</div>
                  <div className="mt-1 text-[13px] text-[#2a2346]">{formatDate(data.overview.nextBookingAt)}</div>
                </div>
                <div className="rounded-[16px] border border-[#f0ecfa] p-4">
                  <div className="text-[12px] font-semibold text-[#8a90a6]">Expected next</div>
                  <div className="mt-1 text-[13px] text-[#2a2346]">{formatDate(data.overview.expectedNextBookingAt)}</div>
                </div>
                <div className="rounded-[16px] border border-[#f0ecfa] p-4">
                  <div className="text-[12px] font-semibold text-[#8a90a6]">Expected cycle</div>
                  <div className="mt-1 text-[13px] text-[#2a2346]">
                    {data.overview.expectedCycleDays ? `${data.overview.expectedCycleDays} days` : "—"}
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#f0ecfa] p-4">
                  <div className="text-[12px] font-semibold text-[#8a90a6]">Last message</div>
                  <div className="mt-1 text-[13px] text-[#2a2346]">{formatDate(data.overview.lastMessageAt)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Booking history</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[1120px] w-full">
                  <thead className="bg-[#faf9fd]">
                    <tr className="text-left">
                      {["Booking", "Service", "Status", "Payment", "Window", "Amount", "Team", "Groomer"].map((label) => (
                        <th key={label} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6] whitespace-nowrap">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookingHistory.map((booking) => (
                      <tr key={booking.id} className="border-t border-[#f0ecfa]">
                        <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                          <Link href={`/admin/bookings?search=${encodeURIComponent(booking.id)}`} className="font-semibold text-[#2a2346]">
                            {booking.id.slice(0, 8)}
                          </Link>
                          <div className="mt-1 text-[#8a90a6]">{formatDate(booking.completedAt ?? booking.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">{booking.serviceName}</td>
                        <td className="px-4 py-3.5">
                          <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClass(
                            booking.status === "completed"
                              ? "success"
                              : booking.status === "cancelled" || booking.status === "payment_expired"
                                ? "danger"
                                : booking.status === "confirmed"
                                  ? "default"
                                  : "warning"
                          )}`}>
                            {booking.statusLabel}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                          <div>{booking.paymentStatusLabel}</div>
                          <div className="mt-1 text-[#8a90a6]">{booking.paymentMethodLabel ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                          <div>{booking.selectedDate ?? "—"}</div>
                          <div className="mt-1 text-[#8a90a6]">{booking.bookingWindowLabel ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">
                          <div className="font-semibold text-[#2a2346]">{formatCurrency(booking.finalAmount)}</div>
                          <div className="mt-1 text-[#8a90a6]">Base {formatCurrency(booking.originalAmount)}</div>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">{booking.team?.name ?? "—"}</td>
                        <td className="px-4 py-3.5 text-[12px] text-[#4b5563]">{booking.groomerMember?.name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Timeline</h2>
              <div className="mt-4 space-y-3">
                {data.timeline.slice(0, 24).map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-[#f0ecfa] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-[#2a2346]">{item.title}</div>
                        <div className="mt-1 text-[12px] text-[#6b7280]">{item.description}</div>
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClass(item.tone)}`}>
                        {item.kind}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-[#8a90a6]">{formatDate(item.at)}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            {/* Upsell opportunity card */}
            <UpsellOpportunityCard data={data} />
            {/* Next best action card */}
            <NextBestAction data={data} />

            <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Signals</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.customer.riskFlags.length === 0 ? (
                  <span className="text-[13px] text-[#8a90a6]">No active signals.</span>
                ) : (
                  data.customer.riskFlags.map((flag) => (
                    <span key={flag} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${toneClass(
                      flag === "support_open" || flag === "complaint_history"
                        ? "danger"
                        : flag === "payment_risk" || flag === "due_soon"
                          ? "warning"
                          : "success"
                    )}`}>
                      {flag.replace(/_/g, " ")}
                    </span>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Latest address</h2>
                <div className="mt-4 text-[13px] leading-[1.6] text-[#4b5563]">
                  <div>{data.latestAddress?.serviceAddress ?? "No address stored yet."}</div>
                  <div className="mt-1 text-[#6b7280]">{data.latestAddress?.serviceLandmark ?? "—"}</div>
                  <div className="mt-1 text-[#6b7280]">{data.latestAddress?.servicePincode ?? "—"}</div>
                <div className="mt-2 text-[11px] text-[#8a90a6]">Updated {formatDate(data.latestAddress?.addressUpdatedAt ?? null)}</div>
                {data.latestAddress?.serviceLocationUrl ? (
                  <a
                    href={data.latestAddress.serviceLocationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex h-[36px] items-center rounded-[12px] border border-[#ddd1fb] px-3 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
                  >
                    Open map link
                  </a>
                ) : null}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Pets</h2>
              <div className="mt-4 space-y-3">
                {data.pets.map((pet) => (
                  <div key={pet.id} className="rounded-[16px] border border-[#f0ecfa] p-4">
                    <div className="text-[13px] font-semibold text-[#2a2346]">{pet.name ?? "Unnamed pet"}</div>
                    <div className="mt-1 text-[12px] text-[#6b7280]">{pet.breed} • {pet.species}</div>
                    <div className="mt-2 text-[12px] text-[#4b5563]">{pet.defaultGroomingNotes ?? pet.defaultStylingNotes ?? "No default notes saved."}</div>
                    <div className="mt-2 text-[11px] text-[#8a90a6]">Last booked {formatDate(pet.lastBookedAt)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Support and messages</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">Support cases</div>
                  <div className="mt-2 space-y-2">
                    {data.supportCases.length === 0 ? (
                      <div className="text-[13px] text-[#8a90a6]">No support cases.</div>
                    ) : (
                      data.supportCases.slice(0, 6).map((supportCase) => (
                        <div key={supportCase.id} className="rounded-[14px] border border-[#f0ecfa] p-3">
                          <div className="text-[13px] font-semibold text-[#2a2346]">{supportCase.summary}</div>
                          <div className="mt-1 text-[12px] text-[#6b7280]">
                            {supportCase.category.replace(/_/g, " ")} • {supportCase.status.replace(/_/g, " ")}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">Message thread</div>
                  <MessageThread
                    messages={orderedMessages}
                    composeText={composeText}
                    composeChannel={composeChannel}
                    isSending={isSendingMessage}
                    onComposeTextChange={setComposeText}
                    onComposeChannelChange={setComposeChannel}
                    onSend={() => void sendInlineMessage()}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
