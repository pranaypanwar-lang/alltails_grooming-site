import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  // Compress responses (gzip) — default true in Next 16 but explicit so the
  // setting survives any future config consolidation.
  compress: true,

  // Image format priority: AVIF (best compression) then WebP (broad support).
  // Next.js auto-falls-back to JPG/PNG if the browser doesn't accept either.
  // Typically cuts 40-60% off image payload on supported browsers vs serving
  // JPG. Long minimumCacheTTL because Next's image URLs are content-hashed.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fhckbdubujugourguqwc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Tree-shake lucide-react imports so only the icons we actually use ship
  // in the bundle (Next.js can't tree-shake re-exported icon libraries by
  // default; this flag tells it to try harder). Visible on the new city /
  // service / glossary pages which import 5-10 icons each.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
