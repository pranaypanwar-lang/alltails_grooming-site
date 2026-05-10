"use client";

import { useEffect } from "react";

import { captureAttributionOnFirstTouch } from "@/lib/analytics/attribution";

/**
 * Mount-time hook that reads ?gclid / ?utm_* / ?city / ?service from the
 * current URL and persists them to localStorage with a 90-day TTL. Mounted
 * once at the root layout so attribution is captured for every landing,
 * regardless of which route the user lands on. Subsequent navigation
 * doesn't overwrite first-touch fields (gclid + utm_*); city/service
 * update to the latest because they reflect the user's intent on this
 * visit.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttributionOnFirstTouch();
  }, []);

  return null;
}
