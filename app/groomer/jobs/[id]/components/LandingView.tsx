"use client";

import type { GroomerBookingView } from "../../../../../lib/groomerPortal";

type Props = {
  booking: GroomerBookingView;
  mode: "simple" | "hindi";
  dispatchState: string;
  now: number;
  isPreview?: boolean;
  onNikalGaye: () => void;
  onPahunchGaye: () => void;
};

function formatCountdown(ms: number, mode: "simple" | "hindi") {
  if (ms <= 0) {
    const abs = Math.abs(ms);
    const m = Math.floor(abs / 60000);
    if (mode === "simple") return `${m} min late`;
    return `${m} मिनट देर`;
  }
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildMapsUrl(booking: GroomerBookingView) {
  if (booking.addressInfo.serviceLocationUrl) return booking.addressInfo.serviceLocationUrl;
  const parts = [
    booking.addressInfo.serviceAddress,
    booking.addressInfo.serviceLandmark,
    booking.addressInfo.servicePincode,
    booking.customer.city,
  ].filter(Boolean);
  if (!parts.length) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}

export function LandingView({ booking, mode, dispatchState, now, isPreview, onNikalGaye, onPahunchGaye }: Props) {
  const pet = booking.pets[0];
  const customer = booking.customer;
  const mapsUrl = buildMapsUrl(booking);
  const isEnRoute = dispatchState === "en_route";

  // Pre-arrival timer
  const slotStartMs = booking.bookingWindow?.startTime ? new Date(booking.bookingWindow.startTime).getTime() : null;
  const msUntilSlot = slotStartMs ? slotStartMs - now : null;
  const isLate = msUntilSlot !== null && msUntilSlot < 0;
  const timerLabel = msUntilSlot !== null ? formatCountdown(msUntilSlot, mode) : null;

  const timerBg = isLate
    ? "bg-[#fff1f2] border-[#fecaca] text-[#be123c]"
    : msUntilSlot !== null && msUntilSlot < 900_000
      ? "bg-[#fffbeb] border-[#fde68a] text-[#b45309]"
      : "bg-[#effaf3] border-[#bbf7d0] text-[#15803d]";

  const phoneHref = customer.phone ? `tel:${customer.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ff_0%,#efe9ff_100%)]">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ece5ff] bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="text-[12px] font-black uppercase tracking-[0.1em] text-[#8a90a6]">All Tails</div>
        {isPreview ? (
          <div className="rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-bold text-[#92400e]">
            Preview
          </div>
        ) : null}
      </div>

      <div className="mx-auto max-w-md px-4 pb-10 pt-5">

        {/* Pre-arrival timer — prominent top card */}
        {timerLabel ? (
          <div className={`mb-4 flex items-center justify-between rounded-[20px] border px-4 py-3.5 ${timerBg}`}>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.1em] opacity-70">
                {isLate
                  ? (mode === "simple" ? "Late ho gaye" : "देर हो गई")
                  : (mode === "simple" ? "Slot shuru hone mein" : "स्लॉट में बचा समय")}
              </div>
              <div className="mt-0.5 font-mono text-[30px] font-black tracking-[-0.04em]">
                {timerLabel}
              </div>
            </div>
            <div className="text-right text-[12px] font-semibold opacity-70">
              <div>{booking.bookingWindow?.label ?? "—"}</div>
              {isLate ? (
                <div className="mt-1 rounded-full border border-current px-2 py-0.5 text-[11px] font-black uppercase">
                  {mode === "simple" ? "Jaldi jao!" : "जल्दी जाओ!"}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Ops note */}
        {booking.opsNote ? (
          <div className="mb-4 rounded-[20px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5">
            <div className="text-[11px] font-black uppercase tracking-[0.1em] text-[#b45309]">
              {mode === "simple" ? "Ops note" : "ऑप्स नोट"}
            </div>
            <div className="mt-1.5 text-[13.5px] leading-[1.65] text-[#78350f]">{booking.opsNote}</div>
          </div>
        ) : null}

        {/* Main booking card */}
        <div className="rounded-[28px] border border-[#eadffd] bg-white p-5 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">

          {/* Pet section */}
          <div className="flex items-center gap-4">
            {pet?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={pet.avatarUrl}
                alt={pet.name ?? "Pet"}
                className="h-[72px] w-[72px] rounded-[18px] border border-[#ece5ff] object-cover"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-[#f0ecff] text-[30px]">
                🐾
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[24px] font-black tracking-[-0.03em] text-[#1f1f2c]">
                {pet?.name ?? "Pet"}
              </div>
              <div className="mt-0.5 text-[13px] text-[#6b7280]">{pet?.breed ?? ""}</div>
              <div className="mt-1.5 inline-flex rounded-full bg-[#6d5bd0]/10 px-2.5 py-1 text-[11px] font-bold text-[#5b4bc2]">
                {booking.service.name}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-[#f3f0fb]" />

          {/* Details rows */}
          <div className="space-y-2.5">

            {/* Slot */}
            {booking.bookingWindow ? (
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">
                  {mode === "simple" ? "Slot" : "स्लॉट"}
                </span>
                <span className="text-[14px] font-bold text-[#1f1f2c]">{booking.bookingWindow.label}</span>
              </div>
            ) : null}

            {/* Customer + phone */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">
                {mode === "simple" ? "Customer" : "ग्राहक"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#1f1f2c]">{customer.name}</span>
                {phoneHref ? (
                  <a
                    href={phoneHref}
                    className="rounded-full bg-[#6d5bd0]/10 px-2.5 py-1 text-[12px] font-bold text-[#5b4bc2]"
                  >
                    📞 {customer.phone}
                  </a>
                ) : null}
              </div>
            </div>

            {/* Address */}
            {booking.addressInfo.serviceAddress ? (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 pt-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">
                  {mode === "simple" ? "Address" : "पता"}
                </span>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-right text-[13.5px] font-semibold leading-[1.5] text-[#5b4bc2] underline underline-offset-2"
                  >
                    {booking.addressInfo.serviceAddress}
                    {booking.addressInfo.serviceLandmark ? `, ${booking.addressInfo.serviceLandmark}` : ""}
                    <span className="ml-1 text-[11px] no-underline opacity-60">↗</span>
                  </a>
                ) : (
                  <span className="text-right text-[13.5px] leading-[1.5] text-[#4b5563]">
                    {booking.addressInfo.serviceAddress}
                  </span>
                )}
              </div>
            ) : null}

            {/* Payment */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">
                {mode === "simple" ? "Amount" : "रकम"}
              </span>
              <span className="text-[14px] font-bold text-[#1f1f2c]">₹{booking.payment.finalAmount}</span>
            </div>
          </div>

        </div>

        {/* Action buttons */}
        <div className="mt-5 space-y-3">

          {isEnRoute ? (
            /* En route state: Pahunch Gaya is primary */
            <>
              <button
                type="button"
                onClick={onPahunchGaye}
                className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-[#16a34a] px-6 py-5 text-[17px] font-black text-white shadow-[0_8px_24px_rgba(22,163,74,0.3)] active:scale-[0.98] transition-transform"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {mode === "simple" ? "Pahunch Gaya / Gayi" : "पहुँच गया / गई"}
              </button>

              <div className="flex items-center gap-2 rounded-[16px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-semibold text-[#15803d]">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {mode === "simple" ? "Nikal gaye — raste mein ho" : "निकल गए — रास्ते में हो"}
              </div>
            </>
          ) : (
            /* Assigned state: Nikal Gaya is primary */
            <>
              <button
                type="button"
                onClick={onNikalGaye}
                className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-[#6d5bd0] px-6 py-5 text-[17px] font-black text-white shadow-[0_8px_24px_rgba(109,91,208,0.3)] active:scale-[0.98] transition-transform"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                {mode === "simple" ? "Nikal Gaya / Gayi" : "निकल गया / गई"}
              </button>

              <button
                type="button"
                onClick={onPahunchGaye}
                className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#ddd1fb] bg-white px-6 py-4 text-[15px] font-semibold text-[#5b4bc2] active:bg-[#f8f5ff] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {mode === "simple" ? "Seedha pahunch gaye?" : "सीधे पहुँच गए?"}
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-center text-[11px] text-[#9ca3af]">
          {isEnRoute
            ? (mode === "simple" ? "Pahunch jaate hi 'Pahunch Gaya' dabao — session shuru hoga" : "पहुँचते ही 'पहुँच गया' दबाएं — सेशन शुरू होगा")
            : (mode === "simple" ? "'Nikal Gaya' dabao jab ghar se niklo" : "'निकल गया' दबाएं जब घर से निकलो")}
        </div>
      </div>
    </div>
  );
}
