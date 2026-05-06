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
} as const;

export const phoneTel = `tel:${BUSINESS_INFO.phoneE164}`;
export const emailMailto = `mailto:${BUSINESS_INFO.email}`;
export const whatsappHref = `https://wa.me/${BUSINESS_INFO.whatsappNumber}`;

export function whatsappLink(message?: string) {
  if (!message) return whatsappHref;
  return `${whatsappHref}?text=${encodeURIComponent(message)}`;
}
