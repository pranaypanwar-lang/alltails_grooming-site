// Breeds where coat length/density makes the Complete Pampering package (₹1799) meaningfully better
const LONG_COAT_BREEDS = new Set([
  "Golden Retriever",
  "Cocker Spaniel",
  "Lhasa Apso",
  "Maltese",
  "Poodle",
  "Shih Tzu",
  "Yorkshire Terrier",
  "Pomeranian",
  "Spitz",
  "Persian Cat",
  "Siberian Husky",
  "Border Collie",
]);

// Prices at or below which we suggest upgrading to Complete Pampering (₹1799)
const UPSELL_THRESHOLD_PRICE = 1299;

export function isLongCoatBreed(breed: string): boolean {
  return LONG_COAT_BREEDS.has(breed.trim());
}

export function detectUpsellBreeds(breeds: string[]): string[] {
  return breeds.filter(isLongCoatBreed);
}

export function shouldSuggestUpgrade(servicePrice: number): boolean {
  return servicePrice <= UPSELL_THRESHOLD_PRICE;
}

export type UpsellSignal = {
  longCoatPets: string[]; // pet names with long-coat breeds
  breeds: string[];
  currentServicePrice: number;
  upgradeServiceName: string;
  upgradeServicePrice: number;
  message: string;
};

export function computeUpsellSignal(params: {
  pets: { name: string; breed: string }[];
  servicePrice: number;
}): UpsellSignal | null {
  if (!shouldSuggestUpgrade(params.servicePrice)) return null;

  const longCoatPets = params.pets.filter((p) => isLongCoatBreed(p.breed));
  if (longCoatPets.length === 0) return null;

  const petLabel =
    longCoatPets.length === 1
      ? longCoatPets[0].name || longCoatPets[0].breed
      : `${longCoatPets.length} long-coat pets`;

  return {
    longCoatPets: longCoatPets.map((p) => p.name || p.breed),
    breeds: longCoatPets.map((p) => p.breed),
    currentServicePrice: params.servicePrice,
    upgradeServiceName: "Complete Pampering",
    upgradeServicePrice: 1799,
    message: `${petLabel} (${longCoatPets.map((p) => p.breed).join(", ")}) would benefit from Complete Pampering — coat conditioning and full trim included.`,
  };
}
