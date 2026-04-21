export const BREED_OPTIONS = [
  "Beagle",
  "Border Collie",
  "Boxer",
  "Chihuahua",
  "Cocker Spaniel",
  "Dachshund",
  "French Bulldog",
  "German Shepherd",
  "Golden Retriever",
  "Indie",
  "Labrador Retriever",
  "Lhasa Apso",
  "Maltese",
  "Persian Cat",
  "Pomeranian",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Shih Tzu",
  "Siberian Husky",
  "Spitz",
  "Yorkshire Terrier",
] as const;

export const BREED_NORMALIZATION_MAP: Record<string, string> = {
  lab: "Labrador Retriever",
  labrador: "Labrador Retriever",
  labretriever: "Labrador Retriever",
  gsd: "German Shepherd",
  germanshepherd: "German Shepherd",
  golden: "Golden Retriever",
  goldenretriever: "Golden Retriever",
  shihtzu: "Shih Tzu",
  shitzu: "Shih Tzu",
  lhasa: "Lhasa Apso",
  indiee: "Indie",
  pom: "Pomeranian",
  pomeraniann: "Pomeranian",
  huskyy: "Siberian Husky",
  yorkie: "Yorkshire Terrier",
  frenchie: "French Bulldog",
  doxie: "Dachshund",
  cockerspaniel: "Cocker Spaniel",
};

export function normalizeBreedName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalizedKey = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  if (BREED_NORMALIZATION_MAP[normalizedKey]) {
    return BREED_NORMALIZATION_MAP[normalizedKey];
  }

  const exactMatch = BREED_OPTIONS.find(
    (breed) => breed.toLowerCase() === trimmed.toLowerCase()
  );

  if (exactMatch) return exactMatch;

  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getBreedSuggestions(query: string) {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  return BREED_OPTIONS.filter((breed) =>
    breed.toLowerCase().includes(trimmed)
  ).slice(0, 8);
}
