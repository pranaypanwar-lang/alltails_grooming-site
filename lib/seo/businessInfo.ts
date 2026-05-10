export const SITE_URL = "https://alltails.in";

export const BUSINESS_INFO = {
  name: "All Tails",
  legalName: "All Tails",
  url: SITE_URL,
  phoneDisplay: "+91 97178 78052",
  phoneE164: "+919717878052",
  whatsappNumber: "919717878052",
  email: "hello@alltails.in",
  hours: "9:00 AM – 8:00 PM daily",
  hoursOpens: "09:00",
  hoursCloses: "20:00",
  serviceModelDescription:
    "All Tails is a doorstep pet grooming service. We do not operate as a walk-in grooming salon. Our groomers visit your home at the booked slot.",
  shortServiceModel:
    "Premium doorstep grooming for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana, and Patiala.",
  serviceAreas: [
    "Delhi",
    "Gurgaon",
    "Gurugram",
    "Noida",
    "Greater Noida",
    "Ghaziabad",
    "Faridabad",
    "Chandigarh",
    "Mohali",
    "Panchkula",
    "Kharar",
    "Ludhiana",
    "Patiala",
  ] as const,
  socials: {
    instagram:
      "https://www.instagram.com/alltails.in?igsh=MXg3bDR6dHc1eXRnaQ%3D%3D&utm_source=qr",
    facebook: "https://www.facebook.com/share/1BMTGLq5HQ/?mibextid=wwXIfr",
    linkedin: "https://www.linkedin.com/company/alltails-in/",
  },

  // Registered business address — matches the Google Business Profile listing
  // for All Tails. Keep in sync with GBP; mismatch can hurt local-pack ranking.
  address: {
    streetAddress: "512, Golf Course Ext Rd, Badshahpur, Sector 66",
    addressLocality: "Gurugram",
    addressRegion: "Haryana",
    postalCode: "122018",
    addressCountry: "IN",
  },

  // Approximate geo for the registered address (Sector 66 Gurgaon, near M3M
  // IFC on Golf Course Ext Road). Google can geocode the address text fine,
  // but explicit coordinates strengthen the LocalBusiness signal. Refine if
  // you have exact lat/lng from Google Maps.
  geo: {
    latitude: 28.4078,
    longitude: 77.0741,
  },

  // Aggregate rating snapshot. Update manually when the GBP review count moves
  // materially (~every 30 days or after a review push). Real, verifiable
  // values only — Google penalizes inflated review schema.
  aggregateRating: {
    ratingValue: 4.8,
    reviewCount: 189,
    source: "Google Business Profile",
    // ISO date the values above were last verified against GBP.
    verifiedAt: "2026-05-10",
  },
} as const;

export const phoneTel = `tel:${BUSINESS_INFO.phoneE164}`;
export const emailMailto = `mailto:${BUSINESS_INFO.email}`;
export const whatsappHref = `https://wa.me/${BUSINESS_INFO.whatsappNumber}`;

export function whatsappLink(message?: string) {
  if (!message) return whatsappHref;
  return `${whatsappHref}?text=${encodeURIComponent(message)}`;
}
