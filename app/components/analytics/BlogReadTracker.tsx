"use client";

import { useEffect, useRef } from "react";
import { trackBlogReadComplete } from "@/lib/analytics/ga4Events";

type BlogReadTrackerProps = {
  slug: string;
  title: string;
  readTimeMinutes: number;
};

export function BlogReadTracker({ slug, title, readTimeMinutes }: BlogReadTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const handler = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop + el.clientHeight;
      const total = el.scrollHeight;
      if (scrolled / total >= 0.8) {
        fired.current = true;
        trackBlogReadComplete(slug, title, readTimeMinutes);
        window.removeEventListener("scroll", handler, { capture: false });
      }
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [slug, title, readTimeMinutes]);

  return null;
}
