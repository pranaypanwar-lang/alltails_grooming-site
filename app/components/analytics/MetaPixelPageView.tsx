"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const META_PIXEL_ID = "1003580967947137";

export function MetaPixelPageView() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!window.fbq) {
      return;
    }

    window.fbq("track", "PageView");
  }, [pathname]);

  return null;
}

export { META_PIXEL_ID };
