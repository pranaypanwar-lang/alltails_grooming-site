export const SUPPORTED_CITIES = [
  "Chandigarh",
  "Delhi",
  "Faridabad",
  "Ghaziabad",
  "Greater Noida",
  "Gurgaon",
  "Ludhiana",
  "Kharar",
  "Mohali",
  "Noida",
  "Panchkula",
  "Patiala",
] as const;

export type SupportedCity = (typeof SUPPORTED_CITIES)[number];

export const SERVICE_OPTIONS = [
  {
    name: "Complete Pampering",
    price: 1799,
    category: "Individual Sessions",
    order: 1,
    duration: "90-120 mins",
    badge: "Spa + full body haircut",
    shortDescription: "Our complete spa grooming session with full body haircut and styling.",
    bullets: [
      "Full body haircut or styling",
      "Oil massage, shampoo, conditioner, serum and perfume",
      "Nails, ears, paw butter and dental hygiene",
    ],
    clarityNote: "Choose this when your pet needs a proper haircut, styling, or a fuller spa finish.",
  },
  {
    name: "Signature Care",
    price: 1299,
    category: "Individual Sessions",
    order: 2,
    duration: "75-90 mins",
    badge: "Most booked",
    shortDescription: "Bath, coat care and hygiene haircut for regular grooming upkeep.",
    bullets: [
      "Bath, conditioner, blow dry and brushing",
      "Hygiene haircut: face, genitals and under paws",
      "Nails, ears and dental hygiene",
    ],
    clarityNote: "Does not include full body haircut. Pick Complete Pampering for full body styling.",
  },
  {
    name: "Essential Care",
    price: 999,
    category: "Individual Sessions",
    order: 3,
    duration: "60-75 mins",
    badge: null,
    shortDescription: "Bathing-only upkeep for pets who do not need any haircut.",
    bullets: [
      "Premium shampoo, conditioner and blow dry",
      "Coat brushing for everyday freshness",
      "Nails and ear cleaning",
    ],
    clarityNote: "No haircut is included in this package.",
  },
  {
    name: "Starter Plan",
    price: 3799,
    category: "Coat Care Plans",
    order: 4,
    duration: "3 sessions",
    badge: null,
    shortDescription: "Start a regular grooming rhythm",
    bullets: ["3 structured sessions", "Routine upkeep", "Better care continuity"],
    clarityNote: "Plan inclusions are confirmed by the team before scheduling.",
  },
  {
    name: "Care Plan",
    price: 6999,
    category: "Coat Care Plans",
    order: 5,
    duration: "6 sessions",
    badge: "Most recommended",
    shortDescription: "Consistent grooming upkeep",
    bullets: ["6 structured sessions", "Ongoing coat care", "Maintenance rhythm"],
    clarityNote: "Plan inclusions are confirmed by the team before scheduling.",
  },
  {
    name: "Wellness Plan",
    price: 14999,
    category: "Coat Care Plans",
    order: 6,
    duration: "12 sessions",
    badge: "Best value",
    shortDescription: "Long-term coat health",
    bullets: ["12 structured sessions", "Full-year upkeep", "Lower session cost"],
    clarityNote: "Plan inclusions are confirmed by the team before scheduling.",
  },
] as const;

export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export const INDIVIDUAL_SESSION_SERVICES = SERVICE_OPTIONS.filter(
  (service) => service.category === "Individual Sessions"
).sort((a, b) => a.order - b.order);

export const getServiceOption = (serviceName: string) =>
  SERVICE_OPTIONS.find((service) => service.name === serviceName) ?? SERVICE_OPTIONS[0];

export const getServicePrice = (serviceName: string) => getServiceOption(serviceName).price;

export const isSupportedCity = (city: string) =>
  SUPPORTED_CITIES.includes(city as SupportedCity);
