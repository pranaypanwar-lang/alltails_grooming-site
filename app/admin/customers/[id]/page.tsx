"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchAdminCustomerDetail } from "../../lib/api";
import type { AdminCustomerDetail } from "../../types";
import { AdminPageHeader } from "../../components/common/AdminPageHeader";
import { AdminSummaryBar } from "../../components/common/AdminSummaryBar";

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

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const [data, setData] = useState<AdminCustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

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
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">Recent messages</div>
                  <div className="mt-2 space-y-2">
                    {data.communications.length === 0 ? (
                      <div className="text-[13px] text-[#8a90a6]">No message history.</div>
                    ) : (
                      data.communications.slice(0, 6).map((message) => (
                        <div key={message.id} className="rounded-[14px] border border-[#f0ecfa] p-3">
                          <div className="text-[13px] font-semibold text-[#2a2346]">{message.messageType.replace(/_/g, " ")}</div>
                          <div className="mt-1 text-[12px] text-[#6b7280]">
                            {message.channel} • {message.status} • {formatDate(message.sentAt ?? message.preparedAt)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
