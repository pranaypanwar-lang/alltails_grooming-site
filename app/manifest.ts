import type { MetadataRoute } from "next";

import { BUSINESS_INFO } from "@/lib/seo/businessInfo";

/**
 * Web App Manifest — powers iOS "Add to Home Screen" and Android PWA install
 * prompts. Even without full PWA features, having a manifest improves how
 * the site appears as a bookmark / home-screen icon on mobile.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BUSINESS_INFO.name} — At-Home Pet Grooming`,
    short_name: BUSINESS_INFO.name,
    description:
      "Premium doorstep grooming for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana, and Patiala.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#6d5bd0",
    categories: ["lifestyle", "shopping", "pets"],
    lang: "en-IN",
    icons: [
      {
        src: "/icon.png",
        type: "image/png",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        type: "image/png",
        sizes: "any",
        purpose: "maskable",
      },
    ],
  };
}
