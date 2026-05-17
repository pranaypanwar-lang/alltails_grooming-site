import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Inter } from "next/font/google";
import { MetaPixelPageView } from "./components/analytics/MetaPixelPageView";
import { AttributionCapture } from "./components/analytics/AttributionCapture";
import { StickyMobileCTA } from "./components/seo/StickyMobileCTA";
import { META_PIXEL_ID } from "../lib/analytics/metaPixel";
import { GOOGLE_ADS_ID } from "../lib/analytics/googleAds";
import { JsonLd } from "./components/seo/JsonLd";
import { SITE_URL, BUSINESS_INFO } from "../lib/seo/businessInfo";
import {
  professionalServiceSchema,
  websiteSchema,
} from "../lib/seo/schema";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "At-Home Pet Grooming in Delhi NCR | All Tails",
    template: "%s | All Tails",
  },
  description:
    "Book premium at-home pet grooming with All Tails. Gentle groomers, safe products, transparent packages, and convenient doorstep grooming for dogs and cats.",
  applicationName: BUSINESS_INFO.name,
  alternates: { canonical: "/" },
  openGraph: {
    title: "At-Home Pet Grooming in Delhi NCR | All Tails",
    description:
      "Premium doorstep grooming for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana, and Patiala.",
    url: SITE_URL,
    siteName: BUSINESS_INFO.name,
    type: "website",
    images: [{ url: "/images/Banner.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "At-Home Pet Grooming in Delhi NCR | All Tails",
    description:
      "Premium doorstep grooming for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana, and Patiala.",
    images: ["/images/Banner.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script id="meta-pixel-base" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-ads-base" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_ID}');
            gtag('config', 'G-ZMPGZ8EL0P');
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased`}>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        <MetaPixelPageView />
        <AttributionCapture />
        <JsonLd data={websiteSchema()} />
        <JsonLd data={professionalServiceSchema()} />
        {children}
        <StickyMobileCTA />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
