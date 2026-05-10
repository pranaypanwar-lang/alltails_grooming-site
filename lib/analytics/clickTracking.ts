import { getEventAttribution } from "./attribution";

/**
 * Lightweight gtag/dataLayer event helpers for CTA clicks (WhatsApp, Call,
 * Book Slot). These complement the existing Meta Pixel + Google Ads
 * conversion stack — they give Google Analytics + GTM granular signal on
 * intent clicks so we can:
 *   - measure WhatsApp lift per city/service
 *   - score landing-page conversion rate properly
 *   - feed Smart Bidding richer signal beyond the booking-confirm event
 *
 * Each event carries city + service + page_url + landing_page + utm_* +
 * gclid, sourced from the persisted attribution store. That lets Google
 * Ads attribute the click back to the originating campaign even when the
 * user navigated through several pages first.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const isBrowser = () => typeof window !== "undefined";

type CtaContext = {
  city?: string | null;
  service?: string | null;
  page?: string;
  package?: string | null;
  source?: string; // e.g. "sticky_bar", "hero", "footer"
};

const sanitize = (params: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

const buildEventPayload = (eventName: string, context: CtaContext) => {
  const attribution = getEventAttribution();
  const pageUrl = isBrowser() ? window.location.pathname + window.location.search : undefined;

  return sanitize({
    event: eventName,
    city: context.city ?? attribution.city,
    service_type: context.service ?? attribution.service,
    package_name: context.package,
    source: context.source,
    page_url: pageUrl,
    landing_page: attribution.landing_page,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_adgroup: attribution.utm_adgroup,
    utm_keyword: attribution.utm_keyword,
    utm_content: attribution.utm_content,
    gclid: attribution.gclid,
  });
};

const pushDataLayer = (payload: Record<string, unknown>) => {
  if (!isBrowser()) return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
};

const fireGtagEvent = (eventName: string, payload: Record<string, unknown>) => {
  if (!isBrowser() || typeof window.gtag !== "function") return;
  // gtag accepts an arbitrary param object; we drop the redundant "event" key.
  const { event: _event, ...rest } = payload;
  void _event;
  window.gtag("event", eventName, rest);
};

export function trackWhatsAppClick(context: CtaContext = {}) {
  const payload = buildEventPayload("whatsapp_click", context);
  pushDataLayer(payload);
  fireGtagEvent("whatsapp_click", payload);
}

export function trackCallClick(context: CtaContext = {}) {
  const payload = buildEventPayload("call_click", context);
  pushDataLayer(payload);
  fireGtagEvent("call_click", payload);
}

export function trackBookCTAClick(context: CtaContext = {}) {
  const payload = buildEventPayload("book_slot_click", context);
  pushDataLayer(payload);
  fireGtagEvent("book_slot_click", payload);
}
