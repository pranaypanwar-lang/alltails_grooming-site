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
