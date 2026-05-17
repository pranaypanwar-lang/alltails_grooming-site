"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Fuel, MapPin, TriangleAlert } from "lucide-react";
import { clientHaversineKm, calculateFuelCost } from "../../../../../lib/groomer/geoDistance";

const RATE_PER_LITRE = 97;
const KM_PER_LITRE = 35;
const RATE_PER_KM = Math.round((RATE_PER_LITRE / KM_PER_LITRE) * 100) / 100;

type Props = {
  mode: "simple" | "hindi";
  bookingId: string;
  tokenQuery: string;
  enRouteLat: number | null;
  enRouteLng: number | null;
  arrivedLat: number;
  arrivedLng: number;
  onConfirmed: () => void;
  onError: (msg: string) => void;
};

export function FuelApprovalSheet({
  mode,
  bookingId,
  tokenQuery,
  enRouteLat,
  enRouteLng,
  arrivedLat,
  arrivedLng,
  onConfirmed,
  onError,
}: Props) {
  const [distanceInput, setDistanceInput] = useState("");
  const [busy, setBusy] = useState(false);

  const estimatedKm =
    enRouteLat !== null && enRouteLng !== null
      ? clientHaversineKm(enRouteLat, enRouteLng, arrivedLat, arrivedLng)
      : 0;

  useEffect(() => {
    setDistanceInput(String(estimatedKm > 0 ? estimatedKm : ""));
  }, [estimatedKm]);

  const parsedKm = parseFloat(distanceInput);
  const validKm = Number.isFinite(parsedKm) && parsedKm >= 0;
  const { fuelCost, litres } = validKm
    ? calculateFuelCost(parsedKm, RATE_PER_LITRE, KM_PER_LITRE)
    : { fuelCost: 0, litres: 0 };

  const confirm = async () => {
    if (!validKm) {
      onError(mode === "simple" ? "Sahi distance likhein." : "सही दूरी लिखें।");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/groomer/bookings/${bookingId}/fuel-trip${tokenQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrivedLat,
          arrivedLng,
          approvedDistanceKm: parsedKm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fuel save nahi ho paaya.");
      onConfirmed();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Kuch galat ho gaya.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-[rgba(20,14,35,0.55)] px-3 pb-4 pt-20">
      <div className="w-full max-w-md rounded-[32px] bg-white p-5 shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eff6ff]">
            <MapPin className="h-5 w-5 text-[#2563eb]" />
          </div>
          <div>
            <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">
              {mode === "simple" ? "Pahunch gaye — trip confirm karein" : "पहुँच गए — यात्रा कन्फर्म करें"}
            </div>
            <div className="mt-0.5 text-[13px] text-[#6b7280]">
              {mode === "simple"
                ? "Fuel trip save hogi. Galat lage to change kar sakte hain."
                : "फ्यूल ट्रिप सेव होगी। गलत लगे तो बदल सकते हैं।"}
            </div>
          </div>
        </div>

        {/* Distance row */}
        <div className="mt-5 rounded-[22px] border border-[#dbeafe] bg-[#eff6ff] p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#2563eb]">
            {mode === "simple" ? "Distance (km)" : "दूरी (किमी)"}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.1"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              className="h-[52px] w-[120px] rounded-[14px] border border-[#bfdbfe] bg-white px-4 text-center text-[20px] font-black text-[#1f1f2c] outline-none focus:border-[#2563eb]"
            />
            <div className="text-[14px] text-[#4b5563]">
              {mode === "simple" ? "km travelled" : "किमी सफर किया"}
            </div>
          </div>
          {estimatedKm > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#2563eb]">
              <TriangleAlert className="h-3.5 w-3.5" />
              {mode === "simple"
                ? `GPS estimate: ~${estimatedKm} km. Edit if wrong.`
                : `GPS अनुमान: ~${estimatedKm} किमी। गलत हो तो बदलें।`}
            </div>
          )}
        </div>

        {/* Fuel calculation */}
        <div className="mt-3 rounded-[22px] border border-[#d1fae5] bg-[#f0fdf4] p-4">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-[#15803d]" />
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#15803d]">
              {mode === "simple" ? "Fuel calculation" : "फ्यूल कैलकुलेशन"}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-[32px] font-black tracking-[-0.03em] text-[#15803d]">
                ₹{fuelCost}
              </div>
              <div className="text-[12px] text-[#4b5563]">
                {litres.toFixed(2)} L × ₹{RATE_PER_LITRE}/L
              </div>
            </div>
            <div className="text-right text-[12px] text-[#6b7280]">
              <div>₹{RATE_PER_KM}/km</div>
              <div>{KM_PER_LITRE} km/L avg</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy || !validKm}
          className="mt-4 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#16a34a] text-[16px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            mode === "simple" ? "Save ho raha hai..." : "सेव हो रहा है..."
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              {mode === "simple" ? "Confirm & Arrive" : "कन्फर्म और आगे बढ़ें"}
            </>
          )}
        </button>

        <div className="mt-3 text-center text-[11px] text-[#9ca3af]">
          {mode === "simple"
            ? "Baad mein bhi adjustment request bhej sakte ho."
            : "बाद में एडजस्टमेंट रिक्वेस्ट भी भेज सकते हो।"}
        </div>
      </div>
    </div>
  );
}
