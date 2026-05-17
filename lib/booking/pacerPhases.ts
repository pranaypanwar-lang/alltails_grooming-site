import type { BookingSopStepKey } from "./sop";
import type { CoachingStep } from "./pacerCoachingSteps";
import {
  COACHING_ARRIVE_SETUP,
  COACHING_OIL,
  COACHING_BATH,
  COACHING_BATH_ESSENTIAL,
  COACHING_COMPLETE_DRY_STYLE,
  COACHING_SIGNATURE_DRY,
  COACHING_SIGNATURE_HYGIENE_CUT,
  COACHING_ESSENTIAL_DRY,
  COACHING_FINISH,
  COACHING_PAYMENT,
} from "./pacerCoachingSteps";

export type { CoachingStep };

export type PacerPhase = {
  index: number;
  key: string;
  label: string;
  labelHindi: string;
  durationMinutes: number;
  tasks: string[];
  tasksHindi: string[];
  sopKeys: BookingSopStepKey[];
  coachNoteSource: "groomingNotes" | "stylingNotes" | "temperament" | null;
  coachNoteHint: string;
  coachNoteHintHindi: string;
  coachingSteps: CoachingStep[];
  // Minimum % of phase time that must elapse before Next Phase is allowed
  minTimePercent?: number;
};

const PHASES_COMPLETE: PacerPhase[] = [
  {
    index: 0,
    key: "arrive_setup",
    label: "Arrive & Setup",
    labelHindi: "आएं और सेटअप करें",
    durationMinutes: 10,
    tasks: [
      "Parent ko greet karein, pyaar se milein",
      "Pet ko settle karein — thoda time do",
      "Workstation set up karein",
      "Saare equipment sanitise karein",
      "Dress check selfie lo",
    ],
    tasksHindi: [
      "पेट पैरेंट से मिलें, प्यार से मिलें",
      "पेट को शांत करें — थोड़ा समय दें",
      "वर्कस्टेशन सेट करें",
      "सारे उपकरण साफ करें",
      "ड्रेस चेक सेल्फी लें",
    ],
    sopKeys: ["dress_check_selfie", "sanitization_proof", "pet_settled", "pre_groom_video"],
    coachNoteSource: "temperament",
    coachNoteHint: "Pehle temperament dekho — pet ko calm karo tabhi kaam shuru karo.",
    coachNoteHintHindi: "पहले टेम्परामेंट देखें — पेट को शांत करके ही काम शुरू करें।",
    coachingSteps: COACHING_ARRIVE_SETUP,
  },
  {
    index: 1,
    key: "pre_treatment",
    label: "Oil Massage",
    labelHindi: "ऑयल मसाज",
    durationMinutes: 12,
    tasks: [
      "Dhire dhire oil massage karein (10-15 min)",
      "Sir se pooch tak karein — poora body cover karein",
      "Coat ki gaanth wali jagah par zyaada time do",
    ],
    tasksHindi: [
      "धीरे-धीरे ऑयल मसाज करें (10-15 मिनट)",
      "सिर से पूंछ तक — पूरा बॉडी कवर करें",
      "कोट की गांठ वाली जगह पर ज़्यादा समय दें",
    ],
    sopKeys: [],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Oil lagaane se pehle grooming notes mein skin sensitivity check karo.",
    coachNoteHintHindi: "ऑयल लगाने से पहले ग्रूमिंग नोट्स में स्किन सेंसिटिविटी देखें।",
    coachingSteps: COACHING_OIL,
    minTimePercent: 80,
  },
  {
    index: 2,
    key: "bath",
    label: "Bath",
    labelHindi: "बाथ",
    durationMinutes: 22,
    tasks: [
      "Shampoo aur conditioner lagaen — achhi tarah massage karein",
      "Daant saaf karein",
      "Towel se achhi tarah dry karein",
    ],
    tasksHindi: [
      "शैम्पू और कंडीशनर लगाएं — अच्छी तरह मसाज करें",
      "दांत साफ करें",
      "तौलिए से अच्छी तरह सुखाएं",
    ],
    sopKeys: ["bath_dry_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Shampoo restrictions ya skin issues grooming notes mein hain — zaroor check karo.",
    coachNoteHintHindi: "शैम्पू पाबंदियां या स्किन समस्याएं ग्रूमिंग नोट्स में हैं — ज़रूर देखें।",
    coachingSteps: COACHING_BATH,
  },
  {
    index: 3,
    key: "dry_style",
    label: "Dry & Style",
    labelHindi: "ड्राई और स्टाइल",
    durationMinutes: 30,
    tasks: [
      "Blow dry karein aur baal brush karein",
      "Poore body ki hairstyling karein",
      "Panje par paw butter massage do",
      "Coat par serum lagaen",
      "Final combing aur hair setting karein",
    ],
    tasksHindi: [
      "ब्लो ड्राई करें और बाल ब्रश करें",
      "पूरे शरीर की हेयर स्टाइलिंग करें",
      "पंजे पर पॉ बटर मसाज दें",
      "कोट पर सीरम लगाएं",
      "फाइनल कॉम्बिंग और हेयर सेटिंग करें",
    ],
    sopKeys: ["hairstyle_approval", "final_groom_proof"],
    coachNoteSource: "stylingNotes",
    coachNoteHint: "Style reference photos aur cut instructions yahan hain — dekh ke hi karo.",
    coachNoteHintHindi: "स्टाइल रेफरेंस फोटो और कट के निर्देश यहाँ हैं — देखकर ही करें।",
    coachingSteps: COACHING_COMPLETE_DRY_STYLE,
  },
  {
    index: 4,
    key: "finish",
    label: "Finishing",
    labelHindi: "फिनिशिंग",
    durationMinutes: 18,
    tasks: [
      "Nails trim aur file karein",
      "Kaan saaf karein",
      "Perfume lagaen",
      "Final check — sir se pooch tak",
      "Workstation pack karein",
    ],
    tasksHindi: [
      "नेल ट्रिम और फाइल करें",
      "कान साफ करें",
      "परफ्यूम लगाएं",
      "फाइनल चेक — सिर से पूंछ तक",
      "वर्कस्टेशन पैक करें",
    ],
    sopKeys: [],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_FINISH,
  },
  {
    index: 5,
    key: "payment_review",
    label: "Payment & Review",
    labelHindi: "पेमेंट और रिव्यू",
    durationMinutes: 8,
    tasks: [
      "Payment lo",
      "Customer ko Google Review QR dikhao aur scan karwao",
      "Booking complete karo",
    ],
    tasksHindi: [
      "पेमेंट लें",
      "कस्टमर को Google Review QR दिखाएं और स्कैन करवाएं",
      "बुकिंग पूरी करें",
    ],
    sopKeys: ["payment_proof", "review_proof"],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_PAYMENT,
  },
];

const PHASES_SIGNATURE: PacerPhase[] = [
  {
    index: 0,
    key: "arrive_setup",
    label: "Arrive & Setup",
    labelHindi: "आएं और सेटअप करें",
    durationMinutes: 10,
    tasks: [
      "Parent ko greet karein, pyaar se milein",
      "Pet ko settle karein — thoda time do",
      "Workstation set up karein",
      "Saare equipment sanitise karein",
      "Dress check selfie lo",
    ],
    tasksHindi: [
      "पेट पैरेंट से मिलें, प्यार से मिलें",
      "पेट को शांत करें — थोड़ा समय दें",
      "वर्कस्टेशन सेट करें",
      "सारे उपकरण साफ करें",
      "ड्रेस चेक सेल्फी लें",
    ],
    sopKeys: ["dress_check_selfie", "sanitization_proof", "pet_settled", "pre_groom_video"],
    coachNoteSource: "temperament",
    coachNoteHint: "Pehle temperament dekho — pet ko calm karo tabhi kaam shuru karo.",
    coachNoteHintHindi: "पहले टेम्परामेंट देखें — पेट को शांत करके ही काम शुरू करें।",
    coachingSteps: COACHING_ARRIVE_SETUP,
  },
  {
    index: 1,
    key: "bath",
    label: "Bath",
    labelHindi: "बाथ",
    durationMinutes: 20,
    tasks: [
      "Shampoo aur conditioner lagaen — achhi tarah massage karein",
      "Daant saaf karein",
      "Towel se achhi tarah dry karein",
    ],
    tasksHindi: [
      "शैम्पू और कंडीशनर लगाएं — अच्छी तरह मसाज करें",
      "दांत साफ करें",
      "तौलिए से अच्छी तरह सुखाएं",
    ],
    sopKeys: ["bath_dry_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Shampoo restrictions ya skin issues grooming notes mein hain — zaroor check karo.",
    coachNoteHintHindi: "शैम्पू पाबंदियां या स्किन समस्याएं ग्रूमिंग नोट्स में हैं — ज़रूर देखें।",
    coachingSteps: COACHING_BATH,
  },
  {
    index: 2,
    key: "dry",
    label: "Blow Dry",
    labelHindi: "ब्लो ड्राई",
    durationMinutes: 18,
    tasks: [
      "Blow dry karein aur baal brush karein",
    ],
    tasksHindi: [
      "ब्लो ड्राई करें और बाल ब्रश करें",
    ],
    sopKeys: [],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_SIGNATURE_DRY,
  },
  {
    index: 3,
    key: "hygiene_cut",
    label: "Hygiene Haircut",
    labelHindi: "हाइजीन हेयरकट",
    durationMinutes: 20,
    tasks: [
      "Hygiene haircut karein — panje, chehra, private parts",
      "Final combing aur hair setting karein",
    ],
    tasksHindi: [
      "हाइजीन हेयरकट करें — पंजे, चेहरा, प्राइवेट पार्ट्स",
      "फाइनल कॉम्बिंग और हेयर सेटिंग करें",
    ],
    sopKeys: ["hairstyle_approval", "final_groom_proof"],
    coachNoteSource: "stylingNotes",
    coachNoteHint: "Hygiene cut areas aur style notes yahan hain — dekh ke karo.",
    coachNoteHintHindi: "हाइजीन कट के एरिया और स्टाइल नोट्स यहाँ हैं — देखकर करें।",
    coachingSteps: COACHING_SIGNATURE_HYGIENE_CUT,
  },
  {
    index: 4,
    key: "finish",
    label: "Finishing",
    labelHindi: "फिनिशिंग",
    durationMinutes: 10,
    tasks: [
      "Nails trim aur file karein",
      "Kaan saaf karein",
      "Final check — sir se pooch tak",
      "Workstation pack karein",
    ],
    tasksHindi: [
      "नेल ट्रिम और फाइल करें",
      "कान साफ करें",
      "फाइनल चेक — सिर से पूंछ तक",
      "वर्कस्टेशन पैक करें",
    ],
    sopKeys: [],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_FINISH,
  },
  {
    index: 5,
    key: "payment_review",
    label: "Payment & Review",
    labelHindi: "पेमेंट और रिव्यू",
    durationMinutes: 7,
    tasks: [
      "Payment lo",
      "Customer ko Google Review QR dikhao aur scan karwao",
      "Booking complete karo",
    ],
    tasksHindi: [
      "पेमेंट लें",
      "कस्टमर को Google Review QR दिखाएं और स्कैन करवाएं",
      "बुकिंग पूरी करें",
    ],
    sopKeys: ["payment_proof", "review_proof"],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_PAYMENT,
  },
];

const PHASES_ESSENTIAL: PacerPhase[] = [
  {
    index: 0,
    key: "arrive_setup",
    label: "Arrive & Setup",
    labelHindi: "आएं और सेटअप करें",
    durationMinutes: 10,
    tasks: [
      "Parent ko greet karein, pyaar se milein",
      "Pet ko settle karein — thoda time do",
      "Workstation set up karein",
      "Saare equipment sanitise karein",
      "Dress check selfie lo",
    ],
    tasksHindi: [
      "पेट पैरेंट से मिलें, प्यार से मिलें",
      "पेट को शांत करें — थोड़ा समय दें",
      "वर्कस्टेशन सेट करें",
      "सारे उपकरण साफ करें",
      "ड्रेस चेक सेल्फी लें",
    ],
    sopKeys: ["dress_check_selfie", "sanitization_proof", "pet_settled", "pre_groom_video"],
    coachNoteSource: "temperament",
    coachNoteHint: "Pehle temperament dekho — pet ko calm karo tabhi kaam shuru karo.",
    coachNoteHintHindi: "पहले टेम्परामेंट देखें — पेट को शांत करके ही काम शुरू करें।",
    coachingSteps: COACHING_ARRIVE_SETUP,
  },
  {
    index: 1,
    key: "bath",
    label: "Bath",
    labelHindi: "बाथ",
    durationMinutes: 20,
    tasks: [
      "Shampoo aur conditioner lagaen — achhi tarah massage karein",
      "Towel se achhi tarah dry karein",
    ],
    tasksHindi: [
      "शैम्पू और कंडीशनर लगाएं — अच्छी तरह मसाज करें",
      "तौलिए से अच्छी तरह सुखाएं",
    ],
    sopKeys: ["bath_dry_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Shampoo restrictions ya skin issues grooming notes mein hain — zaroor check karo.",
    coachNoteHintHindi: "शैम्पू पाबंदियां या स्किन समस्याएं ग्रूमिंग नोट्स में हैं — ज़रूर देखें।",
    coachingSteps: COACHING_BATH_ESSENTIAL,
  },
  {
    index: 2,
    key: "dry",
    label: "Blow Dry",
    labelHindi: "ब्लो ड्राई",
    durationMinutes: 15,
    tasks: [
      "Blow dry karein aur baal brush karein",
      "Final combing aur hair setting karein",
    ],
    tasksHindi: [
      "ब्लो ड्राई करें और बाल ब्रश करें",
      "फाइनल कॉम्बिंग और हेयर सेटिंग करें",
    ],
    sopKeys: ["final_groom_proof"],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_ESSENTIAL_DRY,
  },
  {
    index: 3,
    key: "finish",
    label: "Finishing",
    labelHindi: "फिनिशिंग",
    durationMinutes: 10,
    tasks: [
      "Nails trim aur file karein",
      "Kaan saaf karein",
      "Final check — sir se pooch tak",
      "Workstation pack karein",
    ],
    tasksHindi: [
      "नेल ट्रिम और फाइल करें",
      "कान साफ करें",
      "फाइनल चेक — सिर से पूंछ तक",
      "वर्कस्टेशन पैक करें",
    ],
    sopKeys: [],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_FINISH,
  },
  {
    index: 4,
    key: "payment_review",
    label: "Payment & Review",
    labelHindi: "पेमेंट और रिव्यू",
    durationMinutes: 7,
    tasks: [
      "Payment lo",
      "Customer ko Google Review QR dikhao aur scan karwao",
      "Booking complete karo",
    ],
    tasksHindi: [
      "पेमेंट लें",
      "कस्टमर को Google Review QR दिखाएं और स्कैन करवाएं",
      "बुकिंग पूरी करें",
    ],
    sopKeys: ["payment_proof", "review_proof"],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_PAYMENT,
  },
];

export function getPacerPhases(serviceName: string): PacerPhase[] {
  const lower = serviceName.toLowerCase();
  if (lower.includes("complete") || lower.includes("pampering")) return PHASES_COMPLETE;
  if (lower.includes("signature")) return PHASES_SIGNATURE;
  return PHASES_ESSENTIAL;
}

export function getTotalPacerMinutes(serviceName: string): number {
  return getPacerPhases(serviceName).reduce((sum, p) => sum + p.durationMinutes, 0);
}
