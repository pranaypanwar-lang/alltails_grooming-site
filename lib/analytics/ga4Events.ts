"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function pushEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  } else {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: eventName, ...params });
  }
}

export function trackPackageViewed(packageName: string, price: number) {
  pushEvent("package_viewed", {
    package_name: packageName,
    value: price,
    currency: "INR",
  });
}

export function trackBlogReadComplete(slug: string, title: string, readTimeMinutes: number) {
  pushEvent("blog_read_complete", {
    content_id: slug,
    content_title: title,
    read_time_minutes: readTimeMinutes,
  });
}
