"use client";

import type { GroomerBookingView } from "../../../../../lib/groomerPortal";
import { getTotalPacerMinutes } from "../../../../../lib/booking/pacerPhases";

type Props = {
  booking: GroomerBookingView;
  mode: "simple" | "hindi";
  onStart: () => void;
  onBack: () => void;
};

export function SessionStartModal({ booking, mode, onStart, onBack }: Props) {
  const totalMinutes = getTotalPacerMinutes(booking.service.name);
  const petName = booking.pets[0]?.name ?? "Pet";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6">
      <div className="w-full max-w-sm rounded-[32px] bg-[#1a1535] p-6 shadow-[0_-24px_80px_rgba(0,0,0,0.5)] border border-white/10">

        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#16a34a]/20 text-[32px]">
          ⏱️
        </div>

        {/* Heading */}
        <h2 className="text-center text-[22px] font-black tracking-[-0.02em] text-white">
          {mode === "simple"
            ? `${petName} — Ready!`
            : `${petName} — तैयार हैं!`}
        </h2>

        {/* Body */}
        <div className="mt-4 rounded-[20px] bg-white/6 px-5 py-4 text-center">
          <p className="text-[15px] leading-[1.7] text-white/80">
            {mode === "simple"
              ? `Aaj ka session lagbhag ${totalMinutes} minute ka hoga. Timer shuru hoga — ek ek step mein focus karo.`
              : `आज का सेशन लगभग ${totalMinutes} मिनट का होगा। टाइमर शुरू होगा — एक-एक स्टेप पर ध्यान दो।`}
          </p>
          <div className="mt-3 text-[13px] font-semibold text-[#a78bfa]">
            {mode === "simple"
              ? `~${totalMinutes} min · ${booking.service.name}`
              : `~${totalMinutes} मिनट · ${booking.service.name}`}
          </div>
        </div>

        <p className="mt-3 text-center text-[12px] text-white/40">
          {mode === "simple"
            ? "Link dobara khologe to wahi jagah se shuru hoga."
            : "लिंक दोबारा खोलोगे तो वहीं से शुरू होगा।"}
        </p>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-[18px] border border-white/15 bg-white/8 px-4 py-3.5 text-[15px] font-semibold text-white/60"
          >
            {mode === "simple" ? "Peeche" : "वापस"}
          </button>
          <button
            type="button"
            onClick={onStart}
            className="flex-[2] rounded-[18px] bg-[#16a34a] px-4 py-3.5 text-[16px] font-black text-white shadow-[0_6px_20px_rgba(22,163,74,0.4)]"
          >
            {mode === "simple" ? "Shuru Karo" : "शुरू करो"}
          </button>
        </div>
      </div>
    </div>
  );
}
