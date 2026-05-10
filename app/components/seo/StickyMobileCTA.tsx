"use client";

import { Phone, MessageCircle, CalendarClock } from "lucide-react";
import { usePathname } from "next/navigation";

import { trackBookCTAClick, trackCallClick, trackWhatsAppClick } from "@/lib/analytics/clickTracking";
import { phoneTel, whatsappHref } from "@/lib/seo/businessInfo";

/**
 * Fixed bottom CTA bar shown on mobile (hidden on lg+ where the hero is
 * already conversion-focused). Three CTAs — WhatsApp, Call, Book Slot —
 * each firing a tracked click event with city + page context.
 *
 * Visibility rules:
 *   - Hidden on /booking and /pay/* (those flows have their own footer
 *     controls; a sticky bar would compete).
 *   - Hidden on admin / groomer / admin-login routes.
 *   - Visible everywhere else on mobile.
 *
 * The component is mounted from the root layout so adding a new public
 * route automatically picks up the bar without per-page wiring.
 */
export function StickyMobileCTA() {
  const pathname = usePathname() ?? "";

  // Hide on routes that don't want the bar competing with their own UI.
  const hiddenPrefixes = [
    "/booking",
    "/booking-preview",
    "/pay",
    "/admin",
    "/admin-login",
    "/groomer",
    "/groomer-login",
    "/thank-you",
  ];
  if (hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  // City-aware WhatsApp prefill — slug from the URL (set on the upcoming
  // /pet-grooming/<city> pages) feeds into the WhatsApp message and
  // tracking event.
  const citySlug = extractCitySlug(pathname);
  const whatsappCityLabel = citySlug ? cityLabelFromSlug(citySlug) : null;
  const whatsappMessage = whatsappCityLabel
    ? `Hi All Tails, I want to book pet grooming at home in ${whatsappCityLabel}. My area is ___ and my pet is a ___.`
    : "Hi All Tails, I'd like to book pet grooming at home for my pet.";
  const whatsappUrl = `${whatsappHref}?text=${encodeURIComponent(whatsappMessage)}`;

  const bookHref = citySlug ? `/booking?city=${encodeURIComponent(citySlug)}` : "/booking";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ece5fb] bg-white/95 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_28px_rgba(38,28,70,0.08)] backdrop-blur-md lg:hidden"
      role="navigation"
      aria-label="Quick actions"
    >
      <div className="mx-auto flex max-w-[520px] items-stretch gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppClick({ city: citySlug, source: "sticky_bar" })}
          aria-label="WhatsApp All Tails"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] bg-[#25D366]/10 py-2 text-[11.5px] font-semibold text-[#11724f] transition active:scale-[0.97]"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={phoneTel}
          onClick={() => trackCallClick({ city: citySlug, source: "sticky_bar" })}
          aria-label="Call All Tails"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] bg-[#f5f1ff] py-2 text-[11.5px] font-semibold text-[#5b49c8] transition active:scale-[0.97]"
        >
          <Phone className="h-4 w-4" />
          Call
        </a>
        <a
          href={bookHref}
          onClick={() => trackBookCTAClick({ city: citySlug, source: "sticky_bar" })}
          aria-label="Book a grooming slot"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] bg-[#6d5bd0] py-2 text-[11.5px] font-bold text-white shadow-[0_8px_18px_rgba(109,91,208,0.22)] transition active:scale-[0.97]"
        >
          <CalendarClock className="h-4 w-4" />
          Book Slot
        </a>
      </div>
    </div>
  );
}

function extractCitySlug(pathname: string): string | null {
  // Matches /pet-grooming/<slug>, /dog-grooming-at-home/<slug>,
  // /cat-grooming-at-home/<slug>. Returns the slug or null.
  const match = pathname.match(
    /^\/(?:pet-grooming|dog-grooming-at-home|cat-grooming-at-home)\/([a-z0-9-]+)\/?$/i
  );
  return match ? match[1].toLowerCase() : null;
}

const CITY_LABELS: Record<string, string> = {
  delhi: "Delhi",
  "delhi-ncr": "Delhi NCR",
  gurgaon: "Gurgaon",
  gurugram: "Gurgaon",
  noida: "Noida",
  "greater-noida": "Greater Noida",
  ghaziabad: "Ghaziabad",
  faridabad: "Faridabad",
  chandigarh: "Chandigarh",
  mohali: "Mohali",
  panchkula: "Panchkula",
  kharar: "Kharar",
  ludhiana: "Ludhiana",
  patiala: "Patiala",
};

function cityLabelFromSlug(slug: string): string {
  return CITY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
