export type BookingSopStepKey =
  | "en_route"
  | "arrived"
  | "dress_check_selfie"
  | "pet_settled"
  | "sanitization_proof"
  | "pre_groom_video"
  | "bath_dry_proof"
  | "hairstyle_approval"
  | "final_groom_proof"
  | "payment_proof"
  | "review_proof";

export type BookingSopStepDefinition = {
  key: BookingSopStepKey;
  label: string;
  groomerLabel: string;
  groomerLabelHindi: string;
  groomerHint?: string;
  groomerHintHindi?: string;
  proofType: "manual" | "image" | "video" | "mixed";
  requiredForCompletion: boolean;
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
  },
  {
    key: "final_groom_proof",
    label: "Final grooming video",
    groomerLabel: "Final look video",
    groomerLabelHindi: "फाइनल लुक वीडियो",
    groomerHint: "Nails, ears, perfume sab ho jaye — phir 10-15 sec ka final video lein.",
    groomerHintHindi: "नेल्स, कान, परफ्यूम सब हो जाए — फिर 10-15 सेकंड का फाइनल वीडियो लें।",
    proofType: "video",
    requiredForCompletion: true,
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
  },
];

export const BOOKING_SOP_STEP_KEYS = BOOKING_SOP_STEPS.map((step) => step.key);

export function isBookingSopStepKey(value: string): value is BookingSopStepKey {
  return BOOKING_SOP_STEP_KEYS.includes(value as BookingSopStepKey);
}

export function getBookingSopStepDefinition(stepKey: BookingSopStepKey) {
  return BOOKING_SOP_STEPS.find((step) => step.key === stepKey) ?? null;
}

export function getMissingRequiredSopLabels(completedKeys: Iterable<string>) {
  const completedSet = new Set(completedKeys);
  return BOOKING_SOP_STEPS
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
  options?: { hasPaymentCollection?: boolean }
) {
  return BOOKING_SOP_STEPS.filter((definition) => {
    if (!definition.requiredForCompletion || definition.proofType === "manual") return false;
    const step = steps.find((item) => item.stepKey === definition.key);
    return hasRequiredSopEvidence(definition, step, options);
  }).length;
}

export function getMissingRequiredSopEvidenceLabels(
  steps: BookingSopEvidenceStep[],
  options?: { hasPaymentCollection?: boolean }
) {
  return BOOKING_SOP_STEPS
    .filter((definition) => definition.requiredForCompletion && definition.proofType !== "manual")
    .filter((definition) => {
      const step = steps.find((item) => item.stepKey === definition.key);
      return !hasRequiredSopEvidence(definition, step, options);
    })
    .map((definition) => definition.label);
}
