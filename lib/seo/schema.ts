import { BUSINESS_INFO, SITE_URL } from "./businessInfo";

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BUSINESS_INFO.name,
    alternateName: ["ALL TAILS", "AllTails"],
    url: `${SITE_URL}/`,
  };
}

export function professionalServiceSchema() {
  // We declare both ProfessionalService AND LocalBusiness as @type so Google
  // treats this as a fully-fledged LocalBusiness (powering Maps integration,
  // Knowledge Panel, "near me" results) while preserving the existing
  // ProfessionalService classification. PetGroomer schema doesn't exist as a
  // strict type, but additionalType points to a Wikidata concept that some
  // crawlers use as a fallback hint for category.
  return {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "LocalBusiness"],
    "@id": `${SITE_URL}/#localbusiness`,
    name: BUSINESS_INFO.name,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/images/Banner.jpg`,
    logo: `${SITE_URL}/icon.png`,
    telephone: BUSINESS_INFO.phoneDisplay,
    email: BUSINESS_INFO.email,
    priceRange: "₹₹",
    description:
      "All Tails provides at-home pet grooming and doorstep grooming services for dogs and cats across selected service areas.",
    additionalType: "https://www.wikidata.org/wiki/Q3406443", // pet groomer
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_INFO.address.streetAddress,
      addressLocality: BUSINESS_INFO.address.addressLocality,
      addressRegion: BUSINESS_INFO.address.addressRegion,
      postalCode: BUSINESS_INFO.address.postalCode,
      addressCountry: BUSINESS_INFO.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS_INFO.geo.latitude,
      longitude: BUSINESS_INFO.geo.longitude,
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${BUSINESS_INFO.address.streetAddress}, ${BUSINESS_INFO.address.addressLocality}, ${BUSINESS_INFO.address.addressRegion} ${BUSINESS_INFO.address.postalCode}`
    )}`,
    areaServed: BUSINESS_INFO.serviceAreas.map((name) => ({
      "@type": "City",
      name,
    })),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: BUSINESS_INFO.hoursOpens,
        closes: BUSINESS_INFO.hoursCloses,
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: BUSINESS_INFO.aggregateRating.ratingValue,
      reviewCount: BUSINESS_INFO.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: BUSINESS_INFO.phoneDisplay,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
    ],
    sameAs: [
      BUSINESS_INFO.socials.instagram,
      BUSINESS_INFO.socials.facebook,
      BUSINESS_INFO.socials.linkedin,
      "https://www.wikidata.org/wiki/Q139831788",
      "https://alltails-petgrooming.sulekha.com",
    ],
  };
}

export function serviceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "At-home pet grooming",
    serviceType: "Doorstep dog and cat grooming",
    provider: {
      "@type": "ProfessionalService",
      name: BUSINESS_INFO.name,
      url: `${SITE_URL}/`,
    },
    areaServed: BUSINESS_INFO.serviceAreas.map((name) => ({
      "@type": "City",
      name,
    })),
  };
}

type CityLocalBusinessInput = {
  cityName: string;
  region: string;
  slug: string;
  geo?: { latitude: number; longitude: number };
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  description: string;
  areaServed: readonly string[];
};

/**
 * City-scoped LocalBusiness schema for /pet-grooming/[city] pages. Distinct
 * @id per city so Google sees each city page as its own LocalBusiness node
 * (powers per-city Maps cards + "near me" rankings). Falls back to the
 * Gurugram HQ address when a city doesn't have its own real address —
 * never invent fake addresses, Google flags them.
 */
export function cityLocalBusinessSchema(input: CityLocalBusinessInput) {
  const address = input.address ?? BUSINESS_INFO.address;
  const geo = input.geo ?? BUSINESS_INFO.geo;

  return {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "LocalBusiness"],
    "@id": `${SITE_URL}/pet-grooming/${input.slug}#localbusiness`,
    name: `${BUSINESS_INFO.name} — Pet Grooming in ${input.cityName}`,
    url: `${SITE_URL}/pet-grooming/${input.slug}`,
    image: `${SITE_URL}/images/Banner.jpg`,
    logo: `${SITE_URL}/icon.png`,
    telephone: BUSINESS_INFO.phoneDisplay,
    email: BUSINESS_INFO.email,
    priceRange: "₹₹",
    description: input.description,
    additionalType: "https://www.wikidata.org/wiki/Q3406443",
    address: {
      "@type": "PostalAddress",
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality,
      addressRegion: address.addressRegion,
      postalCode: address.postalCode,
      addressCountry: address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`
    )}`,
    areaServed: [
      { "@type": "City", name: input.cityName },
      ...input.areaServed.map((name) => ({ "@type": "Place", name })),
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: BUSINESS_INFO.hoursOpens,
        closes: BUSINESS_INFO.hoursCloses,
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: BUSINESS_INFO.aggregateRating.ratingValue,
      reviewCount: BUSINESS_INFO.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    sameAs: [
      BUSINESS_INFO.socials.instagram,
      BUSINESS_INFO.socials.facebook,
      BUSINESS_INFO.socials.linkedin,
      "https://www.wikidata.org/wiki/Q139831788",
      "https://alltails-petgrooming.sulekha.com",
    ],
  };
}

type PackageOfferInput = {
  name: string;
  description: string;
  price: number;
  url?: string;
  // Optional duration text shown in the rich result (e.g. "60–75 mins").
  duration?: string;
};

/**
 * Builds a Schema.org OfferCatalog covering each grooming package, plus an
 * AggregateOffer that gives Google a clean ₹999–₹14,999 price range for
 * SERP snippets. Mount on /packages so SERP renders a price range and the
 * individual packages can each gain Offer rich snippets.
 */
export function packageOfferCatalogSchema(packages: PackageOfferInput[]) {
  if (!packages.length) return null;

  const prices = packages.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  const lowPrice = prices.length ? Math.min(...prices) : undefined;
  const highPrice = prices.length ? Math.max(...prices) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "All Tails pet grooming packages",
    description:
      "At-home pet grooming packages for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana and Patiala.",
    brand: { "@type": "Brand", name: BUSINESS_INFO.name },
    image: `${SITE_URL}/images/Banner.jpg`,
    url: `${SITE_URL}/packages`,
    ...(lowPrice !== undefined && highPrice !== undefined
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice,
            highPrice,
            offerCount: packages.length,
            availability: "https://schema.org/InStock",
            offers: packages.map((pkg) => ({
              "@type": "Offer",
              name: pkg.name,
              description: pkg.description,
              price: pkg.price,
              priceCurrency: "INR",
              url: pkg.url ?? `${SITE_URL}/packages`,
              availability: "https://schema.org/InStock",
              eligibleRegion: BUSINESS_INFO.serviceAreas.map((name) => ({
                "@type": "City",
                name,
              })),
            })),
          },
        }
      : {}),
  };
}

type ArticleSchemaInput = {
  slug: string;
  title: string;
  description: string;
  publishedAt: Date | null;
  updatedAt: Date;
  coverImageUrl?: string | null;
  wordCount?: number;
};

export function articleSchema(input: ArticleSchemaInput) {
  const url = `${SITE_URL}/blogs/${input.slug}`;
  const image = input.coverImageUrl
    ? input.coverImageUrl.startsWith("http")
      ? input.coverImageUrl
      : `${SITE_URL}${input.coverImageUrl}`
    : `${SITE_URL}/images/Banner.jpg`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: (input.publishedAt ?? input.updatedAt).toISOString(),
    dateModified: input.updatedAt.toISOString(),
    image: [image],
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".article-intro"],
    },
    author: [
      {
        "@type": "Organization",
        name: BUSINESS_INFO.name,
        url: `${SITE_URL}/`,
      },
      {
        "@type": "Person",
        name: "All Tails Editorial Team",
        url: `${SITE_URL}/about`,
        jobTitle: "Pet Grooming Content Team",
        worksFor: { "@type": "Organization", name: BUSINESS_INFO.name },
      },
    ],
    publisher: {
      "@type": "Organization",
      name: BUSINESS_INFO.name,
      url: `${SITE_URL}/`,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
    mainEntityOfPage: url,
  };
}

type HowToStep = { name: string; text: string };
type HowToSchemaInput = {
  name: string;
  description: string;
  steps: HowToStep[];
  image?: string;
  totalTime?: string;
};

export function howToSchema(input: HowToSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    ...(input.image ? { image: input.image } : {}),
    ...(input.totalTime ? { totalTime: input.totalTime } : {}),
    step: input.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

type PackageServiceInput = {
  name: string;
  description: string;
  price: number;
  duration?: string;
  slug: string;
};

export function packageServicesSchema(packages: PackageServiceInput[]) {
  return packages.map((pkg) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/packages#${pkg.slug}`,
    name: pkg.name,
    description: pkg.description,
    provider: {
      "@type": "ProfessionalService",
      name: BUSINESS_INFO.name,
      url: `${SITE_URL}/`,
    },
    offers: {
      "@type": "Offer",
      price: pkg.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/packages#${pkg.slug}`,
      ...(pkg.duration ? { description: pkg.duration } : {}),
    },
    areaServed: BUSINESS_INFO.serviceAreas.map((name) => ({ "@type": "City", name })),
  }));
}

type FaqItem = { q: string; a: string };
export function faqPageSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

type Crumb = { name: string; path: string };
export function breadcrumbSchema(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@id": `${SITE_URL}${item.path}`,
        name: item.name,
      },
    })),
  };
}

export function jsonLdString(payload: object | object[]) {
  return JSON.stringify(payload);
}
