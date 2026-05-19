import type { BookingSopStepKey } from "./sop";
import type { CoachingStep } from "./pacerCoachingSteps";
import {
  COACHING_ARRIVE_SETUP,
  COACHING_OIL,
  COACHING_BATH,
  COACHING_BATH_ESSENTIAL,
  COACHING_COMPLETE_HAIRCUT_STYLE,
  COACHING_SIGNATURE_DRY,
  COACHING_SIGNATURE_HYGIENE_CUT,
  COACHING_ESSENTIAL_DRY,
  COACHING_FINISH,
  COACHING_PAYMENT,
} from "./pacerCoachingSteps";

export type { CoachingStep };

export type ServiceTier = "Essential" | "Signature" | "Complete";

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
  tier: ServiceTier;
  // Minimum % of phase time that must elapse before Next Phase is allowed
  minTimePercent?: number;
  // Rotating tips shown during minTime wait
  timedCoachingTips?: string[];
  timedCoachingTipsHindi?: string[];
};

// ─── Complete Pampering — 7 phases, ~111 min ────────────────────────────────

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
    tier: "Complete",
  },
  {
    index: 1,
    key: "oil_massage",
    label: "Oil Massage",
    labelHindi: "ऑयल मसाज",
    durationMinutes: 10,
    tasks: [
      "Dhire dhire poore body par oil massage karein",
      "Sir se pooch tak cover karein",
      "Gaanth wali jagah par extra time do",
      "Photo lo massage complete hone par",
    ],
    tasksHindi: [
      "धीरे-धीरे पूरे बॉडी पर ऑयल मसाज करें",
      "सिर से पूंछ तक cover करें",
      "गांठ वाली जगह पर extra समय दें",
      "मसाज पूरी होने पर फोटो लो",
    ],
    sopKeys: ["oil_massage_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Oil lagaane se pehle grooming notes mein skin sensitivity check karo.",
    coachNoteHintHindi: "ऑयल लगाने से पहले ग्रूमिंग नोट्स में स्किन सेंसिटिविटी देखें।",
    coachingSteps: COACHING_OIL,
    tier: "Complete",
    minTimePercent: 90,
  },
  {
    index: 2,
    key: "shampoo",
    label: "Shampoo",
    labelHindi: "शैम्पू",
    durationMinutes: 10,
    tasks: [
      "Shampoo poore body par lagaen",
      "Achhi tarah ragdein — 10 min minimum",
      "Coat fully lathered karein",
      "Photo lo — coat lathered dikhni chahiye",
    ],
    tasksHindi: [
      "शैम्पू पूरे बॉडी पर लगाएं",
      "अच्छी तरह रगड़ें — कम से कम 10 मिनट",
      "कोट पूरी तरह lathered करें",
      "फोटो लो — कोट lathered दिखनी चाहिए",
    ],
    sopKeys: ["shampoo_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Shampoo restrictions ya skin sensitivity grooming notes mein check karo pehle.",
    coachNoteHintHindi: "शैम्पू की पाबंदियां या स्किन सेंसिटिविटी ग्रूमिंग नोट्स में पहले देखें।",
    coachingSteps: [],
    tier: "Complete",
    minTimePercent: 80,
    timedCoachingTips: [
      "Jab shampoo laga liya — sabse pehle behind the ears, armpits aur belly thoroughly ragdo. Yahan knots sabse zyada hote hain.",
      "Ab neck aur chest area pe focus karo. Coat ki direction mein haath ferao taaki roots tak shampoo pahunche.",
      "Tail base aur private parts — ye hygiene areas hain, carefully clean karo. Gentle pressure use karo.",
      "Legs aur paws ke beech fingers daalo, inter-digital spaces clean karo. Yahan infection ka risk rehta hai.",
      "Ek last full-body press karo — puri coat lathered honi chahiye. Rinse ke liye taiyaar ho jaao.",
    ],
    timedCoachingTipsHindi: [
      "शैम्पू लगाने के बाद — ears के पीछे, armpits और belly पर अच्छी तरह रगड़ो। यहाँ knots सबसे ज़्यादा होती हैं।",
      "अब neck और chest area पर focus करो। कोट की direction में हाथ फेरो ताकि roots तक शैम्पू पहुँचे।",
      "Tail base और private parts — hygiene areas हैं, carefully clean करो। Gentle pressure use करो।",
      "Legs और paws के बीच fingers डालो, inter-digital spaces clean करो। यहाँ infection का risk रहता है।",
      "एक last full-body press करो — पूरी coat lathered होनी चाहिए। Rinse के लिए तैयार हो जाओ।",
    ],
  },
  {
    index: 3,
    key: "bath",
    label: "Rinse + Dry + Dental",
    labelHindi: "रिंस + ड्राई + डेंटल",
    durationMinutes: 18,
    tasks: [
      "Shampoo achhi tarah rinse karein",
      "Daant saaf karein (pet toothpaste)",
      "Towel se achhi tarah dry karein",
    ],
    tasksHindi: [
      "शैम्पू अच्छी तरह rinse करें",
      "दांत साफ करें (पेट टूथपेस्ट)",
      "तौलिए से अच्छी तरह सुखाएं",
    ],
    sopKeys: ["bath_dry_proof", "dental_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Shampoo restrictions ya skin issues grooming notes mein hain — zaroor check karo.",
    coachNoteHintHindi: "शैम्पू पाबंदियां या स्किन समस्याएं ग्रूमिंग नोट्स में हैं — ज़रूर देखें।",
    coachingSteps: COACHING_BATH,
    tier: "Complete",
  },
  {
    index: 4,
    key: "dry",
    label: "Blow Dry",
    labelHindi: "ब्लो ड्राई",
    durationMinutes: 15,
    tasks: [
      "Blow dry karein — low heat, low airspeed se shuru karo",
      "Baal brush karein section by section",
    ],
    tasksHindi: [
      "ब्लो ड्राई करें — low heat, low airspeed से शुरू करो",
      "बाल ब्रश करें section by section",
    ],
    sopKeys: [],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_SIGNATURE_DRY,
    tier: "Complete",
  },
  {
    index: 5,
    key: "haircut_styling",
    label: "Haircut & Styling",
    labelHindi: "हेयरकट और स्टाइलिंग",
    durationMinutes: 28,
    tasks: [
      "Hygiene haircut karein — panje, chehra, private parts",
      "Poore body ki hairstyling karein",
      "Panje par paw butter massage do",
      "Coat par serum lagaen",
      "Final combing aur hair setting karein",
    ],
    tasksHindi: [
      "हाइजीन हेयरकट करें — पंजे, चेहरा, प्राइवेट पार्ट्स",
      "पूरे शरीर की हेयर स्टाइलिंग करें",
      "पंजे पर पॉ बटर मसाज दें",
      "कोट पर सीरम लगाएं",
      "फाइनल कॉम्बिंग और हेयर सेटिंग करें",
    ],
    sopKeys: ["hairstyle_approval", "final_groom_proof"],
    coachNoteSource: "stylingNotes",
    coachNoteHint: "Style reference photos aur cut instructions yahan hain — dekh ke hi karo.",
    coachNoteHintHindi: "स्टाइल रेफरेंस फोटो और कट के निर्देश यहाँ हैं — देखकर ही करें।",
    coachingSteps: COACHING_COMPLETE_HAIRCUT_STYLE,
    tier: "Complete",
  },
  {
    index: 6,
    key: "treatments_finish",
    label: "Treatments & Finish",
    labelHindi: "ट्रीटमेंट और फिनिश",
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
    sopKeys: ["nail_trim_proof", "ear_check_proof"],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_FINISH,
    tier: "Complete",
  },
  {
    index: 7,
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
    tier: "Complete",
  },
];

// ─── Signature Care — 6 phases, ~90 min ─────────────────────────────────────

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
    tier: "Signature",
  },
  {
    index: 1,
    key: "shampoo",
    label: "Shampoo",
    labelHindi: "शैम्पू",
    durationMinutes: 10,
    tasks: [
      "Shampoo poore body par lagaen",
      "Achhi tarah ragdein — 10 min minimum",
      "Coat fully lathered karein",
      "Photo lo — coat lathered dikhni chahiye",
    ],
    tasksHindi: [
      "शैम्पू पूरे बॉडी पर लगाएं",
      "अच्छी तरह रगड़ें — कम से कम 10 मिनट",
      "कोट पूरी तरह lathered करें",
      "फोटो लो — कोट lathered दिखनी चाहिए",
    ],
    sopKeys: ["shampoo_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Shampoo restrictions ya skin sensitivity grooming notes mein check karo pehle.",
    coachNoteHintHindi: "शैम्पू की पाबंदियां या स्किन सेंसिटिविटी ग्रूमिंग नोट्स में पहले देखें।",
    coachingSteps: [],
    tier: "Signature",
    minTimePercent: 80,
    timedCoachingTips: [
      "Jab shampoo laga liya — sabse pehle behind the ears, armpits aur belly thoroughly ragdo. Yahan knots sabse zyada hote hain.",
      "Ab neck aur chest area pe focus karo. Coat ki direction mein haath ferao taaki roots tak shampoo pahunche.",
      "Tail base aur private parts — ye hygiene areas hain, carefully clean karo. Gentle pressure use karo.",
      "Legs aur paws ke beech fingers daalo, inter-digital spaces clean karo. Yahan infection ka risk rehta hai.",
      "Ek last full-body press karo — puri coat lathered honi chahiye. Rinse ke liye taiyaar ho jaao.",
    ],
    timedCoachingTipsHindi: [
      "शैम्पू लगाने के बाद — ears के पीछे, armpits और belly पर अच्छी तरह रगड़ो। यहाँ knots सबसे ज़्यादा होती हैं।",
      "अब neck और chest area पर focus करो। कोट की direction में हाथ फेरो ताकि roots तक शैम्पू पहुँचे।",
      "Tail base और private parts — hygiene areas हैं, carefully clean करो। Gentle pressure use करो।",
      "Legs और paws के बीच fingers डालो, inter-digital spaces clean करो। यहाँ infection का risk रहता है।",
      "एक last full-body press करो — पूरी coat lathered होनी चाहिए। Rinse के लिए तैयार हो जाओ।",
    ],
  },
  {
    index: 2,
    key: "bath",
    label: "Rinse + Dry + Dental",
    labelHindi: "रिंस + ड्राई + डेंटल",
    durationMinutes: 18,
    tasks: [
      "Shampoo achhi tarah rinse karein",
      "Daant saaf karein (pet toothpaste)",
      "Towel se achhi tarah dry karein",
    ],
    tasksHindi: [
      "शैम्पू अच्छी तरह rinse करें",
      "दांत साफ करें (पेट टूथपेस्ट)",
      "तौलिए से अच्छी तरह सुखाएं",
    ],
    sopKeys: ["bath_dry_proof", "dental_proof"],
    coachNoteSource: "groomingNotes",
    coachNoteHint: "Shampoo restrictions ya skin issues grooming notes mein hain — zaroor check karo.",
    coachNoteHintHindi: "शैम्पू पाबंदियां या स्किन समस्याएं ग्रूमिंग नोट्स में हैं — ज़रूर देखें।",
    coachingSteps: COACHING_BATH,
    tier: "Signature",
  },
  {
    index: 3,
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
    tier: "Signature",
  },
  {
    index: 4,
    key: "hygiene_cut",
    label: "Hygiene Haircut",
    labelHindi: "हाइजीन हेयरकट",
    durationMinutes: 22,
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
    tier: "Signature",
  },
  {
    index: 5,
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
    sopKeys: ["nail_trim_proof", "ear_check_proof"],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_FINISH,
    tier: "Signature",
  },
  {
    index: 6,
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
    tier: "Signature",
  },
];

// ─── Essential Care — 5 phases, ~65 min ─────────────────────────────────────

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
    tier: "Essential",
  },
  {
    index: 1,
    key: "bath",
    label: "Bath",
    labelHindi: "बाथ",
    durationMinutes: 18,
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
    tier: "Essential",
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
    sopKeys: [],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_ESSENTIAL_DRY,
    tier: "Essential",
  },
  {
    index: 3,
    key: "finish",
    label: "Finishing",
    labelHindi: "फिनिशिंग",
    durationMinutes: 12,
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
    sopKeys: ["nail_trim_proof", "ear_check_proof", "final_groom_proof"],
    coachNoteSource: null,
    coachNoteHint: "",
    coachNoteHintHindi: "",
    coachingSteps: COACHING_FINISH,
    tier: "Essential",
  },
  {
    index: 4,
    key: "payment_review",
    label: "Payment & Review",
    labelHindi: "पेमेंट और रिव्यू",
    durationMinutes: 10,
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
    tier: "Essential",
  },
];

export function getPacerPhases(serviceName: string): PacerPhase[] {
  const lower = serviceName.toLowerCase();
  if (lower.includes("complete") || lower.includes("pampering")) return PHASES_COMPLETE;
  if (lower.includes("signature")) return PHASES_SIGNATURE;
  return PHASES_ESSENTIAL;
}

export function getTierFromServiceName(serviceName: string): ServiceTier {
  const lower = serviceName.toLowerCase();
  if (lower.includes("complete") || lower.includes("pampering")) return "Complete";
  if (lower.includes("signature")) return "Signature";
  return "Essential";
}

export function getTotalPacerMinutes(serviceName: string): number {
  return getPacerPhases(serviceName).reduce((sum, p) => sum + p.durationMinutes, 0);
}
