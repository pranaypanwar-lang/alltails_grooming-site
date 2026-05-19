export type CoachingStep = {
  key: string;
  label: string;
  labelHindi: string;
  timeLabel: string;
  howTo: string;
  howToHindi: string;
  avoid?: string;
  avoidHindi?: string;
  doneSign: string;
  doneSignHindi: string;
  nervousNote?: string;
  nervousNoteHindi?: string;
  flagNote?: string;
  flagNoteHindi?: string;
};

export const COACHING_ARRIVE_SETUP: CoachingStep[] = [
  {
    key: "greeting_parent",
    label: "Greeting the parent",
    labelHindi: "पैरेंट से मिलना",
    timeLabel: "1–2 min",
    howTo:
      "Darwaze pe smile ke saath parent aur pet ka naam confirm karo. 20–30 sec mein package, rough flow, aur session ka plan clearly bolo. Bathroom, power point, drying spot, aur clean-up plan calmly confirm karo.",
    howToHindi:
      "दरवाजे पर smile के साथ parent और pet का नाम confirm करें। 20–30 sec में package, rough flow, और session का plan clearly बोलें। Bathroom, power point, drying spot, और clean-up plan calmly confirm करें।",
    avoid:
      "Rushed entry, vague promises, ya confused start — yeh trust ko weak karte hain.",
    avoidHindi:
      "जल्दबाजी में घुसना, अस्पष्ट वादे, या confused start — ये trust कमज़ोर करते हैं।",
    doneSign:
      "Parent relaxed ho, questions clear ho jayein, aur dog curious ya neutral rahe — hide, freeze, ya body stiff na kare.",
    doneSignHindi:
      "Parent relaxed हो, सवाल clear हो जाएं, और dog curious या neutral रहे — hide, freeze, या body stiff न करे।",
    nervousNote:
      "Agar dog nervous ho: seedha haath mat badhao, side body rakho, aankhon mein stare mat karo, pet ko sniff chance do, zarurat pade to parent ke paas hi intro lo.",
    nervousNoteHindi:
      "अगर dog nervous हो: सीधे हाथ मत बढ़ाएं, side body रखें, आंखों में stare मत करें, pet को sniff का मौका दें, ज़रूरत पड़े तो parent के पास ही intro लो।",
  },
  {
    key: "settling_pet",
    label: "Settling the pet",
    labelHindi: "पेट को शांत करना",
    timeLabel: "2–5 min",
    howTo:
      "Pet ko leash par ya safe area mein 1–3 min decompress karne do. Soft voice mein naam lo, side se baitho, aur treat toss ya light touch tabhi do jab dog khud ready lage.",
    howToHindi:
      "Pet को leash पर या safe area में 1–3 min decompress करने दो। Soft voice में नाम लो, side से बैठो, और treat तब दो जब dog खुद ready लगे।",
    avoid:
      "Tight pakadna, ek saath zyada logon ka touch, ya 'jaldi settle ho jao' pressure mat do. Over-handling se fear, anxiety, stress badhta hai.",
    avoidHindi:
      "Tight पकड़ना, एक साथ ज़्यादा लोगों का touch, या 'जल्दी settle हो जाओ' pressure मत दो। Over-handling से fear, anxiety, stress बढ़ता है।",
    doneSign:
      "Breathing normal ho, body loose ho, sniffing start ho, treats le, aur lip licking/yawning/tucked tail kam ho.",
    doneSignHindi:
      "Breathing normal हो, body loose हो, sniffing शुरू हो, treats ले, और lip licking/yawning/tucked tail कम हो।",
    nervousNote:
      "Agar dog freeze kare, peeche hate, ya hard resist kare: easy version par lao, nonslip towel do, parent ka calm support lo, phir restart karo.",
    nervousNoteHindi:
      "अगर dog freeze करे, पीछे हटे, या hard resist करे: easy version पर लाओ, nonslip towel दो, parent का calm support लो, फिर restart करो।",
  },
  {
    key: "workstation_setup",
    label: "Workstation setup & sanitisation",
    labelHindi: "वर्कस्टेशन सेटअप और सैनिटाइज़ेशन",
    timeLabel: "3–4 min",
    howTo:
      "Nonslip mat ya towel lagao, cords side karo, clean towels ready rakho, sirf current tools bahar nikalo. Reuse se pehle tools ko hair/debris se clean karo, phir label ke hisab se disinfect karo, contact time do, rinse/dry karo.",
    howToHindi:
      "Nonslip mat या towel लगाओ, cords side करो, clean towels ready रखो, सिर्फ current tools बाहर निकालो। Reuse से पहले tools को hair/debris से clean करो, फिर label के हिसाब से disinfect करो।",
    avoid:
      "Dirty surface par direct disinfect spray karke cleaning skip mat karo.",
    avoidHindi:
      "Dirty surface पर direct disinfect spray करके cleaning skip मत करो।",
    doneSign:
      "Floor dry ho, hair-free ho, pet-slip risk na ho, aur surfaces/tools visibly clean hon.",
    doneSignHindi:
      "Floor dry हो, hair-free हो, pet-slip का risk न हो, और surfaces/tools visibly clean हों।",
    nervousNote:
      "Nervous dog ke liye dryer, clipper, grinder jaise noisy tools abhi off rakho — quiet setup pehle, noise later.",
    nervousNoteHindi:
      "Nervous dog के लिए dryer, clipper, grinder जैसे noisy tools अभी off रखो — quiet setup पहले, noise बाद में।",
  },
  {
    key: "dress_check_selfie",
    label: "Dress check selfie",
    labelHindi: "ड्रेस चेक सेल्फी",
    timeLabel: "20–30 sec",
    howTo:
      "Session start se pehle quick selfie lo: clean uniform, tied hair, stable footwear, aur overall neat look — yeh SOP compliance aur accountability dono dikhata hai.",
    howToHindi:
      "Session start से पहले quick selfie लो: clean uniform, tied hair, stable footwear, और overall neat look — यह SOP compliance और accountability दोनों दिखाता है।",
    avoid:
      "Loose dupatta, latakti jewelry, slippery chappal, ya wet sleeves ke saath kaam start mat karo.",
    avoidHindi:
      "Loose dupatta, लटकती jewelry, slippery chappal, या wet sleeves के साथ काम शुरू मत करो।",
    doneSign:
      "Photo clear ho, groomer presentable lage, aur koi loose item pet ke reach mein na ho.",
    doneSignHindi:
      "Photo clear हो, groomer presentable लगे, और कोई loose item pet के reach में न हो।",
    nervousNote:
      "Agar dog highly excited ho, selfie doorway ya parent ke saath le lo — pet ko frame mein lana zaroori nahi, safety zaroori hai.",
    nervousNoteHindi:
      "अगर dog highly excited हो, selfie doorway या parent के साथ लो — pet को frame में लाना ज़रूरी नहीं, safety ज़रूरी है।",
  },
  {
    key: "pre_groom_video",
    label: "Pre-groom video",
    labelHindi: "प्री-ग्रूम वीडियो",
    timeLabel: "30–60 sec",
    howTo:
      "1 slow video banao: face, eyes, ears, coat, mats, paws, nails, tail area, aur visible skin issues. Start mein pet ka naam aur visible concerns verbally note kar do.",
    howToHindi:
      "1 slow video बनाओ: face, eyes, ears, coat, mats, paws, nails, tail area, और visible skin issues। Start में pet का नाम और visible concerns verbally note करो।",
    avoid:
      "Blur, dark, rushed video mat banao. Existing redness, cuts, limping, discharge, ya matting miss mat karo — warna later confusion hoga.",
    avoidHindi:
      "Blur, dark, rushed video मत बनाओ। Existing redness, cuts, limping, discharge, या matting miss मत करो — वरना बाद में confusion होगा।",
    doneSign:
      "Parent ko pre-existing condition clearly samajh aa jaye aur intake condition documented ho jaye.",
    doneSignHindi:
      "Parent को pre-existing condition clearly समझ आ जाए और intake condition documented हो जाए।",
    nervousNote:
      "Nervous dog ho to: no-flash, thoda distance, parent se steady support lo. Stress badhe to closeup baad mein lo.",
    nervousNoteHindi:
      "Nervous dog हो तो: no-flash, थोड़ा distance, parent से steady support लो। Stress बढ़े तो closeup बाद में लो।",
  },
  {
    key: "body_language_guide",
    label: "Body language quick guide — full session ref",
    labelHindi: "बॉडी लैंग्वेज गाइड — पूरे सेशन के लिए",
    timeLabel: "Reference — yaad rakho",
    howTo:
      "Lip licking, yawning, head turn, avoiding eye contact = early stress → speed slow karo, side body rakho, easier step se restart karo. | Whale eye, ears back, lowered body, tucked tail, paw lift = fear badh raha hai → space do, voice soft, treat toss karo. | Freezing ya body stiff = red flag → hands off, reposition, phir retry karo — freeze ko 'accha hai, still hai' samajhkar continue mat karo. | Panting, escape attempts, 3 sec se zyada struggle = stop-and-reassess → least restraint; same force dubara mat lagao.",
    howToHindi:
      "Lip licking, yawning, head turn = early stress → speed slow करो, side body रखो। | Whale eye, ears back, tucked tail, paw lift = डर बढ़ रहा है → space दो, voice soft रखो। | Freezing या body stiff = red flag → hands off, reposition। | Panting, escape attempts, 3 sec से ज़्यादा struggle = stop aur reassess → same force दोबारा मत लगाओ।",
    doneSign:
      "Phase shortcut: greeting mein sniff-space, bath mein short breaks, dryer mein distance + low noise, trimming mein micro-sessions, finish mein quick calm handling. Pet ka emotional comfort style perfection se zyada important hai.",
    doneSignHindi:
      "Phase shortcut: greeting में sniff-space, bath में short breaks, dryer में distance + low noise, trimming में micro-sessions, finish में quick calm handling। Pet का emotional comfort style perfection से ज़्यादा important है।",
  },
];

export const COACHING_OIL: CoachingStep[] = [
  {
    key: "oil_massage",
    label: "Oil massage",
    labelHindi: "ऑयल मसाज",
    timeLabel: "3–7 min + 3–5 min absorb",
    howTo:
      "Sirf pet-safe light oil ya dog coat-oil product use karo. Palms mein thoda lo aur neck se tail tak coat direction mein halka spread karo, phir shoulders, chest, thighs aur dry zones cover karo. Bath se pehle 3–5 min absorb time do.",
    howToHindi:
      "सिर्फ pet-safe light oil या dog coat-oil product use करो। Palms में थोड़ा लो और neck से tail तक coat direction में halka spread करो, फिर shoulders, chest, thighs और dry zones cover करो। Bath से पहले 3–5 min absorb time दो।",
    avoid:
      "Essential oil, strong fragrance, open wound par oil mat lagao. Itna product mat lagao ki coat chipak jaye — greasy residue aur excessive licking problem bana sakta hai.",
    avoidHindi:
      "Essential oil, strong fragrance, open wound पर oil मत लगाओ। इतना product मत लगाओ कि coat chipak जाए — greasy residue और excessive licking problem बना सकता है।",
    doneSign:
      "Coat lightly nourished lage, patchy greasy feel na ho, aur skin supple lage but soaked na ho.",
    doneSignHindi:
      "Coat lightly nourished लगे, patchy greasy feel न हो, और skin supple लगे but soaked न हो।",
    nervousNote:
      "Nervous dog ho to full-body massage ke bajaye zone-by-zone karo. Head aur paws last mein lo jab trust build ho jaye.",
    nervousNoteHindi:
      "Nervous dog हो तो full-body massage की जगह zone-by-zone करो। Head और paws last में लो जब trust build हो जाए।",
  },
];

const _shampoo: CoachingStep = {
  key: "shampoo_conditioner",
  label: "Shampoo and conditioner",
  labelHindi: "शैम्पू और कंडीशनर",
  timeLabel: "10–20 min",
  howTo:
    "Bath se pehle brush-out karo. Lukewarm water se skin tak bhigo. Shampoo ko label ke hisab se dilute karo. Lather ko coat growth direction mein kaam karo — long coat mein yahi tangle kam karta hai. Rinse aksar shampoo se lamba karo.",
  howToHindi:
    "Bath से पहले brush-out करो। Lukewarm water से skin तक भिगोओ। Shampoo को label के हिसाब से dilute करो। Lather को coat growth direction में काम करो। Rinse को अच्छी तरह करो।",
  avoid:
    "Matted coat ko bina pre-brush bhigona, human shampoo use karna, ya half rinse karna mat karo. Residue dryness, flaking, tangles aur irritation badhata hai.",
  avoidHindi:
    "Matted coat को बिना pre-brush भिगोना, human shampoo use करना, या half rinse करना मत करो। Residue dryness, flaking, tangles बढ़ाता है।",
  doneSign:
    "Pani clear nikle, armpits/under chest/under tail residue-free hon, coat fresh lage, aur skin par soap film na bache.",
  doneSignHindi:
    "पानी clear निकले, armpits/under chest/under tail residue-free हों, coat fresh लगे, और skin पर soap film न बचे।",
  nervousNote:
    "Face last mein washcloth se karo. Breaks do. Eyes/ears mein pani ya foam bilkul mat jane do.",
  nervousNoteHindi:
    "Face last में washcloth से करो। Breaks दो। Eyes/ears में पानी या foam बिल्कुल मत जाने दो।",
};

const _dental: CoachingStep = {
  key: "dental_hygiene",
  label: "Dental hygiene",
  labelHindi: "डेंटल हाइजीन",
  timeLabel: "1–3 min",
  howTo:
    "Pet ko comfortable posture mein rakho, lip lift karo, aur sirf outer tooth surfaces brush ya gauze-wipe karo. Pet toothpaste hi use karo — mouth force-open karne ki zarurat nahi.",
  howToHindi:
    "Pet को comfortable posture में रखो, lip lift करो, और सिर्फ outer tooth surfaces brush या gauze-wipe करो। Pet toothpaste ही use करो।",
  avoid:
    "Human toothpaste, metal tartar scraping, ya 'deep clean' promise mat karo. Anesthesia-free brushing sirf visible plaque help karti hai, gumline disease treat nahi karti.",
  avoidHindi:
    "Human toothpaste, metal tartar scraping, या 'deep clean' promise मत करो। Anesthesia-free brushing सिर्फ visible plaque help करती है।",
  doneSign:
    "Dog minimal stress mein rahe, outer teeth clean feel hon, gums bleed na karein, aur breath thodi fresher lage.",
  doneSignHindi:
    "Dog minimal stress में रहे, outer teeth clean feel हों, gums bleed न करें, और breath थोड़ी fresher लगे।",
  nervousNote:
    "Resistant dog: pehle finger/gauze se 2–4 front teeth se start karo, flavored pet toothpaste taste karvao, reward do, phir dheere sides par badho.",
  nervousNoteHindi:
    "Resistant dog: पहले finger/gauze से 2–4 front teeth से start करो, flavored pet toothpaste taste करवाओ, reward दो, फिर धीरे sides पर बढ़ो।",
};

const _towelDry: CoachingStep = {
  key: "towel_drying",
  label: "Towel drying",
  labelHindi: "तौलिए से सुखाना",
  timeLabel: "3–8 min",
  howTo:
    "Tub se nikalte hi nonslip surface par lao. Towel ko wrap karke pat-dry karo: press, blot, squeeze motion use karo, especially ears ke bahar, chest, belly, legs aur tail base par.",
  howToHindi:
    "Tub से निकलते ही nonslip surface पर लाओ। Towel wrap करके pat-dry करो: press, blot, squeeze motion use करो, especially ears के बाहर, chest, belly, legs और tail base पर।",
  avoid:
    "Zor se rub mat karo — isse tangles aur skin irritation ho sakti hai. Ear opening ke bahar halka dry karo, andar kuch push mat karo.",
  avoidHindi:
    "ज़ोर से rub मत करो — इससे tangles और skin irritation हो सकती है। Ear opening के बाहर halka dry करो, अंदर कुछ push मत करो।",
  doneSign:
    "Dripping band ho jaye, coat bas damp rahe, aur mats tighter na lagen.",
  doneSignHindi:
    "Dripping बंद हो जाए, coat बस damp रहे, और mats tighter न लगें।",
  nervousNote:
    "2–3 chote towels rotate karo, face pe towel force mat karo, stress signs aaye to wrap hold karke calm petting do.",
  nervousNoteHindi:
    "2–3 छोटे towels rotate करो, face पे towel force मत करो, stress signs आएं तो wrap hold करके calm petting दो।",
};

export const COACHING_BATH: CoachingStep[] = [_shampoo, _dental, _towelDry];

export const COACHING_BATH_ESSENTIAL: CoachingStep[] = [_shampoo, _towelDry];

const _blowDry: CoachingStep = {
  key: "blow_drying",
  label: "Blow drying and hair brushing",
  labelHindi: "ब्लो ड्राईइंग और हेयर ब्रशिंग",
  timeLabel: "10–25 min",
  howTo:
    "Dryer ko low air aur no/low heat par distance se start karo. Airflow ko face se door rakho. Section-by-section brush ke saath roots se ends tak dry karo.",
  howToHindi:
    "Dryer को low air और no/low heat पर distance से start करो। Airflow को face से दूर रखो। Section-by-section brush के साथ roots से ends तक dry करो।",
  avoid:
    "Hot setting, bahut close distance, face/ears mein direct blast, ya wet mats ko khinchna mat — skin burn, panic aur coat damage ka risk badhta hai.",
  avoidHindi:
    "Hot setting, बहुत close distance, face/ears में direct blast, या wet mats को खींचना मत — skin burn, panic और coat damage का risk बढ़ता है।",
  doneSign:
    "Roots tak dry ho, coat style ke hisab se fluffy ya smooth lage, brush glide kare, aur skin overheated na feel ho.",
  doneSignHindi:
    "Roots तक dry हो, coat style के हिसाब से fluffy या smooth लगे, brush glide करे, और skin overheated न feel हो।",
  nervousNote:
    "Dryer door se on karo, treats/praise use karo, ear cover helpful ho sakta hai, aur dog move away kare to chase mat karo.",
  nervousNoteHindi:
    "Dryer door से on करो, treats/praise use करो, ear cover helpful हो सकता है, और dog move away करे तो chase मत करो।",
};

const _fullBodyStyling: CoachingStep = {
  key: "full_body_styling",
  label: "Full body hair styling",
  labelHindi: "फुल बॉडी हेयर स्टाइलिंग",
  timeLabel: "15–35 min",
  howTo:
    "Reference photo ko pehle parent ke saath confirm karo: length, face shape, ears, tail, paw finish, aur 'cute vs practical' look. Phir neck, topline, sides, legs aur tail mein section-wise kaam karo.",
  howToHindi:
    "Reference photo को पहले parent के साथ confirm करो: length, face shape, ears, tail, paw finish। फिर neck, topline, sides, legs और tail में section-wise काम करो।",
  avoid:
    "Golden, Pomeranian, Indian Spitz aur Labrador mein body coat shave mat karo. Golden mein sirf feather tidy. Lab mein mostly de-shed plus paw/tail tidy. Shih Tzu aur Lhasa mein puppy/teddy finish okay hai par face khula aur balance clean rakho.",
  avoidHindi:
    "Golden, Pomeranian, Indian Spitz और Labrador में body coat shave मत करो। Golden में सिर्फ feather tidy। Shih Tzu और Lhasa में puppy/teddy finish okay है पर face खुला और balance clean रखो।",
  doneSign:
    "Dono sides balanced lagen, blending soft ho, no harsh shelf lines, aur silhouette breed coat logic ke saath match kare.",
  doneSignHindi:
    "दोनों sides balanced लगें, blending soft हो, no harsh shelf lines, और silhouette breed coat logic के साथ match करे।",
  nervousNote:
    "Face aur feet ko short sets mein karo. Pet fidgety ho to 'safer simpler finish' choose karo — risky perfect styling nahi.",
  nervousNoteHindi:
    "Face और feet को short sets में करो। Pet fidgety हो तो 'safer simpler finish' choose करो — risky perfect styling नहीं।",
};

const _hygieneCut: CoachingStep = {
  key: "hygiene_haircut",
  label: "Hygiene haircut",
  labelHindi: "हाइजीन हेयरकट",
  timeLabel: "5–12 min",
  howTo:
    "Sanitary trim hamesha clean, dry coat par karo. Paws ke beech hair pad level tak trim karo, face ke around blunt scissors se tidy karo, genitals/under-tail area ko small narrow clipper se safe neat karo.",
  howToHindi:
    "Sanitary trim हमेशा clean, dry coat पर करो। Paws के बीच hair pad level तक trim करो, face के around blunt scissors से tidy करो, genitals/under-tail को small narrow clipper से safe neat करो।",
  avoid:
    "Long sharp scissors ko eyes ya sanitary skin ke paas mat le jao. Matted fur ko scissors se mat kaato. Hot blade use mat karo — yahi common cut zones hain.",
  avoidHindi:
    "Long sharp scissors को eyes या sanitary skin के पास मत ले जाओ। Matted fur को scissors से मत काटो। Hot blade use मत करो।",
  doneSign:
    "Paw pads visible hon, eyes ke saamne hair clear ho, sanitary area clean lage but skin pink, razor-burnt, ya nicked na ho.",
  doneSignHindi:
    "Paw pads visible हों, eyes के सामने hair clear हो, sanitary area clean लगे but skin pink, razor-burnt, या nicked न हो।",
  nervousNote:
    "Paws, face, sanitary — teen separate mini-steps mein karo. Unsafe movement ho to style simplify karo, force mat karo.",
  nervousNoteHindi:
    "Paws, face, sanitary — तीन separate mini-steps में करो। Unsafe movement हो तो style simplify करो, force मत करो।",
};

const _pawButter: CoachingStep = {
  key: "paw_butter",
  label: "Paw butter massage",
  labelHindi: "पॉ बटर मसाज",
  timeLabel: "1–3 min",
  howTo:
    "Paws clean aur dry hone ke baad pea-size paw butter lo. Har pad par thin layer lagao. Thumb se circular motion mein pad center aur edges par short massage do.",
  howToHindi:
    "Paws clean और dry होने के बाद pea-size paw butter लो। हर pad पर thin layer लगाओ। Thumb से circular motion में pad center और edges पर short massage दो।",
  avoid:
    "Product ko chipka ke mat lagao. Broken/bleeding pad mein rub mat karo. Between pads itna mat bharo ki dog slip kare ya bahut lick kare.",
  avoidHindi:
    "Product को chipka के मत लगाओ। Broken/bleeding pad में rub मत करो। Between pads इतना मत भरो कि dog slip करे।",
  doneSign:
    "Pads moisturized lagen, greasy layer na bane, aur dog ko khade hone par slipping feel na ho.",
  doneSignHindi:
    "Pads moisturized लगें, greasy layer न बने, और dog को खड़े होने पर slipping feel न हो।",
  nervousNote:
    "Sensitive dog: ek paw karke reward do. Between-pad work sabse last mein karo.",
  nervousNoteHindi:
    "Sensitive dog: एक paw करके reward दो। Between-pad work सबसे last में करो।",
};

const _serum: CoachingStep = {
  key: "serum_coat",
  label: "Serum application on coat",
  labelHindi: "कोट पर सीरम लगाना",
  timeLabel: "1–2 min",
  howTo:
    "Sirf pet-safe serum ya leave-in coat product use karo. 1–2 pumps palms mein rub karke mid-lengths aur ends par halka spread karo. Phir comb se evenly distribute karo.",
  howToHindi:
    "सिर्फ pet-safe serum या leave-in coat product use करो। 1–2 pumps palms में rub करके mid-lengths और ends पर halka spread करो। फिर comb से evenly distribute करो।",
  avoid:
    "Roots saturate mat karo. Eyes/nose/mouth se door rakho. Overuse se greasy coat aur dust attraction ho sakti hai.",
  avoidHindi:
    "Roots saturate मत करो। Eyes/nose/mouth से दूर रखो। Overuse से greasy coat और dust attraction हो सकती है।",
  doneSign:
    "Coat shiny but airy lage, clumps na bane, aur haath pherne par oily film na aaye.",
  doneSignHindi:
    "Coat shiny but airy लगे, clumps न बनें, और हाथ फेरने पर oily film न आए।",
  nervousNote:
    "Direct spray ke bajaye haath ya brush par product lo. Sudden spray sound avoid karo.",
  nervousNoteHindi:
    "Direct spray की जगह हाथ या brush पर product लो। Sudden spray sound avoid करो।",
};

const _finalCombing: CoachingStep = {
  key: "final_combing",
  label: "Final combing and hair setting",
  labelHindi: "फाइनल कॉम्बिंग और हेयर सेटिंग",
  timeLabel: "3–6 min",
  howTo:
    "Final comb ko head-to-tail sequence mein karo. Parting clear rakho, face hair set karo, legs ko straight fall do, feet ko round finish do, aur tail ko selected style ke hisab se place karo.",
  howToHindi:
    "Final comb को head-to-tail sequence में करो। Parting clear रखो, face hair set करो, legs को straight fall दो, feet को round finish दो।",
  avoid:
    "Wet spots, hidden tangles, ya uneven leg lines ignore mat karo. Final pass mein front, side, aur rear balance check karo.",
  avoidHindi:
    "Wet spots, hidden tangles, या uneven leg lines ignore मत करो। Final pass में front, side, और rear balance check करो।",
  doneSign:
    "Comb snag na kare, coat even fall kare, symmetry clean ho, aur finish photo-ready lage.",
  doneSignHindi:
    "Comb snag न करे, coat even fall करे, symmetry clean हो, और finish photo-ready लगे।",
  nervousNote:
    "Face combing short bursts mein karo. Head jerks aayein to hands off karke reset karo.",
  nervousNoteHindi:
    "Face combing short bursts में करो। Head jerks आएं तो hands off करके reset करो।",
};

export const COACHING_COMPLETE_DRY_STYLE: CoachingStep[] = [
  _blowDry,
  _fullBodyStyling,
  _hygieneCut,
  _pawButter,
  _serum,
  _finalCombing,
];

// Used for the separate Haircut & Styling phase in Complete (blow dry is its own phase before this)
export const COACHING_COMPLETE_HAIRCUT_STYLE: CoachingStep[] = [
  _hygieneCut,
  _fullBodyStyling,
  _pawButter,
  _serum,
  _finalCombing,
];

export const COACHING_SIGNATURE_DRY: CoachingStep[] = [_blowDry];

export const COACHING_SIGNATURE_HYGIENE_CUT: CoachingStep[] = [
  _hygieneCut,
  _finalCombing,
];

export const COACHING_ESSENTIAL_DRY: CoachingStep[] = [
  _blowDry,
  _finalCombing,
];

export const COACHING_FINISH: CoachingStep[] = [
  {
    key: "nail_trim",
    label: "Nail trim and filing",
    labelHindi: "नेल ट्रिम और फाइलिंग",
    timeLabel: "5–10 min",
    howTo:
      "Paw ko stable support do. Light nail mein quick se 2–3 mm door cut karo, dark nail mein sirf tip se 1–2 mm ke small slices lo, phir file/grinder se edge smooth karo.",
    howToHindi:
      "Paw को stable support दो। Light nail में quick से 2–3 mm दूर cut करो, dark nail में सिर्फ tip से 1–2 mm के small slices लो, फिर file/grinder से edge smooth करो।",
    avoid:
      "Ek bada deep cut, dull trimmer, ya twisted paw hold mat use karo. Quick nick ho jaye to styptic powder, cornstarch, ya flour ready rakho.",
    avoidHindi:
      "एक बड़ा deep cut, dull trimmer, या twisted paw hold मत use करो। Quick nick हो जाए तो styptic powder, cornstarch, या flour ready रखो।",
    doneSign:
      "Nails floor pe click na karein, edge smooth ho, aur dog normal weight bear kare.",
    doneSignHindi:
      "Nails floor पे click न करें, edge smooth हो, और dog normal weight bear करे।",
    nervousNote:
      "Quick anxiety: ek-do nails karke reward do, mostly front paws se start karo. Panic ho to stop karke parent ko honest update do.",
    nervousNoteHindi:
      "Quick anxiety: एक-दो nails करके reward दो, mostly front paws से start करो। Panic हो तो stop करके parent को honest update दो।",
  },
  {
    key: "ear_cleaning",
    label: "Ear cleaning",
    labelHindi: "कान की सफाई",
    timeLabel: "2–4 min",
    howTo:
      "Ear flap ko gently upar karo, quality ear cleaner canal mein daalo, base ko around 30 sec massage karo, phir cotton/gauze se outer canal aur flap wipe karo. Dog ko head shake karne do.",
    howToHindi:
      "Ear flap को gently ऊपर करो, quality ear cleaner canal में डालो, base को 30 sec massage करो, फिर cotton/gauze से outer canal और flap wipe करो। Dog को head shake करने दो।",
    avoid:
      "Alcohol, hydrogen peroxide, ya Q-tip mat use karo. Red, inflamed, painful ear ya suspected ruptured eardrum mein cleaning mat karo.",
    avoidHindi:
      "Alcohol, hydrogen peroxide, या Q-tip मत use करो। Red, inflamed, painful ear या suspected ruptured eardrum में cleaning मत करो।",
    doneSign:
      "Outer ear cleaner lage, smell kam ho, excess debris nikal jaye.",
    doneSignHindi:
      "Outer ear cleaner लगे, smell कम हो, excess debris निकल जाए।",
    nervousNote:
      "One ear at a time karo, treats ready rakho. Painful resistance mein step stop karke vet referral suggest karo.",
    nervousNoteHindi:
      "One ear at a time करो, treats ready रखो। Painful resistance में step stop करके vet referral suggest करो।",
    flagNote:
      "Parent ko flag karo agar: black/yellow discharge, strong yeasty odor, redness, pain, heavy scratching, head shaking, ya mite-jaisa dark crust ho.",
    flagNoteHindi:
      "Parent को flag करो अगर: black/yellow discharge, strong yeasty odor, redness, pain, heavy scratching, head shaking, या mite-jaisa dark crust हो।",
  },
  {
    key: "perfume",
    label: "Perfume application",
    labelHindi: "परफ्यूम लगाना",
    timeLabel: "20–30 sec",
    howTo:
      "Sirf pet-safe perfume/deodorizing spray use karo. Haath ya brush par spray karke back, sides, mid-body se tail tak halka apply karo.",
    howToHindi:
      "सिर्फ pet-safe perfume/deodorizing spray use करो। हाथ या brush पर spray करके back, sides, mid-body से tail तक halka apply करो।",
    avoid:
      "Face, eyes, ears, nose, mouth, aur genitals ke paas kabhi mat lagao. Human perfume ya strong non-vet scent avoid karo.",
    avoidHindi:
      "Face, eyes, ears, nose, mouth, और genitals के पास कभी मत लगाओ। Human perfume या strong non-vet scent avoid करो।",
    doneSign:
      "Scent mild ho, coat damp na ho, aur dog sneeze, cough, irritation, ya head shake na kare.",
    doneSignHindi:
      "Scent mild हो, coat damp न हो, और dog sneeze, cough, irritation, या head shake न करे।",
    nervousNote:
      "Sensitive dog ho to perfume skip karna better hai — fragrance kabhi comfort ya safety se upar nahi.",
    nervousNoteHindi:
      "Sensitive dog हो तो perfume skip करना better है — fragrance कभी comfort या safety से ऊपर नहीं।",
  },
  {
    key: "final_check",
    label: "Final head-to-tail check",
    labelHindi: "फाइनल हेड-टू-टेल चेक",
    timeLabel: "2–3 min",
    howTo:
      "Handover se pehle 5-point check karo: coat, nails, ears, paws, overall cleanliness. Face, under-tail, belly, paw pads aur collar area bhi dekhna mat bhoolo. Front, side, tail-side aur floor-level se bhi check karo.",
    howToHindi:
      "Handover से पहले 5-point check करो: coat, nails, ears, paws, overall cleanliness। Face, under-tail, belly, paw pads और collar area भी देखना मत भूलो। Front, side, tail-side और floor-level से भी check करो।",
    avoid:
      "Sirf top view par rely mat karo — missed wet spots, uneven legs, ya leftover debris pakad mein nahi aate.",
    avoidHindi:
      "सिर्फ top view पर rely मत करो — missed wet spots, uneven legs, या leftover debris पकड़ में नहीं आते।",
    doneSign:
      "Coat even aur residue-free ho, nails short/smooth ho, ears fresh ho, paws dry/moisturized ho, aur dog comfortable presentable lage.",
    doneSignHindi:
      "Coat even और residue-free हो, nails short/smooth हो, ears fresh हो, paws dry/moisturized हो, और dog comfortable presentable लगे।",
    flagNote:
      "Final check mein redness, nick, rash, limp, bad odor, ya hidden mat mile to parent ko turant honest update do — hide mat karo.",
    flagNoteHindi:
      "Final check में redness, nick, rash, limp, bad odor, या hidden mat मिले तो parent को तुरंत honest update दो — hide मत करो।",
  },
];

export const COACHING_PAYMENT: CoachingStep[] = [
  {
    key: "workstation_packing",
    label: "Workstation packing",
    labelHindi: "वर्कस्टेशन पैकिंग",
    timeLabel: "4–6 min",
    howTo:
      "Loose hair, nail bits, used wipes, aur wet towels turant collect karo. Floor, sink, bathroom aur grooming spot ko clean-dry chhodna All Tails standard hai. Tools ko clean/disinfect/dry karo phir pack karo.",
    howToHindi:
      "Loose hair, nail bits, used wipes, और wet towels तुरंत collect करो। Floor, sink, bathroom और grooming spot को clean-dry छोड़ना All Tails standard है। Tools को clean/disinfect/dry करो फिर pack करो।",
    avoid:
      "Dirty tools ko bina clean kiye bag mein seal mat karo.",
    avoidHindi:
      "Dirty tools को बिना clean किए bag में seal मत करो।",
    doneSign:
      "Area guest-ready lage, visible hair ya puddle na ho, aur parent ko extra clean-up na karna pade.",
    doneSignHindi:
      "Area guest-ready लगे, visible hair या puddle न हो, और parent को extra clean-up न करना पड़े।",
    nervousNote:
      "Pet nearby ho to sharp tools capped rakho aur cords/tanks calmly remove karo.",
    nervousNoteHindi:
      "Pet nearby हो तो sharp tools capped रखो और cords/tanks calmly remove करो।",
  },
  {
    key: "payment_collection",
    label: "Payment collection",
    labelHindi: "पेमेंट कलेक्शन",
    timeLabel: "1–2 min",
    howTo:
      "Pehle final pet dikhake bolo: 'Aap ek quick look le lo; agar sab theek hai to main payment QR dikha deta/deti hoon.' Amount, mode, aur payment confirm karo.",
    howToHindi:
      "पहले final pet दिखाकर बोलो: 'आप एक quick look ले लो; अगर सब ठीक है तो main payment QR दिखा देता/देती हूं।' Amount, mode, और payment confirm करो।",
    avoid:
      "Discount demand par turant defensive ya bargaining mode mein mat jao. Calmly package inclusions aur delivered service recap karo — sirf approved discount policy follow karo.",
    avoidHindi:
      "Discount demand पर तुरंत defensive या bargaining mode में मत जाओ। Calmly package inclusions और delivered service recap करो।",
    doneSign:
      "Amount clear ho, payment confirmation mil jaye, aur tone respectful rahe.",
    doneSignHindi:
      "Amount clear हो, payment confirmation मिल जाए, और tone respectful रहे।",
    nervousNote:
      "Agar parent upset lage, pehle pucho: 'Kya kisi particular cheez mein concern lag raha hai?' — facts ke saath empathy rakho, blame ya attitude mat lao.",
    nervousNoteHindi:
      "अगर parent upset लगे, पहले पूछो: 'क्या किसी particular चीज़ में concern लग रहा है?' — facts के साथ empathy रखो, blame या attitude मत लाओ।",
  },
  {
    key: "google_review",
    label: "Google review request",
    labelHindi: "गूगल रिव्यू रिक्वेस्ट",
    timeLabel: "20–40 sec",
    howTo:
      "Review tabhi maango jab pet handover ho chuka ho, parent visibly happy ho, aur payment close ho gaya ho. Script: 'Agar aapko aaj ka session pasand aaya ho, ek short Google review bahut help karega. Main QR dikha deta/deti hoon.'",
    howToHindi:
      "Review तभी मांगो जब pet handover हो चुका हो, parent visibly happy हो, और payment close हो गया हो। Script: 'अगर आपको आज का session पसंद आया हो, एक short Google review बहुत help करेगा।'",
    avoid:
      "Review ke badle gift ya discount offer mat karo. Agar parent bole 'baad mein', to smile karke move on karo.",
    avoidHindi:
      "Review के बदले gift या discount offer मत करो। अगर parent बोले 'बाद में', तो smile करके move on करो।",
    doneSign:
      "Request pushy na lage, QR/direct link se easy path mile, aur parent ko samajh aaye ki positive reviews new customers ke liye helpful testimonial bante hain.",
    doneSignHindi:
      "Request pushy न लगे, QR/direct link से easy path मिले, और parent को समझ आए कि positive reviews new customers के लिए helpful testimonial बनते हैं।",
  },
];
