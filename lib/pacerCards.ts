export type PacerPhase = "arrival" | "bath" | "trim" | "wrapup";

export type PacerCard = {
  id: string;
  phase: PacerPhase;
  titleHindi: string;
  titleEn: string;
  timeLabel: string;
  // The ONE dominant thing to do right now — shown large
  primaryAction: string;
  // Secondary detail bullets — collapsed by default
  details: string[];
  // Red warning callouts
  warningBullets?: string[];
  // Checkboxes groomer must tick before marking step done
  doneChecks: string[];
  // Nervous-dog specific tip shown when isNervous=true
  nervousTip?: string;
  // Quick-flag panel for issue reporting (ear, skin, injury etc.)
  flagOptions?: string[];
  // If set, a visual placeholder is shown
  imageSlot?: string;
  // Package filter — undefined = always show
  packages?: Array<"basic" | "signature" | "pampering">;
};

export type PacerContext = {
  petName: string | null;
  petBreed: string;
  temperament: string | null;
  groomingNotes: string | null;
  stylingNotes: string | null;
  serviceName: string;
  customerName: string;
  isNervous: boolean;
};

export const PHASE_LABELS: Record<PacerPhase, string> = {
  arrival: "Aane ke baad",
  bath: "Nahane ka kaam",
  trim: "Cutting & Finishing",
  wrapup: "Kaam khatam",
};

export const PHASE_EMOJI: Record<PacerPhase, string> = {
  arrival: "🚪",
  bath: "🚿",
  trim: "✂️",
  wrapup: "✅",
};

// Keywords that indicate a nervous/anxious pet
const NERVOUS_KEYWORDS = ["nervous", "anxious", "fearful", "scared", "aggressive", "bites", "shy", "timid", "darr", "darta", "kaatna", "kaatta"];

export function isNervousPet(temperament: string | null | undefined): boolean {
  if (!temperament) return false;
  const lower = temperament.toLowerCase();
  return NERVOUS_KEYWORDS.some((kw) => lower.includes(kw));
}

// Breed-specific trimming rules injected dynamically
export function getBreedTrimNote(breed: string): string | null {
  const b = breed.toLowerCase();
  if (b.includes("golden")) return "⚠️ Golden: Sirf feather tidy karo, body coat bilkul shave mat karo";
  if (b.includes("labrador") || b.includes("lab")) return "⚠️ Lab: De-shed + paw/tail tidy only — body shave NAHI";
  if (b.includes("pomeranian") || b.includes("pom")) return "⚠️ Pom: Conservative outline + sanitary only — body shave NAHI";
  if (b.includes("spitz") || b.includes("indian spitz")) return "⚠️ Indian Spitz: Conservative outline + sanitary — full shave se coat kharab ho jaata hai";
  if (b.includes("shih tzu") || b.includes("shih-tzu")) return "✂️ Shih Tzu: Puppy/teddy cut okay — face khula aur balance clean rakho";
  if (b.includes("lhasa") || b.includes("apso")) return "✂️ Lhasa Apso: Puppy cut okay — face balance clean rakho";
  if (b.includes("husky") || b.includes("malamute")) return "⚠️ Double coat — KABHI shave mat karo, coat regrowth damage permanent hai";
  if (b.includes("beagle")) return "✂️ Beagle: Short smooth coat — mainly de-shed, nails, ears, sanitary trim";
  return null;
}

export const PACER_CARDS: PacerCard[] = [
  // ── ARRIVAL ──────────────────────────────────────────────
  {
    id: "greet_parent",
    phase: "arrival",
    titleHindi: "Parent ko greet karo",
    titleEn: "Meet the parent & pet",
    timeLabel: "1–2 min",
    primaryAction: "Darwaze pe smile ke saath parent aur pet ka naam confirm karo — phir 20 second mein package aur plan bata do",
    details: [
      "Bathroom, power point, drying spot aur clean-up plan calmly confirm karo",
      "Rushed entry ya vague promises trust tod dete hain — shuru accha hona zaroori hai",
      "Agar dog nervous ho — seedha haath mat badhao, side body rakho, aankhon mein stare mat karo",
    ],
    doneChecks: [
      "Parent relaxed hai, plan samajh aa gaya",
      "Dog curious ya neutral hai — stiff/freeze nahi",
      "Setup spots confirm ho gaye",
    ],
    nervousTip: "Dog se directly mat milo — pehle parent se baat karo, dog ko apne aap sniff karne do. Side body rakho.",
    imageSlot: "Dog ke stress signals — lip lick, whale eye, tucked tail, stiff body",
  },
  {
    id: "settle_pet",
    phase: "arrival",
    titleHindi: "Pet ko settle karo",
    titleEn: "Pacify the pet",
    timeLabel: "2–5 min (nervous dog: zyada)",
    primaryAction: "Pet ko 1–3 min apni jagah decompress karne do — leash par ya safe corner mein. Sirf naam lo, side se baitho.",
    details: [
      "Treat tabhi do jab dog khud ready lage — uski taraf phenk do, hath se directly mat do",
      "Ek saath zyada touch, tight pakadna ya 'jaldi settle' pressure bilkul mat do",
      "Lip licking/yawning/tucked tail = stress badh raha hai — aur time do",
    ],
    doneChecks: [
      "Breathing normal, body loose",
      "Dog sniff kar raha hai ya treats le raha hai",
      "Lip licking ya yawning kam ho gaya",
    ],
    nervousTip: "Nonslip towel bichha do, parent se calm support lo. Dog freeze kare ya peeche hate to easy version par lo — force kabhi nahi.",
    imageSlot: "Pet stress signals — 4 stages: early stress → fear → freeze → red flag",
  },
  {
    id: "workstation_setup",
    phase: "arrival",
    titleHindi: "Jagah set karo",
    titleEn: "Workstation setup",
    timeLabel: "3–4 min",
    primaryAction: "Nonslip mat lagao, cords side karo, sirf current tools bahar nikalo — floor dry aur pet-slip-free hona chahiye",
    details: [
      "Tools reuse se pehle: hair/debris hatao → disinfect karo → contact time do → rinse/dry karo",
      "Noisy tools (dryer, clipper, grinder) abhi OFF rakho — nervous dog ke paas quiet setup zaroori hai",
    ],
    doneChecks: [
      "Floor dry aur hair-free hai",
      "Tools visibly clean hain",
      "Noisy tools band hain",
    ],
  },
  {
    id: "dress_selfie",
    phase: "arrival",
    titleHindi: "Dress check selfie lo",
    titleEn: "Dress check selfie",
    timeLabel: "20–30 sec",
    primaryAction: "Abhi ek selfie lo — clean uniform, tied hair, stable footwear. Yeh SOP proof hai.",
    details: [
      "Loose dupatta, latakti jewelry, slippery chappal ya wet sleeves ke saath BILKUL kaam shuru mat karo",
    ],
    doneChecks: [
      "Selfie clear hai, uniform neat",
      "Koi loose item pet ke reach mein nahi",
    ],
  },
  {
    id: "pregroom_video",
    phase: "arrival",
    titleHindi: "Pre-groom video banao",
    titleEn: "Pre-groom condition video",
    timeLabel: "30–60 sec",
    primaryAction: "Ek slow video — face, eyes, ears, coat, mats, paws, nails, tail. Verbally pet ka naam aur jo bhi anormal ho woh bol do.",
    details: [
      "Blur, dark ya rushed video mat banao — existing redness, cuts, limping, discharge miss mat karo",
      "Agar redness/cut/mat mile: abhi hi parent ko dikhao aur explain karo",
    ],
    doneChecks: [
      "Video mein face, coat, paws, nails sab cover hain",
      "Parent ko pre-existing conditions samajh aa gayi",
    ],
    flagOptions: ["Redness / injury", "Severe matting", "Limping / pain signs", "Discharge", "Skin issue"],
    nervousTip: "No-flash, thoda distance. Stress badhe to closeup baad mein lo — video forced mat lo.",
  },

  // ── BATH ─────────────────────────────────────────────────
  {
    id: "oil_massage",
    phase: "bath",
    titleHindi: "Oil massage karo",
    titleEn: "Pre-bath oil massage",
    timeLabel: "3–7 min + 3–5 min absorb",
    primaryAction: "Pet-safe light oil — palms mein lo, neck se tail tak coat direction mein halka spread karo. Phir 3–5 min absorb hone do.",
    details: [
      "Shoulders, chest, thighs aur dry zones cover karo",
      "Essential oil, strong fragrance ya open wound par oil mat lagao",
      "Coat chipka ya greasy feel na aaye — itna hi lagao",
    ],
    doneChecks: [
      "Coat lightly nourished — patchy greasy nahi",
      "Skin soaked nahi, absorb ho rahi hai",
    ],
    nervousTip: "Full body ek saath nahi — zone-by-zone karo. Head aur paws sabse last.",
    packages: ["pampering"],
  },
  {
    id: "shampoo",
    phase: "bath",
    titleHindi: "Shampoo aur conditioner",
    titleEn: "Shampoo & conditioner",
    timeLabel: "10–20 min",
    primaryAction: "Bath se pehle brush-out karo. Phir lukewarm water se skin tak bhigo — shampoo dilute karke coat growth direction mein lather karo.",
    details: [
      "Rinse aksar shampoo se zyada time leta hai — armpits/under-chest/under-tail residue-free hone chahiye",
      "Human shampoo KABHI nahi — residue dryness, flaking aur irritation badhata hai",
      "Matted coat ko bina brush bhigona mat — mats set ho jaate hain",
    ],
    doneChecks: [
      "Rinse mein pani clear nikal raha hai",
      "Armpits, under-chest, tail base residue-free",
      "Coat fresh lagta hai, skin par soap film nahi",
    ],
    nervousTip: "Face last mein washcloth se karo. Eyes/ears mein pani ya foam bilkul mat jaane do. Breaks do.",
  },
  {
    id: "dental",
    phase: "bath",
    titleHindi: "Daant saaf karo",
    titleEn: "Dental hygiene",
    timeLabel: "1–3 min",
    primaryAction: "Lip utha do, sirf outer tooth surfaces brush ya gauze-wipe karo. Pet toothpaste hi — mouth force-open karne ki zarurat nahi.",
    details: [
      "Human toothpaste aur metal tartar scraping KABHI nahi",
      "Heavy tartar reh sakta hai — yeh sirf visible plaque ke liye hai, vet cleaning alag hoti hai",
    ],
    doneChecks: [
      "Dog minimal stress mein raha",
      "Outer teeth clean feel, gums bleed nahi ki",
    ],
    nervousTip: "Pehle 2–4 front teeth se start — flavored toothpaste taste karvao, reward do, phir dheere sides par bado.",
  },
  {
    id: "towel_dry",
    phase: "bath",
    titleHindi: "Towel dry karo",
    titleEn: "Towel drying",
    timeLabel: "3–8 min",
    primaryAction: "Tub se nikalte hi nonslip surface par lao. Towel wrap karke pat-dry — press, blot, squeeze motion. Rub NAHI.",
    details: [
      "Ears ke bahar, chest, belly, legs, tail base — sab cover karo",
      "Ear opening ke andar kuch mat push karo — sirf bahar se dry",
      "Zor se rub karna tangles aur skin irritation deta hai",
    ],
    doneChecks: [
      "Dripping band ho gayi",
      "Coat sirf damp hai — mats tighter nahi lage",
    ],
    nervousTip: "2–3 chote towels rotate karo. Face pe towel force mat karo. Stress signs aayein to wrap hold karke calm petting do.",
  },
  {
    id: "blow_dry",
    phase: "bath",
    titleHindi: "Blow dry + brush karo",
    titleEn: "Blow drying & brushing",
    timeLabel: "10–25 min",
    primaryAction: "Low air, no/low heat, door se start karo. Airflow FACE SE DOOR. Section-by-section brush ke saath roots se ends tak dry karo.",
    details: [
      "Hot setting, bahut close distance ya face mein direct blast — skin burn aur panic ka risk",
      "Wet mats ko khinchna mat — dense double coat (Pom, Spitz, Husky) mein aur time do",
    ],
    doneChecks: [
      "Roots tak dry ho gayi",
      "Brush glide kar raha hai — koi snag nahi",
      "Skin overheated feel nahi ho rahi",
    ],
    nervousTip: "Dryer door se on karo, treats/praise use karo. Ear cover helpful. Dog door jaye to chase mat karo.",
  },

  // ── TRIM ─────────────────────────────────────────────────
  {
    id: "hygiene_cut",
    phase: "trim",
    titleHindi: "Hygiene haircut karo",
    titleEn: "Hygiene haircut",
    timeLabel: "5–12 min",
    primaryAction: "Teen zones — TEEN ALAG STEPS: Pehle paws (pad level tak), phir face (blunt scissors), phir sanitary area (narrow clipper).",
    details: [
      "Clean, dry coat par hi karo — bath ke baad poora dry hona zaroori",
      "Long sharp scissors aankhon ya sanitary skin ke paas KABHI nahi",
      "Matted fur ko scissors se mat kaato — pehle dematting karo",
      "Hot blade mat use karo — blade temperature check karo",
    ],
    doneChecks: [
      "Paw pads visible hain",
      "Aankh ke saamne baal clear hain",
      "Sanitary area clean — skin pink/burnt/nicked nahi",
    ],
    nervousTip: "Paws → face → sanitary teen alag mini-sessions mein karo. Unsafe movement ho to style simplify karo, force kabhi nahi.",
    imageSlot: "Hygiene zones — paw pad trim depth, face scissor angle, sanitary safe zone",
    flagOptions: ["Matting tight to skin", "Skin redness / irritation", "Accidental nick"],
    packages: ["signature", "pampering"],
  },
  {
    id: "full_body_styling",
    phase: "trim",
    titleHindi: "Full body styling karo",
    titleEn: "Full body styling",
    timeLabel: "15–35 min",
    primaryAction: "Reference photo pehle parent ke saath confirm karo — length, face shape, ears, tail. Phir neck → topline → sides → legs → tail.",
    details: [
      "Dono sides balance — front, side aur rear se check karo",
      "Blending soft ho, no harsh shelf lines",
      "Fidgety dog: 'safer simpler finish' choose karo — risky perfect styling mat karo",
    ],
    doneChecks: [
      "Parent ne reference photo approve ki",
      "Dono sides balanced hain",
      "Koi harsh shelf line nahi",
    ],
    nervousTip: "Face aur feet ko short sets mein karo. Fidgety ho to safer/simpler finish.",
    imageSlot: "Breed reference cuts — Golden (feather), Pom/Spitz (outline), Shih Tzu (teddy), Lab (de-shed)",
    packages: ["pampering"],
  },
  {
    id: "paw_butter",
    phase: "trim",
    titleHindi: "Paw butter lagao",
    titleEn: "Paw butter massage",
    timeLabel: "1–3 min",
    primaryAction: "Paws clean aur dry hone ke baad — pea-size paw butter lo, har pad par thin layer, thumb se circular motion mein massage.",
    details: [
      "Between pads mein itna mat bharo ki dog slip kare ya bahut lick kare",
      "Broken/bleeding pad mein rub NAHI",
    ],
    doneChecks: [
      "Pads moisturized — greasy layer nahi bani",
      "Dog khada ho sakta hai bina slipping ke",
    ],
    nervousTip: "Ek paw karo, reward do — between-pad work sabse last mein.",
  },
  {
    id: "serum",
    phase: "trim",
    titleHindi: "Coat serum lagao",
    titleEn: "Serum application",
    timeLabel: "1–2 min",
    primaryAction: "Pet-safe serum — 1–2 pumps palms mein rub karke mid-lengths aur ends par. Phir comb se evenly distribute karo.",
    details: [
      "Roots saturate NAHI, eyes/nose/mouth se door",
      "Overuse se greasy coat aur dust attraction",
    ],
    doneChecks: [
      "Coat shiny but airy — clumps nahi bane",
      "Haath pherne par oily film nahi",
    ],
    nervousTip: "Direct spray ki jagah haath ya brush par product lo — sudden spray sound avoid karo.",
  },
  {
    id: "final_comb",
    phase: "trim",
    titleHindi: "Final comb karo",
    titleEn: "Final combing & setting",
    timeLabel: "3–6 min",
    primaryAction: "Head-to-tail sequence — parting clear, face set, legs straight fall, feet round finish, tail selected style mein. Front, side, rear balance check.",
    details: [
      "Wet spots, hidden tangles ya uneven leg lines ignore mat karo",
    ],
    doneChecks: [
      "Comb snag nahi kar raha",
      "Symmetry clean, finish photo-ready",
    ],
    nervousTip: "Face combing short bursts mein. Head jerks aayein to hands off karke reset karo.",
  },
  {
    id: "nail_trim",
    phase: "trim",
    titleHindi: "Nails kaato aur file karo",
    titleEn: "Nail trim & filing",
    timeLabel: "5–10 min",
    primaryAction: "Light nail: quick se 2–3 mm door cut karo. Dark nail: tip se 1–2 mm ke CHHOTE slices lo. Phir file/grinder se smooth karo.",
    details: [
      "Paw ko stable support do — dull trimmer ya twisted hold mat use karo",
      "Quick nick ho jaye: styptic powder, cornstarch ya flour ready rakho",
      "Quick anxiety: ek-do nails karo, reward do — mostly front paws se start",
    ],
    doneChecks: [
      "Nails floor pe click nahi kar rahe",
      "Edges smooth hain",
    ],
    imageSlot: "Nail anatomy — light nail quick (pink zone), dark nail 1–2mm slice technique, filing angle",
    flagOptions: ["Quick nick — bleeding", "Dog panic — stopped early"],
  },
  {
    id: "ear_clean",
    phase: "trim",
    titleHindi: "Kaann saaf karo",
    titleEn: "Ear cleaning",
    timeLabel: "2–4 min",
    primaryAction: "Ear flap upar karo → cleaner canal mein daalo → base ~30 sec massage → cotton/gauze se outer canal wipe → dog ko shake karne do.",
    details: [
      "Alcohol, hydrogen peroxide ya Q-tip KABHI nahi",
      "Red, inflamed ya painful ear mein cleaning mat karo — vet referral suggest karo",
    ],
    doneChecks: [
      "Outer ear cleaner, smell kam",
      "Koi red flag sign nahi mila",
    ],
    imageSlot: "Ear anatomy — canal opening, base massage zone, outer flap wipe area",
    flagOptions: [
      "Black/yellow discharge",
      "Strong yeasty smell",
      "Redness / inflammation",
      "Pain on touch",
      "Heavy scratching / head shaking",
      "Mite-jaisa dark crust",
    ],
    nervousTip: "One ear at a time. Painful resistance: STOP karo, parent ko honest update do, vet referral suggest karo.",
  },
  {
    id: "perfume",
    phase: "trim",
    titleHindi: "Perfume lagao",
    titleEn: "Perfume application",
    timeLabel: "20–30 sec",
    primaryAction: "Pet-safe perfume — haath ya brush par spray karke back, sides, mid-body se tail tak halka apply karo.",
    details: [
      "Face, eyes, ears, nose, genitals ke paas KABHI nahi",
      "Human perfume ya strong scent avoid — dogs ke liye bahut sensitive hota hai",
      "Sensitive dog: perfume skip karna better hai",
    ],
    doneChecks: [
      "Scent mild — coat damp nahi",
      "Dog sneeze/cough/shake nahi kar raha",
    ],
  },
  {
    id: "final_check",
    phase: "trim",
    titleHindi: "Final 5-point check karo",
    titleEn: "Final head-to-tail check",
    timeLabel: "2–3 min",
    primaryAction: "Handover se PEHLE — front, side, tail-side aur floor-level se check karo. Sirf top view se mat dekho.",
    details: [
      "Under-tail, belly, collar area — missed wet spots, uneven legs, leftover debris pakad mein aate hain",
    ],
    doneChecks: [
      "Coat even, residue-free",
      "Nails short aur smooth",
      "Ears fresh, koi flag sign nahi",
      "Paws dry aur moisturized",
      "Overall presentable — koi hidden issue nahi",
    ],
    flagOptions: ["Redness found", "Nick / scratch", "Rash / skin issue", "Bad odor", "Limping"],
    imageSlot: "5-point check body map — coat/nails/ears/paws/cleanliness zones",
  },

  // ── WRAP-UP ───────────────────────────────────────────────
  {
    id: "pack_workstation",
    phase: "wrapup",
    titleHindi: "Jagah saaf karo",
    titleEn: "Workstation packing",
    timeLabel: "4–6 min",
    primaryAction: "Loose hair, nail bits, used wipes, wet towels — sab turant collect karo. Floor, sink, bathroom clean-dry chhodna All Tails standard hai.",
    details: [
      "Dirty tools bag mein seal NAHI — hair hatao, clean/disinfect/dry karo phir pack",
      "Sharp tools capped rakho jab pet nearby ho",
    ],
    doneChecks: [
      "Area guest-ready — koi hair ya puddle nahi",
      "Tools clean aur packed",
    ],
  },
  {
    id: "payment",
    phase: "wrapup",
    titleHindi: "Payment lo",
    titleEn: "Payment collection",
    timeLabel: "1–2 min",
    primaryAction: "Pehle pet dikhao: 'Ek quick look le lo — agar sab theek hai to payment QR dikha deta/deti hoon.'",
    details: [
      "Discount demand: defensive mat ho — package inclusions aur kaam calmly recap karo",
      "Parent upset: 'Kya kisi cheez mein concern lag raha hai?' — empathy pehle, attitude kabhi nahi",
    ],
    doneChecks: [
      "Amount clear, payment confirm mila",
      "Tone respectful raha",
    ],
  },
  {
    id: "google_review",
    phase: "wrapup",
    titleHindi: "Google review maango",
    titleEn: "Google review ask",
    timeLabel: "20–40 sec",
    primaryAction: "'Agar session pasand aaya ho — ek short Google review bahut help karega. Main QR dikha deta/deti hoon.'",
    details: [
      "Tabhi maango jab parent visibly happy ho aur payment ho chuka ho",
      "Parent bole 'baad mein' — smile karo, move on karo",
      "Review ke badle gift ya discount KABHI NAHI offer karo",
    ],
    doneChecks: [
      "Request pucha — pushy nahi laga",
    ],
  },
];

// Filter cards by service/package
export function getCardsForService(serviceName: string): PacerCard[] {
  const lower = serviceName.toLowerCase();
  const isPampering = lower.includes("pampering") || lower.includes("premium");
  const isSignature = isPampering || lower.includes("signature");

  return PACER_CARDS.filter((card) => {
    if (!card.packages) return true;
    if (isPampering && card.packages.includes("pampering")) return true;
    if (isSignature && card.packages.includes("signature")) return true;
    return false;
  });
}

// Build context from booking data
export function buildPacerContext(booking: {
  serviceName: string;
  customerName: string;
  pet: {
    name: string | null;
    breed: string;
    temperament: string | null;
    groomingNotes: string | null;
    stylingNotes: string | null;
  } | null;
}): PacerContext {
  const pet = booking.pet;
  return {
    petName: pet?.name ?? null,
    petBreed: pet?.breed ?? "Unknown",
    temperament: pet?.temperament ?? null,
    groomingNotes: pet?.groomingNotes ?? null,
    stylingNotes: pet?.stylingNotes ?? null,
    serviceName: booking.serviceName,
    customerName: booking.customerName,
    isNervous: isNervousPet(pet?.temperament),
  };
}
