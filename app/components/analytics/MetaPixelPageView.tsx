"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackMetaEvent } from "../../../lib/analytics/metaPixel";

export function MetaPixelPageView() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    trackMetaEvent("PageView");
  }, [pathname]);

  return null;
}
