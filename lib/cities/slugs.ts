/**
 * URL slug ↔ canonical city name mapping. Single source of truth so
 * landing-page slugs, booking flow prefill, and tracking events always
 * see the same city representation regardless of how the URL was written.
 *
 * Canonical names match the entries in lib/booking/constants.ts so the
 * booking flow's city dropdown accepts them as-is.
 */

import { SUPPORTED_CITIES, type SupportedCity } from "@/lib/booking/constants";

// Slug → canonical (e.g. "delhi-ncr" → "Delhi"). Aliases let us accept
// marketing-style URLs ("delhi-ncr") and the strict city name slugs
// ("delhi") without breaking either.
const SLUG_TO_CITY: Record<string, SupportedCity> = {
  delhi: "Delhi",
  "delhi-ncr": "Delhi",
  ncr: "Delhi",
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

/**
 * Resolve a URL slug (case-insensitive) to a canonical city name, or
 * undefined if the slug isn't recognised. Use for prefilling forms and
 * generating WhatsApp deep links from the landing page slug.
 */
export function slugToCity(slug: string | null | undefined): SupportedCity | undefined {
  if (!slug) return undefined;
  const key = slug.trim().toLowerCase();
  return SLUG_TO_CITY[key];
}

/**
 * Reverse map for generating canonical URL slugs from a city name.
 * Always returns the lowercased dash form (e.g. "Delhi" → "delhi",
 * "Greater Noida" → "greater-noida").
 */
export function cityToSlug(city: SupportedCity): string {
  return city.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Display order for city pages in nav/footer. Larger metros first;
 * Chandigarh tricity grouped, Punjab cities last.
 */
export const CITY_DISPLAY_ORDER: readonly SupportedCity[] = [
  "Delhi",
  "Gurgaon",
  "Noida",
  "Faridabad",
  "Ghaziabad",
  "Greater Noida",
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Ludhiana",
  "Patiala",
] as const;

// Sanity check at module load: every CITY_DISPLAY_ORDER entry is a
// SupportedCity. (Compile-time only — Kharar isn't currently in the
// display order but remains a supported booking city.)
void SUPPORTED_CITIES;
