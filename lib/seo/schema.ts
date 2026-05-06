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
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: BUSINESS_INFO.name,
    url: `${SITE_URL}/`,
    telephone: BUSINESS_INFO.phoneDisplay,
    email: BUSINESS_INFO.email,
    priceRange: "₹₹",
    description:
      "All Tails provides at-home pet grooming and doorstep grooming services for dogs and cats across selected service areas.",
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
    sameAs: [
      BUSINESS_INFO.socials.instagram,
      BUSINESS_INFO.socials.facebook,
      BUSINESS_INFO.socials.linkedin,
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

type ArticleSchemaInput = {
  slug: string;
  title: string;
  description: string;
  publishedAt: Date | null;
  updatedAt: Date;
  coverImageUrl?: string | null;
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
    author: {
      "@type": "Organization",
      name: BUSINESS_INFO.name,
      url: `${SITE_URL}/`,
    },
    publisher: {
      "@type": "Organization",
      name: BUSINESS_INFO.name,
      url: `${SITE_URL}/`,
    },
    mainEntityOfPage: url,
  };
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
