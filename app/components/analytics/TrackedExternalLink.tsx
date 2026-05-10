"use client";

import { type AnchorHTMLAttributes, type ReactNode } from "react";

import {
  trackCallClick,
  trackWhatsAppClick,
} from "@/lib/analytics/clickTracking";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick" | "type"> & {
  type: "whatsapp" | "call";
  children: ReactNode;
  trackingCity?: string | null;
  trackingService?: string | null;
  trackingSource?: string;
  trackingPackage?: string | null;
};

/**
 * Client-side <a> wrapper that fires a gtag/dataLayer event when the link
 * is clicked. Use everywhere a WhatsApp or tel: link appears so the same
 * city + service + utm + gclid context is reported uniformly.
 *
 * Why a wrapper instead of bolting onClick onto each <a>: lets server
 * components (footer, contact, city landing pages) keep rendering on the
 * server while only the click-tracking boundary becomes client-side.
 */
export function TrackedExternalLink({
  type,
  trackingCity,
  trackingService,
  trackingSource,
  trackingPackage,
  children,
  ...anchorProps
}: Props) {
  const handleClick = () => {
    const context = {
      city: trackingCity,
      service: trackingService,
      source: trackingSource,
      package: trackingPackage,
    };
    if (type === "whatsapp") {
      trackWhatsAppClick(context);
    } else {
      trackCallClick(context);
    }
  };

  return (
    <a {...anchorProps} onClick={handleClick}>
      {children}
    </a>
  );
}
