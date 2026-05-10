/**
 * Attribution capture + persistence.
 *
 * Purpose: when a user lands from a Google/Meta ad, the URL carries
 * tracking params (gclid, utm_source, utm_campaign, ?city=...). Those params
 * vanish as soon as the user navigates away. We persist them in localStorage
 * so the booking flow (which may happen 2 clicks or 2 days later) can attach
 * them to the booking-create call. Without this the upload of offline
 * conversions back to Google Ads loses attribution.
 *
 * First touch wins: we never overwrite a non-null gclid with a later visit,
 * since the first ad click is what Google Ads charged us for.
 */

const STORAGE_KEY = "alltails_attribution";
const ATTRIBUTION_TTL_DAYS = 90; // matches Google Ads default click-through window

export type Attribution = {
  gclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_adgroup?: string;
  utm_keyword?: string;
  utm_content?: string;
  city?: string;
  service?: string;
  landing_page?: string;
  captured_at?: string; // ISO timestamp
};

const isBrowser = () => typeof window !== "undefined";

const safeParse = (raw: string | null): Attribution | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Attribution;
  } catch {
    return null;
  }
};

const isFresh = (capturedAt?: string) => {
  if (!capturedAt) return true;
  const ms = Date.now() - new Date(capturedAt).getTime();
  if (!Number.isFinite(ms)) return true;
  return ms < ATTRIBUTION_TTL_DAYS * 86_400_000;
};

const ATTRIBUTION_FIELDS: Array<keyof Attribution> = [
  "gclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_adgroup",
  "utm_keyword",
  "utm_content",
  "city",
  "service",
];

/**
 * Read tracking params from the current URL. Does NOT persist anything.
 */
export function readAttributionFromUrl(): Attribution {
  if (!isBrowser()) return {};
  const params = new URLSearchParams(window.location.search);
  const result: Attribution = {};

  for (const key of ATTRIBUTION_FIELDS) {
    const value = params.get(key);
    if (value && value.trim()) {
      result[key] = value.trim();
    }
  }
  // Normalize city slug to a clean lowercase form so all downstream
  // consumers (booking flow, WhatsApp prefill, event params) see the same
  // shape regardless of campaign URL casing.
  if (result.city) result.city = result.city.toLowerCase();
  if (result.service) result.service = result.service.toLowerCase();

  return result;
}

/**
 * Persist the URL's tracking params on first touch. First touch wins —
 * later visits don't overwrite an existing gclid, since that's what Google
 * Ads charged us for. Non-conversion params (city, service) DO update on
 * each landing, so the most recent city selection is what the booking
 * flow uses.
 */
export function captureAttributionOnFirstTouch(): void {
  if (!isBrowser()) return;

  const fromUrl = readAttributionFromUrl();
  if (Object.keys(fromUrl).length === 0) return;

  const existing = safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? {};
  const stale = !isFresh(existing.captured_at);

  // First-touch fields preserve the original ad click; we only set them
  // if they're not already present (or have expired).
  const firstTouchFields: Array<keyof Attribution> = [
    "gclid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_adgroup",
    "utm_keyword",
    "utm_content",
  ];

  const next: Attribution = stale ? { ...fromUrl } : { ...existing };

  if (!stale) {
    for (const key of firstTouchFields) {
      const fromUrlValue = fromUrl[key];
      if (fromUrlValue && !existing[key]) {
        next[key] = fromUrlValue;
      }
    }
    // City + service are "most recent" rather than "first touch" — the
    // current page's city is what matters for the next CTA.
    if (fromUrl.city) next.city = fromUrl.city;
    if (fromUrl.service) next.service = fromUrl.service;
  }

  // Landing page is recorded once per session if not yet set.
  if (!next.landing_page) {
    next.landing_page = window.location.pathname + window.location.search;
  }
  if (!next.captured_at || stale) {
    next.captured_at = new Date().toISOString();
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be disabled (private mode, quota). Silent.
  }
}

/**
 * Read the persisted attribution. Returns an empty object when no
 * attribution has been captured yet (or when localStorage is unavailable).
 */
export function getAttribution(): Attribution {
  if (!isBrowser()) return {};
  const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
  if (!stored) return {};
  if (!isFresh(stored.captured_at)) return {};
  return stored;
}

/**
 * Read attribution merged with whatever the current URL still carries.
 * Useful for events fired during the same session as the landing — we
 * want today's URL params to take precedence over yesterday's stored
 * ones.
 */
export function getEventAttribution(): Attribution {
  return { ...getAttribution(), ...readAttributionFromUrl() };
}
