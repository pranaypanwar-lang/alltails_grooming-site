import type { Metadata } from "next";

import { BUSINESS_INFO, SITE_URL } from "./businessInfo";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogImage?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  noindex,
  ogImage,
}: PageMetadataInput): Metadata {
  const url = path.startsWith("http") ? path : `${SITE_URL}${path}`;
  const image = ogImage ?? "/images/Banner.jpg";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: BUSINESS_INFO.name,
      type: "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
