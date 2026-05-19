export type BookingSopStepKey =
  | "en_route"
  | "arrived"
  | "dress_check_selfie"
  | "pet_settled"
  | "sanitization_proof"
  | "pre_groom_video"
  | "oil_massage_proof"
  | "shampoo_proof"
  | "bath_dry_proof"
  | "dental_proof"
  | "hairstyle_approval"
  | "nail_trim_proof"
  | "ear_check_proof"
  | "final_groom_proof"
  | "payment_proof"
  | "review_proof";

export type ServiceTier = "Essential" | "Signature" | "Complete";

export type BookingSopStepDefinition = {
  key: BookingSopStepKey;
  label: string;
  groomerLabel: string;
  groomerLabelHindi: string;
  groomerHint?: string;
  groomerHintHindi?: string;
  proofType: "manual" | "image" | "video" | "mixed";
  requiredForCompletion: boolean;
  tiers: ServiceTier[];
};

export type BookingSopEvidenceStep = {
  stepKey: string;
  status?: string | null;
  proofs?: Array<unknown> | null;
};

export const BOOKING_SOP_STEPS: BookingSopStepDefinition[] = [
  {
    key: "en_route",
    label: "En route",
    groomerLabel: "Nikal gaye",
    groomerLabelHindi: "निकल गए",
    groomerHint: "Ghar ke liye nikalte hi isko dabayein, customer ko update chala jayega.",
    groomerHintHindi: "घर के लिए निकलते ही इसे दबाइए, कस्टमर को अपडेट चला जाएगा।",
    proofType: "manual",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "arrived",
    label: "Arrived",
    groomerLabel: "Pahunch gaye",
    groomerLabelHindi: "पहुँच गए",
    groomerHint: "Location par pahunchte hi ya kaam shuru karte hi isko dabayein.",
    groomerHintHindi: "लोकेशन पर पहुँचते ही या काम शुरू करते ही इसे दबाइए।",
    proofType: "manual",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "dress_check_selfie",
    label: "Dress regulation selfie",
    groomerLabel: "Dress check selfie",
    groomerLabelHindi: "ड्रेस चेक सेल्फी",
    groomerHint: "Pahunchte hi — groomer aur helper dono uniform mein saath selfie lein.",
    groomerHintHindi: "पहुँचते ही — ग्रूमर और हेल्पर दोनों यूनिफॉर्म में साथ सेल्फी लें।",
    proofType: "image",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "pet_settled",
    label: "Pet settled",
    groomerLabel: "Pet shaant ho gaya",
    groomerLabelHindi: "पेट शांत हो गया",
    groomerHint: "Pet parent se milein, pet ko pyaar se settle karein — jaldi nahi.",
    groomerHintHindi: "पेट पैरेंट से मिलें, पेट को प्यार से सेटल करें — जल्दी नहीं।",
    proofType: "manual",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "sanitization_proof",
    label: "Sanitization video",
    groomerLabel: "Workstation aur tools ki safai",
    groomerLabelHindi: "वर्कस्टेशन और टूल्स की सफाई",
    groomerHint: "Table, combs, scissors — sab saaf karein. 10-15 sec ka video lein.",
    groomerHintHindi: "टेबल, कंघे, कैंची — सब साफ करें। 10-15 सेकंड का वीडियो लें।",
    proofType: "video",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "pre_groom_video",
    label: "Before grooming video",
    groomerLabel: "Shuru se pehle ka video",
    groomerLabelHindi: "शुरू से पहले का वीडियो",
    groomerHint: "Kaam shuru karne se pehle pet ka poora coat aur look saaf dikhana hai.",
    groomerHintHindi: "काम शुरू करने से पहले पेट का पूरा कोट और लुक साफ दिखाना है।",
    proofType: "video",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "oil_massage_proof",
    label: "Oil massage photo",
    groomerLabel: "Oil massage proof",
    groomerLabelHindi: "ऑयल मसाज प्रूफ",
    groomerHint: "Oil lagaate waqt ya baad mein ek photo lo — poora body cover dikhna chahiye.",
    groomerHintHindi: "ऑयल लगाते वक्त या बाद में एक फोटो लो — पूरा बॉडी कवर दिखना चाहिए।",
    proofType: "image",
    requiredForCompletion: true,
    tiers: ["Complete"],
  },
  {
    key: "shampoo_proof",
    label: "Shampoo applied photo",
    groomerLabel: "Shampoo lagane ke baad",
    groomerLabelHindi: "शैम्पू लगाने के बाद",
    groomerHint: "Shampoo poore body par lagane ke baad ek photo lo — coat fully lathered dikhni chahiye. Phir 10 min tak achhi tarah ragdo.",
    groomerHintHindi: "शैम्पू पूरे बॉडी पर लगाने के बाद एक फोटो लो — कोट fully lathered दिखनी चाहिए। फिर 10 मिनट तक अच्छी तरह रगड़ो।",
    proofType: "image",
    requiredForCompletion: true,
    tiers: ["Signature", "Complete"],
  },
  {
    key: "bath_dry_proof",
    label: "Bath / dry photo or video",
    groomerLabel: "Bath aur dry ke baad",
    groomerLabelHindi: "बाथ और ड्राई के बाद",
    groomerHint: "Shampoo + conditioner ke baad towel dry → blow dry. Pet clean aur dry dikhna chahiye.",
    groomerHintHindi: "शैम्पू + कंडीशनर के बाद तौलिया ड्राई → ब्लो ड्राई। पेट साफ और ड्राई दिखना चाहिए।",
    proofType: "mixed",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "dental_proof",
    label: "Dental hygiene photo",
    groomerLabel: "Daant saaf ka proof",
    groomerLabelHindi: "दांत साफ का प्रूफ",
    groomerHint: "Pet toothpaste se dono taraf ke daant brush karo. Ek close-up photo lo.",
    groomerHintHindi: "पेट टूथपेस्ट से दोनों तरफ के दांत ब्रश करो। एक क्लोज़-अप फोटो लो।",
    proofType: "image",
    requiredForCompletion: true,
    tiers: ["Signature", "Complete"],
  },
  {
    key: "hairstyle_approval",
    label: "Style approval photos",
    groomerLabel: "Style check photo",
    groomerLabelHindi: "स्टाइल चेक फोटो",
    groomerHint: "Styling notes aur reference photos ke mutabiq cut karein. Photo mein saaf dikhna chahiye.",
    groomerHintHindi: "स्टाइलिंग नोट्स और रेफरेंस फोटो के मुताबिक कट करें। फोटो में साफ दिखना चाहिए।",
    proofType: "image",
    requiredForCompletion: true,
    tiers: ["Signature", "Complete"],
  },
  {
    key: "nail_trim_proof",
    label: "Nail trim photo",
    groomerLabel: "Nails trim ka proof",
    groomerLabelHindi: "नेल्स ट्रिम का प्रूफ",
    groomerHint: "Nails trim aur file karo. Paws ki ek clear photo lo.",
    groomerHintHindi: "नेल्स ट्रिम और फाइल करो। पंजों की एक साफ फोटो लो।",
    proofType: "image",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "ear_check_proof",
    label: "Ear cleaning photo",
    groomerLabel: "Kaan saaf ka proof",
    groomerLabelHindi: "कान साफ का प्रूफ",
    groomerHint: "Ear cleaner se dono kaan saaf karo. Ek photo lo jisme kaan saaf dike.",
    groomerHintHindi: "ईयर क्लीनर से दोनों कान साफ करो। एक फोटो लो जिसमें कान साफ दिखे।",
    proofType: "image",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "final_groom_proof",
    label: "Final grooming video",
    groomerLabel: "Final look video",
    groomerLabelHindi: "फाइनल लुक वीडियो",
    groomerHint: "Sab kuch ho jaye — phir 10-15 sec ka final video lein.",
    groomerHintHindi: "सब कुछ हो जाए — फिर 10-15 सेकंड का फाइनल वीडियो लें।",
    proofType: "video",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "payment_proof",
    label: "Payment photo / screenshot",
    groomerLabel: "Payment confirm karein",
    groomerLabelHindi: "पेमेंट कन्फर्म करें",
    groomerHint: "Cash liya to photo lo. Online hua to screenshot lo. Dono zaroori hain.",
    groomerHintHindi: "कैश लिया तो फोटो लो। ऑनलाइन हुआ तो स्क्रीनशॉट लो। दोनों ज़रूरी हैं।",
    proofType: "mixed",
    requiredForCompletion: true,
    tiers: ["Essential", "Signature", "Complete"],
  },
  {
    key: "review_proof",
    label: "Review screenshot",
    groomerLabel: "Google review lein",
    groomerLabelHindi: "गूगल रिव्यू लें",
    groomerHint: "QR dikhao, customer scan kare aur review likhe — screenshot yahan add karein.",
    groomerHintHindi: "QR दिखाओ, कस्टमर स्कैन करे और रिव्यू लिखे — स्क्रीनशॉट यहाँ जोड़ें।",
    proofType: "image",
    requiredForCompletion: false,
    tiers: ["Essential", "Signature", "Complete"],
  },
];

export const BOOKING_SOP_STEP_KEYS = BOOKING_SOP_STEPS.map((step) => step.key);

export function isBookingSopStepKey(value: string): value is BookingSopStepKey {
  return BOOKING_SOP_STEP_KEYS.includes(value as BookingSopStepKey);
}

export function getBookingSopStepDefinition(stepKey: BookingSopStepKey) {
  return BOOKING_SOP_STEPS.find((step) => step.key === stepKey) ?? null;
}

export function getTierFromServiceName(serviceName: string): ServiceTier {
  const lower = serviceName.toLowerCase();
  if (lower.includes("complete") || lower.includes("pampering")) return "Complete";
  if (lower.includes("signature")) return "Signature";
  return "Essential";
}

export function getSopStepsForService(serviceName: string): BookingSopStepDefinition[] {
  const tier = getTierFromServiceName(serviceName);
  return BOOKING_SOP_STEPS.filter((step) => step.tiers.includes(tier));
}

export function getMissingRequiredSopLabels(
  completedKeys: Iterable<string>,
  serviceName?: string
) {
  const completedSet = new Set(completedKeys);
  const steps = serviceName ? getSopStepsForService(serviceName) : BOOKING_SOP_STEPS;
  return steps
    .filter((step) => step.requiredForCompletion && !completedSet.has(step.key))
    .map((step) => step.label);
}

export function hasRequiredSopEvidence(
  definition: BookingSopStepDefinition,
  step: BookingSopEvidenceStep | null | undefined,
  options?: { hasPaymentCollection?: boolean }
) {
  if (!definition.requiredForCompletion || definition.proofType === "manual") return true;
  if (!step || step.status !== "completed") return false;

  if (definition.key === "payment_proof") {
    return ((step.proofs?.length ?? 0) > 0) || !!options?.hasPaymentCollection;
  }

  return (step.proofs?.length ?? 0) > 0;
}

export function countRequiredSopEvidenceCompleted(
  steps: BookingSopEvidenceStep[],
  options?: { hasPaymentCollection?: boolean; serviceName?: string }
) {
  const definitions = options?.serviceName
    ? getSopStepsForService(options.serviceName)
    : BOOKING_SOP_STEPS;
  return definitions.filter((definition) => {
    if (!definition.requiredForCompletion || definition.proofType === "manual") return false;
    const step = steps.find((item) => item.stepKey === definition.key);
    return hasRequiredSopEvidence(definition, step, options);
  }).length;
}

export function getMissingRequiredSopEvidenceLabels(
  steps: BookingSopEvidenceStep[],
  options?: { hasPaymentCollection?: boolean; serviceName?: string }
) {
  const definitions = options?.serviceName
    ? getSopStepsForService(options.serviceName)
    : BOOKING_SOP_STEPS;
  return definitions
    .filter((definition) => definition.requiredForCompletion && definition.proofType !== "manual")
    .filter((definition) => {
      const step = steps.find((item) => item.stepKey === definition.key);
      return !hasRequiredSopEvidence(definition, step, options);
    })
    .map((definition) => definition.label);
}
