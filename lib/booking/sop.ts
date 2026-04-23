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
    groomerHint: "Groomer aur helper dono uniform mein ek saath selfie lein. Sirf camera use karein.",
    groomerHintHindi: "ग्रूमर और हेल्पर दोनों यूनिफॉर्म में साथ में सेल्फी लें। सिर्फ कैमरा इस्तेमाल करें।",
    proofType: "image",
    requiredForCompletion: true,
  },
  {
    key: "pet_settled",
    label: "Pet settled",
    groomerLabel: "Pet shaant ho gaya",
    groomerLabelHindi: "पेट शांत हो गया",
    groomerHint: "Pet ko aaraam se settle karke hi aage badhein.",
    groomerHintHindi: "पेट को आराम से सेटल करके ही आगे बढ़िए।",
    proofType: "manual",
    requiredForCompletion: true,
  },
  {
    key: "sanitization_proof",
    label: "Sanitization video",
    groomerLabel: "Safai ka video",
    groomerLabelHindi: "सफाई का वीडियो",
    groomerHint: "10-15 sec ka chhota video. Tools aur setup saaf dikhna chahiye.",
    groomerHintHindi: "10-15 सेकंड का छोटा वीडियो। टूल्स और सेटअप साफ दिखना चाहिए।",
    proofType: "video",
    requiredForCompletion: true,
  },
  {
    key: "pre_groom_video",
    label: "Before grooming video",
    groomerLabel: "Shuru se pehle ka video",
    groomerLabelHindi: "शुरू से पहले का वीडियो",
    groomerHint: "Pet ka current hair growth aur starting look saaf dikhna chahiye.",
    groomerHintHindi: "पेट का करंट हेयर ग्रोथ और शुरुआती लुक साफ दिखना चाहिए।",
    proofType: "video",
    requiredForCompletion: true,
  },
  {
    key: "bath_dry_proof",
    label: "Bath / dry photo or video",
    groomerLabel: "Bath aur dry ke baad",
    groomerLabelHindi: "बाथ और ड्राय के बाद",
    groomerHint: "Photo ya video mein pet clean aur dry dikhna chahiye.",
    groomerHintHindi: "फोटो या वीडियो में पेट साफ और ड्राय दिखना चाहिए।",
    proofType: "mixed",
    requiredForCompletion: true,
  },
  {
    key: "hairstyle_approval",
    label: "Style approval photos",
    groomerLabel: "Style check photo",
    groomerLabelHindi: "स्टाइल चेक फोटो",
    groomerHint: "Face aur body ka cut clear photo mein dikhna chahiye.",
    groomerHintHindi: "फेस और बॉडी का कट साफ फोटो में दिखना चाहिए।",
    proofType: "image",
    requiredForCompletion: true,
  },
  {
    key: "final_groom_proof",
    label: "Final grooming video",
    groomerLabel: "Final look video",
    groomerLabelHindi: "फाइनल लुक वीडियो",
    groomerHint: "10-15 sec ka final video. Finish aur styling poori dikhni chahiye.",
    groomerHintHindi: "10-15 सेकंड का फाइनल वीडियो। फिनिश और स्टाइलिंग पूरी दिखनी चाहिए।",
    proofType: "video",
    requiredForCompletion: true,
  },
  {
    key: "payment_proof",
    label: "Payment photo / screenshot",
    groomerLabel: "Payment photo / screenshot",
    groomerLabelHindi: "पेमेंट फोटो / स्क्रीनशॉट",
    groomerHint: "Cash ho ya online, payment screen ya receipt ki camera photo zaroor lein.",
    groomerHintHindi: "कैश हो या ऑनलाइन, पेमेंट स्क्रीन या रसीद की कैमरा फोटो ज़रूर लें।",
    proofType: "mixed",
    requiredForCompletion: true,
  },
  {
    key: "review_proof",
    label: "Review screenshot",
    groomerLabel: "Review screenshot",
    groomerLabelHindi: "रिव्यू स्क्रीनशॉट",
    groomerHint: "Customer review bheje to uska screenshot yahan add karein.",
    groomerHintHindi: "कस्टमर रिव्यू भेजे तो उसका स्क्रीनशॉट यहाँ जोड़िए।",
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
