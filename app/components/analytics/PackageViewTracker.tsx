"use client";

import { useEffect, useRef } from "react";
import { trackPackageViewed } from "@/lib/analytics/ga4Events";

type PackageViewTrackerProps = {
  packageName: string;
  price: number;
};

export function PackageViewTracker({ packageName, price }: PackageViewTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!ref.current || fired.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          trackPackageViewed(packageName, price);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [packageName, price]);

  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0" />;
}
