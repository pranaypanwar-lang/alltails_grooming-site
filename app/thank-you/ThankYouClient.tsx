"use client";

import { Check, MessageCircle, Phone, Share2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import {
  trackGoogleAdsBookingConversion,
  trackGoogleAdsPurchaseConversion,
} from "@/lib/analytics/googleAds";
import {
  buildBookingEventId,
  buildServiceMeta,
  trackMetaEvent,
} from "@/lib/analytics/metaPixel";
import { trackWhatsAppClick, trackCallClick } from "@/lib/analytics/clickTracking";
import { phoneTel, whatsappHref } from "@/lib/seo/businessInfo";
import { slugToCity } from "@/lib/cities/slugs";

const CITY_DISPLAY: Record<string, string> = {
  delhi: "Delhi",
  "delhi-ncr": "Delhi NCR",
  gurgaon: "Gurgaon",
  noida: "Noida",
  ghaziabad: "Ghaziabad",
  faridabad: "Faridabad",
  chandigarh: "Chandigarh",
  mohali: "Mohali",
  panchkula: "Panchkula",
  ludhiana: "Ludhiana",
  patiala: "Patiala",
};

function ThankYouInner() {
  const params = useSearchParams();
  const citySlug = params.get("city")?.toLowerCase() ?? null;
  const bookingId = params.get("booking") ?? null;
  const valueParam = params.get("value");
  const phoneParam = params.get("phone");
  const fired = useRef(false);

  // City display for the message + greeting. Falls back gracefully if the
  // URL didn't carry a city param.
  const cityLabel = citySlug ? CITY_DISPLAY[citySlug] ?? slugToCity(citySlug) ?? null : null;

  // Derive the WhatsApp message directly from cityLabel — no state needed.
  // (Previously this was setState inside an effect, which lint correctly
  // flagged as a cascading-render anti-pattern.)
  const whatsappMessage = cityLabel
    ? `Hi All Tails, I just submitted a pet grooming request in ${cityLabel}. Could you confirm my slot?`
    : "Hi All Tails, I just submitted a grooming request and want to confirm the slot.";

  useEffect(() => {
    // Conversion-on-pageview: fire once per mount. Refresh-protected via
    // ref so a page reload doesn't double-count. Even when the booking
    // flow's inline gtag events have already fired, this is the canonical
    // "destination URL" conversion that Google Ads uses for Smart Bidding
    // and offline conversion uploads.
    if (fired.current) return;
    fired.current = true;

    const numericValue = valueParam ? Number(valueParam) : null;
    const eventValue = numericValue !== null && Number.isFinite(numericValue) ? numericValue : 0;
    const phone = phoneParam ?? undefined;

    // Google Ads booking conversion (Lead action) — fires for every
    // thank-you visit. The phone is passed for enhanced conversions.
    trackGoogleAdsBookingConversion(eventValue, phone);

    // If the URL carries a booking ID + value, treat this as a fully
    // completed purchase and also fire the purchase conversion. Pure
    // lead/form-submit thank-yous skip this.
    if (bookingId && eventValue > 0) {
      trackGoogleAdsPurchaseConversion(eventValue, bookingId, phone);

      trackMetaEvent(
        "Purchase",
        buildServiceMeta("Booking confirmed", {
          value: eventValue,
          currency: "INR",
          city: cityLabel ?? undefined,
          booking_id: bookingId,
        }),
        { eventID: buildBookingEventId("purchase", bookingId) }
      );
    } else {
      // Fire Lead for unattributed thank-yous so we still capture the
      // funnel signal in Meta + Ads even if booking value is unknown.
      const fallbackEventId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      trackMetaEvent(
        "Lead",
        buildServiceMeta("Booking request", {
          value: eventValue,
          currency: "INR",
          city: cityLabel ?? undefined,
        }),
        { eventID: fallbackEventId }
      );
    }
  }, [bookingId, valueParam, phoneParam, cityLabel]);

  const whatsappUrl = `${whatsappHref}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleShare = async () => {
    const shareData = {
      title: "All Tails — At-Home Pet Grooming",
      text: "I just booked at-home pet grooming with All Tails — trained groomers at your doorstep, starting from ₹999.",
      url: "https://alltails.in",
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
      } else {
        window.open(
          `${whatsappHref}?text=${encodeURIComponent(
            `${shareData.text} ${shareData.url}`
          )}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch {
      // user cancelled share — do nothing
    }
  };

  return (
    <main className="relative min-h-[100dvh] bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)] px-5 py-12">
      <div className="pointer-events-none absolute -right-[120px] -top-[140px] h-[420px] w-[420px] rounded-full bg-[#e9defa] opacity-70 blur-[110px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-[180px] -left-[140px] h-[460px] w-[460px] rounded-full bg-[#fff0e3] opacity-50 blur-[120px]" aria-hidden />

      <div className="relative mx-auto w-full max-w-[520px] rounded-[32px] border border-[#e2d6f7] bg-[linear-gradient(180deg,#fbf7ff_0%,#ffffff_55%,#fff7ef_100%)] px-6 py-8 text-center shadow-[0_24px_60px_rgba(38,28,70,0.10)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#18a34a] text-white shadow-[0_14px_30px_rgba(24,163,74,0.32)]">
          <Check className="h-6 w-6" strokeWidth={3} />
        </div>

        <h1 className="mt-5 text-[26px] font-black leading-[1.15] tracking-[-0.03em] text-[#241b4b]">
          You&apos;re in — we&apos;ll be in touch shortly.
        </h1>

        <p className="mx-auto mt-2.5 max-w-[360px] text-[14px] font-medium leading-[1.6] text-[#6b7280]">
          {cityLabel
            ? `Your pet grooming request for ${cityLabel} has been received. Our team will reach out on WhatsApp or phone within the hour.`
            : "Your pet grooming request has been received. Our team will reach out on WhatsApp or phone within the hour."}
        </p>

        {bookingId ? (
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-[#e0d6f7] bg-white/80 px-3.5 py-1.5 text-[12px] font-medium text-[#6b7280] backdrop-blur">
            <span className="text-[#9088b8]">Booking</span>
            <span className="font-mono font-semibold text-[#241b4b]">{bookingId}</span>
          </div>
        ) : null}

        <div className="mt-7 grid gap-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick({ city: citySlug, source: "thank_you" })}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366] text-[14.5px] font-semibold text-white shadow-[0_10px_22px_rgba(37,211,102,0.28)]"
          >
            <MessageCircle className="h-4 w-4" />
            Continue on WhatsApp
          </a>
          <a
            href={phoneTel}
            onClick={() => trackCallClick({ city: citySlug, source: "thank_you" })}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-[#ded7f1] bg-white text-[14.5px] font-semibold text-[#5b49c8] transition active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" />
            Call us
          </a>
        </div>

        <div className="mt-5 border-t border-[#ede8f7] pt-5">
          <p className="text-[12px] font-medium text-[#9088b8]">Know someone with a pet?</p>
          <button
            type="button"
            onClick={handleShare}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#e2d9f3] bg-[#faf8ff] py-3 text-[13.5px] font-semibold text-[#6d5bd0] transition active:scale-[0.98]"
          >
            <Share2 className="h-4 w-4" />
            Share All Tails with a friend
          </button>
        </div>

        <Link
          href="/"
          className="mt-5 inline-block text-[12.5px] font-medium text-[#9088b8] underline decoration-[#cfc7df] underline-offset-[3px]"
        >
          Back to All Tails homepage
        </Link>
      </div>
    </main>
  );
}

export function ThankYouClient() {
  // useSearchParams() must run inside a Suspense boundary in App Router.
  return (
    <Suspense fallback={null}>
      <ThankYouInner />
    </Suspense>
  );
}
