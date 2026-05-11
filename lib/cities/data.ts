import type { SupportedCity } from "@/lib/booking/constants";

/**
 * Per-city content for the /pet-grooming/[city] landing pages.
 *
 * Each entry carries enough genuinely city-specific content to avoid the
 * "thin city page" penalty Google applied after the Helpful Content
 * Update. The shared template handles layout, schema, CTAs — this file
 * supplies the local truth (neighborhoods, intros, FAQs).
 *
 * Rule: every intro paragraph must be 60+ words of genuinely city-
 * specific copy. Template-filled "Looking for grooming in {city}?" prose
 * gets demoted by Google and produces no AI citations.
 */

export type CityAddress = {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
};

export type CityGeo = {
  latitude: number;
  longitude: number;
};

export type CityFAQ = {
  question: string;
  answer: string;
};

export type CityLandingData = {
  /** Canonical city name (matches SUPPORTED_CITIES in lib/booking/constants). */
  canonicalCity: SupportedCity;

  /** URL slug, e.g. "delhi" → "/pet-grooming/delhi". */
  slug: string;

  /** Display label — usually identical to canonicalCity, may include "NCR". */
  displayName: string;

  /** Sub-region for breadcrumbs / context, e.g. "Delhi NCR", "Chandigarh Tricity". */
  region: string;

  /** Lead paragraph rendered as the AEO opening answer. 60–150 words, unique. */
  intro: string;

  /** Short ≤120-char meta description override. Falls back to intro if absent. */
  metaDescription?: string;

  /** Neighborhoods / sectors / colonies the team commonly visits. 5–10 entries. */
  areas: string[];

  /** Real registered address if we have one. Powers per-city LocalBusiness schema. */
  address?: CityAddress;

  /** Approximate geo for the city centre or office. Falls back to a city centroid. */
  geo?: CityGeo;

  /** 3–6 city-specific FAQs. Generic FAQs come from a shared list. */
  faqs: CityFAQ[];

  /** Optional callout shown above the package cards — e.g. "Most-booked in Gurgaon". */
  callout?: string;

  /** Whether the city has full unique copy or is in "lean launch" mode. */
  contentDepth: "full" | "lean";
};

const SHARED_FAQS: CityFAQ[] = [
  {
    question: "What is included in a pet grooming session?",
    answer:
      "Sessions include bath with premium vegan shampoo and conditioner, blow-dry, brushing, nail trim, ear cleaning, and either a hygiene haircut or full styling depending on the package. Dental hygiene and paw butter are included in Signature Care and Complete Pampering.",
  },
  {
    question: "How much does pet grooming cost?",
    answer:
      "Essential Care starts at ₹999 for bath-led upkeep. Signature Care is ₹1,299 (most booked) and includes a hygiene haircut. Complete Pampering at ₹1,799 covers a full body haircut plus the full spa finish. Coat care plans for repeat sessions start at ₹3,799.",
  },
  {
    question: "Can I pay after the grooming session?",
    answer:
      "Yes. Choose Pay after service at checkout — you pay a ₹250 deposit to lock the slot, and the balance is paid to the groomer in cash or UPI after the session. Online payment options (UPI, card, netbanking, wallet) are also available with offer codes.",
  },
];

export const CITY_LANDINGS: Record<string, CityLandingData> = {
  // ────────────────────────────────────────────────────────────────
  // Priority cities — full unique content
  // ────────────────────────────────────────────────────────────────

  delhi: {
    canonicalCity: "Delhi",
    slug: "delhi",
    displayName: "Delhi",
    region: "Delhi NCR",
    contentDepth: "full",
    intro:
      "All Tails brings professional dog and cat grooming home to addresses across Delhi — from the long-coat breeds typical of South Delhi (Shih Tzu, Lhasa Apso, Pomeranian in Vasant Kunj, Saket, Greater Kailash) to indie rescues and senior pets in Civil Lines, Karol Bagh and East Delhi. Our trained groomers carry every tool and product, so your pet stays in their familiar environment. Sessions run 60–120 minutes; same-day slots are usually available in South and West Delhi.",
    metaDescription:
      "Book at-home dog and cat grooming in Delhi. Trained groomers, vegan products, packages from ₹999. Covers South, West, East, North and Central Delhi.",
    areas: [
      "Vasant Kunj",
      "Saket",
      "Greater Kailash",
      "Defence Colony",
      "Dwarka",
      "Hauz Khas",
      "Civil Lines",
      "Pitampura",
      "Mayur Vihar",
      "Karol Bagh",
    ],
    geo: { latitude: 28.6139, longitude: 77.209 },
    faqs: [
      {
        question: "Do you offer pet grooming at home across Delhi?",
        answer:
          "Yes. All Tails covers South Delhi, West Delhi, East Delhi, North Delhi and Central Delhi. Same-day slots are most reliable in South and West Delhi; other zones are usually next-day depending on team availability.",
      },
      {
        question: "Which areas of Delhi do you cover?",
        answer:
          "Most commonly Vasant Kunj, Saket, Greater Kailash, Defence Colony, Dwarka, Hauz Khas, Civil Lines, Pitampura, Mayur Vihar and Karol Bagh. If your locality is missing, WhatsApp us — we often have a groomer routing through nearby.",
      },
      {
        question: "Do you serve Gurgaon and Noida from Delhi?",
        answer:
          "We treat Gurgaon and Noida as separate service zones — see /pet-grooming/gurgaon and /pet-grooming/noida for slot availability and packages in those cities.",
      },
      ...SHARED_FAQS,
    ],
    callout: "Most-booked in Delhi: Signature Care (hygiene haircut + bath, ₹1,299).",
  },

  gurgaon: {
    canonicalCity: "Gurgaon",
    slug: "gurgaon",
    displayName: "Gurgaon",
    region: "Delhi NCR",
    contentDepth: "full",
    intro:
      "All Tails operates out of Sector 66 on Golf Course Extension Road and serves homes across Gurgaon — DLF Phase 1–5, Sushant Lok, Sector 49/50/56, Sohna Road, Cyber City, and apartment communities along the Dwarka Expressway. Whether you're on a high-rise floor or a builder-floor sector house, our groomers carry every tool and product. The most-booked package in Gurgaon is Signature Care (bath + hygiene haircut, ₹1,299, 75–90 minutes).",
    metaDescription:
      "Pet grooming at home in Gurgaon. Trained groomers serve DLF, Sushant Lok, Sohna Road, Cyber City and more. Packages from ₹999.",
    areas: [
      "DLF Phase 1",
      "DLF Phase 2",
      "DLF Phase 3",
      "DLF Phase 5",
      "Sushant Lok",
      "Sector 49",
      "Sector 50",
      "Sector 56",
      "Sohna Road",
      "Golf Course Road",
      "Cyber City",
      "Dwarka Expressway",
    ],
    address: {
      streetAddress: "512, Golf Course Ext Rd, Badshahpur, Sector 66",
      addressLocality: "Gurugram",
      addressRegion: "Haryana",
      postalCode: "122018",
      addressCountry: "IN",
    },
    geo: { latitude: 28.4078, longitude: 77.0741 },
    faqs: [
      {
        question: "Do you offer pet grooming at home in Gurgaon?",
        answer:
          "Yes — Gurgaon is our home base. Our office is in Sector 66 on Golf Course Extension Road. Same-day slots are usually available across DLF, Sushant Lok, Sector 49/50/56 and Sohna Road.",
      },
      {
        question: "Which sectors and societies of Gurgaon do you serve?",
        answer:
          "Most-served: DLF Phase 1–5, Sushant Lok, Sector 49/50/56, Sohna Road, Golf Course Road, Cyber City, Dwarka Expressway corridor. WhatsApp us if you're in a sector not listed — we often route a groomer nearby.",
      },
      {
        question: "Do you serve Manesar, Bhiwadi or other periphery towns?",
        answer:
          "We currently serve Gurgaon city limits. Manesar and beyond are not yet covered; if you're between Gurgaon and these towns (e.g. Sector 70+), message us — coverage depends on the specific sector.",
      },
      ...SHARED_FAQS,
    ],
    callout: "Most-booked in Gurgaon: Signature Care — hygiene haircut + bath, ₹1,299.",
  },

  chandigarh: {
    canonicalCity: "Chandigarh",
    slug: "chandigarh",
    displayName: "Chandigarh",
    region: "Chandigarh Tricity",
    contentDepth: "full",
    intro:
      "All Tails runs a dedicated Chandigarh Tricity team with weekend service across Sector 8, 17, 32, 36 and the southern sectors in Chandigarh, plus Phase 5/7/10 Mohali and Sector 5/9 Panchkula. We've groomed Golden Retrievers, Beagles, Pomeranians and indie companions across the Tricity. Sessions are doorstep — your pet stays in their familiar environment, no salon trips, no kennel stress. Most-booked package locally: Complete Pampering with full styling at ₹1,799.",
    metaDescription:
      "Pet grooming at home in Chandigarh Tricity. Covers Chandigarh, Mohali, Panchkula. Trained groomers, vegan products, packages from ₹999.",
    areas: [
      "Sector 8",
      "Sector 17",
      "Sector 32",
      "Sector 36",
      "Sector 38",
      "Sector 44",
      "Industrial Area Phase 1",
      "Manimajra",
    ],
    geo: { latitude: 30.7333, longitude: 76.7794 },
    faqs: [
      {
        question: "Do you offer pet grooming at home in Chandigarh?",
        answer:
          "Yes. Our Chandigarh Tricity team services Chandigarh sectors, Mohali phases and Panchkula sectors on weekends and weekdays depending on slot. WhatsApp us for same-day or next-day availability.",
      },
      {
        question: "Do you serve Mohali and Panchkula too?",
        answer:
          "Yes — see /pet-grooming/mohali and /pet-grooming/panchkula for those cities. The same Tricity team handles all three.",
      },
      {
        question: "Which sectors of Chandigarh do you cover?",
        answer:
          "Sector 8, 17, 32, 36, 38, 44, Industrial Area Phase 1 and Manimajra are the most-served. Other sectors are usually covered too — message us with your sector and we'll confirm slot.",
      },
      ...SHARED_FAQS,
    ],
    callout: "Most-booked in Chandigarh: Complete Pampering — full styling spa, ₹1,799.",
  },

  // ────────────────────────────────────────────────────────────────
  // Supporting cities — lean launch, expand content over time
  // ────────────────────────────────────────────────────────────────

  noida: {
    canonicalCity: "Noida",
    slug: "noida",
    displayName: "Noida",
    region: "Delhi NCR",
    contentDepth: "lean",
    intro:
      "All Tails offers at-home pet grooming across Noida — covering apartment communities in Sectors 18, 50, 76, 78, 100, 137 and the Noida-Greater Noida Expressway corridor. Our groomers carry tools and pet-safe products to your home so you skip the salon trip. Sessions run 60–120 minutes depending on the package, and same-day slots are usually available in central Noida.",
    metaDescription:
      "Pet grooming at home in Noida. Trained groomers across Sectors 18, 50, 76, 78, 100, 137 and the Expressway corridor. From ₹999.",
    areas: [
      "Sector 18",
      "Sector 50",
      "Sector 62",
      "Sector 76",
      "Sector 78",
      "Sector 100",
      "Sector 137",
      "Noida Expressway",
    ],
    geo: { latitude: 28.5355, longitude: 77.391 },
    faqs: [
      {
        question: "Do you offer pet grooming at home in Noida?",
        answer:
          "Yes. We cover central Noida (Sectors 18, 50, 62) and the Expressway corridor (Sectors 76, 78, 100, 137). Same-day slots are usually available; book online or WhatsApp us.",
      },
      {
        question: "Do you serve Greater Noida?",
        answer:
          "Yes, Greater Noida is covered — see availability by booking online. Greater Noida West (Noida Extension) is the most-served zone.",
      },
      ...SHARED_FAQS,
    ],
  },

  faridabad: {
    canonicalCity: "Faridabad",
    slug: "faridabad",
    displayName: "Faridabad",
    region: "Delhi NCR",
    contentDepth: "lean",
    intro:
      "All Tails serves homes across Faridabad — Old Faridabad, Sector 14, 15, 21, 28, 37, 46 and the Greater Faridabad sectors along the Faridabad-Greater Faridabad Expressway. Doorstep grooming for dogs and cats with trained groomers and vegan products. Sessions run 60–120 minutes.",
    metaDescription:
      "Doorstep pet grooming in Faridabad. Covers Sectors 14, 15, 21, 37, 46 and Greater Faridabad. From ₹999.",
    areas: [
      "Sector 14",
      "Sector 15",
      "Sector 21",
      "Sector 28",
      "Sector 37",
      "Sector 46",
      "Old Faridabad",
      "Greater Faridabad",
    ],
    geo: { latitude: 28.4089, longitude: 77.3178 },
    faqs: [
      {
        question: "Do you cover Faridabad?",
        answer:
          "Yes. Most-served zones are Sectors 14, 15, 21, 28, 37, 46 and Old Faridabad. Greater Faridabad sectors are also covered; book online to see slot availability.",
      },
      ...SHARED_FAQS,
    ],
  },

  ghaziabad: {
    canonicalCity: "Ghaziabad",
    slug: "ghaziabad",
    displayName: "Ghaziabad",
    region: "Delhi NCR",
    contentDepth: "lean",
    intro:
      "All Tails offers at-home pet grooming in Ghaziabad — Indirapuram, Vaishali, Vasundhara, Kaushambi, Crossings Republik, Raj Nagar Extension and Mohan Nagar. Doorstep service for dogs and cats with trained groomers, vegan products and packages from ₹999.",
    metaDescription:
      "Pet grooming at home in Ghaziabad. Indirapuram, Vaishali, Vasundhara and more. From ₹999.",
    areas: [
      "Indirapuram",
      "Vaishali",
      "Vasundhara",
      "Kaushambi",
      "Raj Nagar Extension",
      "Crossings Republik",
      "Mohan Nagar",
    ],
    geo: { latitude: 28.6692, longitude: 77.4538 },
    faqs: [
      {
        question: "Do you serve Ghaziabad?",
        answer:
          "Yes — most-served zones are Indirapuram, Vaishali, Vasundhara, Kaushambi and the trans-Hindon societies. Book online or WhatsApp us with your area for slot confirmation.",
      },
      ...SHARED_FAQS,
    ],
  },

  ludhiana: {
    canonicalCity: "Ludhiana",
    slug: "ludhiana",
    displayName: "Ludhiana",
    region: "Punjab",
    contentDepth: "lean",
    intro:
      "All Tails brings at-home dog and cat grooming to Ludhiana — from Sarabha Nagar, Civil Lines and Model Town to BRS Nagar, Pakhowal Road and the newer colonies along Ferozepur Road. Trained groomers, vegan products, doorstep service. Sessions run 60–120 minutes; book online or WhatsApp us with your area.",
    metaDescription:
      "Pet grooming at home in Ludhiana. Sarabha Nagar, Model Town, BRS Nagar and more. Trained groomers, vegan products, from ₹999.",
    areas: [
      "Sarabha Nagar",
      "Model Town",
      "Civil Lines",
      "BRS Nagar",
      "Pakhowal Road",
      "Ferozepur Road",
      "Dugri",
      "Aggar Nagar",
    ],
    geo: { latitude: 30.901, longitude: 75.8573 },
    faqs: [
      {
        question: "Do you offer pet grooming at home in Ludhiana?",
        answer:
          "Yes. Most-served zones are Sarabha Nagar, Model Town, Civil Lines, BRS Nagar and the colonies off Pakhowal and Ferozepur Roads.",
      },
      {
        question: "Which areas of Ludhiana do you cover?",
        answer:
          "Sarabha Nagar, Model Town, Civil Lines, BRS Nagar, Pakhowal Road, Ferozepur Road, Dugri, Aggar Nagar and surrounding colonies. Message us with your area if you're outside these.",
      },
      ...SHARED_FAQS,
    ],
  },

  patiala: {
    canonicalCity: "Patiala",
    slug: "patiala",
    displayName: "Patiala",
    region: "Punjab",
    contentDepth: "lean",
    intro:
      "All Tails offers doorstep pet grooming in Patiala — covering Model Town, Urban Estate Phase 1 & 2, Tripuri, Officers Colony and the central city. Trained groomers carry all tools and products to your home for dog and cat grooming. Packages from ₹999.",
    metaDescription:
      "Pet grooming at home in Patiala. Model Town, Urban Estate, Tripuri and more. Trained groomers, vegan products, from ₹999.",
    areas: [
      "Model Town",
      "Urban Estate Phase 1",
      "Urban Estate Phase 2",
      "Tripuri",
      "Officers Colony",
      "Bahadurgarh Road",
    ],
    geo: { latitude: 30.3398, longitude: 76.3869 },
    faqs: [
      {
        question: "Do you offer pet grooming at home in Patiala?",
        answer:
          "Yes — most-served zones are Model Town, Urban Estate Phase 1 & 2, Tripuri and Officers Colony. Doorstep service for dogs and cats.",
      },
      ...SHARED_FAQS,
    ],
  },

  mohali: {
    canonicalCity: "Mohali",
    slug: "mohali",
    displayName: "Mohali",
    region: "Chandigarh Tricity",
    contentDepth: "lean",
    intro:
      "All Tails serves Mohali as part of our Chandigarh Tricity coverage — Phase 1 through Phase 11, Sector 70, 71 and the newer phases along the airport road. Doorstep pet grooming with trained groomers, vegan products and packages from ₹999. The same Tricity team handles Chandigarh and Panchkula bookings, so weekend slots are usually well-covered.",
    metaDescription:
      "Pet grooming at home in Mohali. Phase 1-11, Sector 70-71, airport road. Doorstep service for dogs and cats from ₹999.",
    areas: [
      "Phase 1",
      "Phase 3B2",
      "Phase 5",
      "Phase 7",
      "Phase 10",
      "Phase 11",
      "Sector 70",
      "Sector 71",
    ],
    geo: { latitude: 30.7046, longitude: 76.7179 },
    faqs: [
      {
        question: "Do you serve Mohali?",
        answer:
          "Yes. Mohali is part of our Chandigarh Tricity coverage. Most-served phases are 5, 7, 10, 11 and Sector 70/71. WhatsApp us for slot availability.",
      },
      ...SHARED_FAQS,
    ],
  },

  panchkula: {
    canonicalCity: "Panchkula",
    slug: "panchkula",
    displayName: "Panchkula",
    region: "Chandigarh Tricity",
    contentDepth: "lean",
    intro:
      "All Tails covers Panchkula as part of our Chandigarh Tricity service — Sector 5, 9, 10, 11, 14, 21 and the newer sectors along the Mansa Devi side. Doorstep pet grooming with trained groomers and vegan products. The Tricity team rotates between Chandigarh, Mohali and Panchkula, so weekend slots in Panchkula are usually available.",
    metaDescription:
      "Pet grooming at home in Panchkula. Sector 5, 9, 10, 11, 14, 21 and more. Doorstep service from ₹999.",
    areas: [
      "Sector 5",
      "Sector 9",
      "Sector 10",
      "Sector 11",
      "Sector 14",
      "Sector 21",
      "Mansa Devi Complex",
    ],
    geo: { latitude: 30.6942, longitude: 76.8606 },
    faqs: [
      {
        question: "Do you serve Panchkula?",
        answer:
          "Yes. Panchkula is part of our Chandigarh Tricity coverage. Most-served sectors are 5, 9, 10, 11, 14 and 21.",
      },
      ...SHARED_FAQS,
    ],
  },
};

/**
 * All city slugs in display order for the index page + sitemap.
 */
export const CITY_LANDING_SLUGS = [
  "delhi",
  "gurgaon",
  "noida",
  "faridabad",
  "ghaziabad",
  "chandigarh",
  "mohali",
  "panchkula",
  "ludhiana",
  "patiala",
] as const;

export type CityLandingSlug = (typeof CITY_LANDING_SLUGS)[number];

export function getCityLanding(slug: string): CityLandingData | undefined {
  return CITY_LANDINGS[slug.toLowerCase()];
}
