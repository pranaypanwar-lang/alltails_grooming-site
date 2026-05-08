"use client";

import { useCallback } from "react";

type BookingEventPayload = {
  step?: string;
  packageName?: string;
  city?: string;
  selectedDate?: string;
  selectedWindow?: string;
  petCount?: number;
  paymentMethod?: "pay_now" | "pay_after_service";
  amount?: number;
  error?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function useBookingAnalytics() {
  return useCallback((eventName: string, payload: BookingEventPayload = {}) => {
    if (typeof window === "undefined") return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      flow: "new_mobile_booking",
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }, []);
}
