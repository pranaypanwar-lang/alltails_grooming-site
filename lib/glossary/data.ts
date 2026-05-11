/**
 * Pet grooming glossary — short, definitional entries built for AI engine
 * citation and "what is X" queries.
 *
 * Each entry follows the same pattern that gets cited heavily by ChatGPT,
 * Claude, Perplexity and Google AI Overviews:
 *   - One-sentence definition first (the citation-ready answer)
 *   - 2-3 paragraphs of supporting context with concrete specifics
 *   - Optional Notes block with edge cases
 *
 * Aim for 200-350 words per entry. Shorter = too thin, longer dilutes the
 * direct-answer ranking. Keep the language plain English; AI engines
 * preferentially cite content that reads like a Wikipedia entry, not
 * marketing copy.
 */

export type GlossaryEntry = {
  /** URL slug, lowercase, kebab-case. */
  slug: string;
  /** Display term, title-case. */
  term: string;
  /** One-sentence definition — the lead line AI engines lift verbatim. */
  shortAnswer: string;
  /** Searchable alternative phrasings. Helps long-tail queries. */
  alternateTerms?: string[];
  /** Concrete paragraphs of supporting context. */
  details: string[];
  /** Optional caveats / edge cases. */
  notes?: string[];
  /** Related glossary slugs for internal linking. */
  related?: string[];
};

export const GLOSSARY_ENTRIES: Record<string, GlossaryEntry> = {
  "dog-grooming": {
    slug: "dog-grooming",
    term: "Dog Grooming",
    shortAnswer:
      "Dog grooming is the routine maintenance of a dog's coat, skin, nails, ears and teeth — typically involving bath, brushing, nail trimming, ear cleaning and (depending on the dog's breed) a haircut.",
    alternateTerms: ["dog bathing", "canine grooming", "dog spa"],
    details: [
      "A standard dog grooming session covers cleansing (bath with a pet-safe shampoo and conditioner), drying (towel and blow-dry), de-tangling (brushing out the coat), nail trim and file, ear cleaning and inspection, and either a hygiene haircut (face, paws, sanitary area) or a full body haircut depending on coat type and the owner's preference. Dental hygiene and paw butter for cracked pads are common add-ons.",
      "Grooming frequency depends on breed and coat. Short-coated dogs (Beagles, Pugs, Indies with smooth coats) may only need monthly maintenance, while long-coated breeds (Shih Tzu, Lhasa Apso, Pomeranian) often benefit from grooming every 3–4 weeks to prevent matting. Double-coated breeds (Golden Retrievers, Huskies) need de-shedding sessions during shedding seasons.",
      "At-home dog grooming has gained popularity in Indian cities because it removes the stress of the salon environment — no car ride, no kennel wait, no separation from the owner. The same tools (clippers, blow dryers, premium shampoos) travel to the home with a trained groomer.",
    ],
    notes: [
      "Skin-condition dogs (allergies, hot spots, sensitive skin) should ideally use vegan, sulfate-free, paraben-free shampoos. Harsh detergents can worsen irritation.",
    ],
    related: ["cat-grooming", "hygiene-haircut", "de-shedding", "doorstep-pet-grooming"],
  },

  "cat-grooming": {
    slug: "cat-grooming",
    term: "Cat Grooming",
    shortAnswer:
      "Cat grooming is the assisted maintenance of a cat's coat, claws and ears — focused on de-matting, nail trimming and bathing when the cat's self-grooming isn't enough or for medical reasons.",
    alternateTerms: ["cat bathing", "feline grooming", "cat spa"],
    details: [
      "Cats are largely self-grooming, but long-haired breeds (Persian, Maine Coon, Ragdoll) develop mats that they can't manage alone, and senior or obese cats often need help reaching their hindquarters and tail base. Cat grooming sessions typically include de-matting, careful brushing, nail trim, ear cleaning and a bath if the coat is oily or matted.",
      "Stress is the dominant factor in cat grooming. Cats associate confinement, water and strange smells with threat. At-home grooming reduces that stress significantly — the cat stays in their familiar environment, and a trained handler uses techniques like wrap-towel restraint and slow approach. Sessions are usually shorter than dog grooming (45–75 minutes) and prioritise the cat's comfort over a perfect cut.",
      "Some cats simply cannot tolerate grooming under any circumstance. In those cases, sedation grooming under a vet's supervision is the safe alternative for serious matting.",
    ],
    notes: [
      "Cat-safe shampoos must be free of essential oils — tea tree, eucalyptus and several others are toxic to cats. Always verify product safety before use.",
    ],
    related: ["dog-grooming", "doorstep-pet-grooming"],
  },

  "hygiene-haircut": {
    slug: "hygiene-haircut",
    term: "Hygiene Haircut",
    shortAnswer:
      "A hygiene haircut is a partial-coat trim focused on three areas — face/eyes, paws, and the sanitary/genital area — to improve cleanliness and comfort without a full body cut.",
    details: [
      "Unlike a full body haircut (which restyles the entire coat), a hygiene haircut targets only the areas where overgrown hair causes day-to-day problems: hair around the eyes that catches tear staining and debris, hair between paw pads that mats and traps dirt, and hair around the sanitary/genital area that interferes with normal toileting.",
      "Hygiene haircuts are usually included in mid-tier grooming packages (such as All Tails' Signature Care at ₹1,299) and take an extra 20–30 minutes on top of the bath. They suit dogs whose owners want a clean, well-kept look without committing to a full styling cut — especially during summer or monsoon when full coats trap heat or moisture.",
      "For long-coated breeds (Shih Tzu, Lhasa Apso, Maltese), a regular hygiene haircut every 3–4 weeks combined with one full body cut every 8–10 weeks tends to be the most maintainable rhythm.",
    ],
    related: ["dog-grooming", "dental-hygiene-for-pets"],
  },

  "dental-hygiene-for-pets": {
    slug: "dental-hygiene-for-pets",
    term: "Dental Hygiene for Pets",
    shortAnswer:
      "Pet dental hygiene is the routine cleaning of a dog's or cat's teeth and gums to prevent plaque buildup, tartar, gum disease and the bad breath that signals oral infection.",
    alternateTerms: ["pet teeth brushing", "dog dental care"],
    details: [
      "By age three, the majority of dogs and cats show some form of dental disease — gingivitis, tartar, or periodontitis. Left untreated, oral bacteria enter the bloodstream and contribute to heart, kidney and liver problems. The simplest preventive step is regular tooth brushing with a pet-safe toothpaste (never human toothpaste — xylitol and fluoride are toxic to pets).",
      "In a grooming context, dental hygiene typically means a gentle tooth brushing with a pet-formulated toothpaste plus an oral spray application that helps with breath and surface plaque. It is not a substitute for a deep-clean dental scaling, which is done by a veterinarian under anaesthesia.",
      "All Tails includes pet dental hygiene in Signature Care and Complete Pampering packages. Owners who want daily upkeep can add a vet-recommended chew or dental water additive between visits.",
    ],
    notes: [
      "Persistent bad breath, drooling, or reluctance to chew are signs of dental disease that need a vet — grooming dental care is preventive, not a fix for existing problems.",
    ],
    related: ["dog-grooming", "cat-grooming"],
  },

  "anti-tick-bath": {
    slug: "anti-tick-bath",
    term: "Anti-Tick Bath",
    shortAnswer:
      "An anti-tick bath is a medicated bath using a tick-and-flea shampoo that helps remove and repel ticks and fleas from a dog's coat, usually as a one-time treatment or part of a tick-prevention routine.",
    alternateTerms: ["tick bath", "flea bath", "medicated tick wash"],
    details: [
      "Anti-tick baths use shampoos containing pesticide-grade active ingredients (commonly fipronil, permethrin, or a botanical equivalent) that kill ticks and fleas on contact and help loosen attached parasites. The bath is followed by a thorough comb-through to remove dead and dislodged ticks. The session typically lasts 45–60 minutes and is suited for dogs with visible tick infestation or as a seasonal prevention during monsoon.",
      "Anti-tick baths are not a substitute for an ongoing tick-control programme. Vet-prescribed spot-on treatments (Frontline, Bravecto), oral medications (NexGard), or tick collars usually need to follow the bath for sustained protection. The bath kills present ticks; the prevention regimen stops new ones.",
      "For cats, anti-tick baths require cat-specific products — many tick treatments designed for dogs (especially those containing permethrin) are highly toxic to cats. Never use a dog tick shampoo on a cat.",
    ],
    notes: [
      "Indian monsoon (June–September) is peak tick season in most regions. Combining an anti-tick bath at the start of monsoon with monthly preventive treatment dramatically reduces infestation risk.",
    ],
    related: ["dog-grooming"],
  },

  "de-shedding": {
    slug: "de-shedding",
    term: "De-shedding",
    shortAnswer:
      "De-shedding is a grooming technique that uses specialised tools to remove loose undercoat hair from double-coated breeds, dramatically reducing shedding around the home during shedding seasons.",
    alternateTerms: ["undercoat removal", "shedding control"],
    details: [
      "Double-coated breeds — Golden Retrievers, Labradors, Huskies, German Shepherds, Pomeranians — have two coat layers: a coarse outer coat and a softer undercoat. The undercoat sheds heavily twice a year (spring and autumn), and without management, the loose hair coats furniture, clothes and floors. De-shedding sessions use rake-style tools (FURminator, undercoat rake) and a forced-air dryer to lift and pull out the dead undercoat hair without damaging the outer coat.",
      "A full de-shedding session can pull out a surprising volume of hair — often more than a regular brushing produces in a month. Done at the right time (early in the shedding cycle), one or two sessions can cut visible shedding around the home by 60–80% for several weeks.",
      "De-shedding is not for single-coated breeds like Poodles, Shih Tzus or Maltese. Those breeds don't shed in the same way and don't have an undercoat to remove. Using de-shedding tools on them can damage their topcoat.",
    ],
    notes: [
      "De-shedding doesn't stop shedding entirely — it removes hair that would have fallen out anyway, just on your floor instead of in the tool. Genetics decide how much a dog sheds; grooming decides when and where.",
    ],
    related: ["dog-grooming", "coat-care-plan"],
  },

  "paw-butter": {
    slug: "paw-butter",
    term: "Paw Butter",
    shortAnswer:
      "Paw butter is a moisturising balm applied to a dog's paw pads to soothe dryness, prevent cracking and protect against rough surfaces like hot pavement or cold tile.",
    alternateTerms: ["paw balm", "paw wax"],
    details: [
      "Paw pads are tough but not invincible. Hot summer pavement, rough monsoon surfaces, cold winter floors and constant indoor abrasion can leave them dry, cracked or peeling. Paw butter is a leave-on balm — usually a beeswax, coconut oil and shea butter blend — that creates a protective layer while moisturising the pad. A small amount is massaged into each pad after grooming.",
      "In a grooming session, paw butter is most often included in premium packages (All Tails' Complete Pampering at ₹1,799 includes it). The groomer trims excess hair between the pads first, cleans them, then applies the balm. Many owners reapply between visits during dry seasons.",
      "Paw butter is non-toxic and pet-safe if licked, which dogs usually do. That's intentional — the balm needs to be edible-safe because dogs are dogs. Anything you'd be uncomfortable putting on a baby's lips probably doesn't belong on a dog's paws either.",
    ],
    related: ["dog-grooming", "dental-hygiene-for-pets"],
  },

  "doorstep-pet-grooming": {
    slug: "doorstep-pet-grooming",
    term: "Doorstep Pet Grooming",
    shortAnswer:
      "Doorstep pet grooming is a service model where a trained groomer visits the customer's home with all required tools and products to groom the pet in their familiar environment, replacing the traditional salon visit.",
    alternateTerms: ["at-home pet grooming", "in-home grooming", "mobile pet grooming"],
    details: [
      "In a doorstep grooming model, the groomer arrives at the customer's home with portable equipment — clippers, blow dryer, brushes, scissors — and a kit of shampoos and conditioners. Sessions are conducted in the customer's bathroom or balcony, typically on a non-slip mat. The customer can supervise, leave the room, or watch from nearby, depending on what calms the pet.",
      "Doorstep grooming has grown in Indian metros because it removes three frictions of salon visits: the car ride (stressful for many dogs, often impossible for cats), the kennel wait (where pets are confined among strangers), and the time commitment (drop-off and pickup logistics for working pet parents).",
      "It's particularly suited to anxious pets, senior pets, first-time groomings, multi-pet households, and pets with reactive behaviour at salons. Cost-wise it tends to match or undercut equivalent salon services because the operator doesn't pay rent on a physical salon space.",
    ],
    notes: [
      "Not every grooming need can be served at home. Severe matting that requires sedation, full medicated dips, or extensive hydro-bath work usually still needs a vet clinic or specialised facility.",
    ],
    related: ["dog-grooming", "cat-grooming", "pet-grooming-vs-salon"],
  },

  "pet-grooming-vs-salon": {
    slug: "pet-grooming-vs-salon",
    term: "Pet Grooming vs Salon",
    shortAnswer:
      "Choosing between a pet grooming salon and an at-home grooming service comes down to your pet's temperament, your time, and what kind of grooming the pet actually needs.",
    details: [
      "Salons make sense when: the pet enjoys (or at least tolerates) the salon environment, the grooming needed is straightforward (bath, basic trim), you can drop off and pick up easily, and you want a quick same-day turnaround. Salons benefit from heavy hydro-bath equipment and a structured pipeline that's efficient for high-volume basic grooming.",
      "At-home grooming is better when: the pet is anxious, reactive, senior, very young, or has medical reasons to avoid stress; you don't have time for drop-off/pickup; you want one-on-one attention from the groomer; or you're booking for multiple pets in the same household. The trade-off is slightly less specialised equipment, though for everyday grooming this rarely matters.",
      "Price tends to be comparable between the two for equivalent services. At-home models save on salon rent and pass that to the customer; salons save on travel time and pass that to the customer. Net-net, the same haircut costs roughly the same either way.",
    ],
    related: ["doorstep-pet-grooming", "dog-grooming", "cat-grooming"],
  },

  "coat-care-plan": {
    slug: "coat-care-plan",
    term: "Coat Care Plan",
    shortAnswer:
      "A coat care plan is a multi-session grooming subscription that covers a fixed number of grooming visits over a longer period at a discounted per-session cost, designed for owners who groom regularly.",
    alternateTerms: ["grooming subscription", "grooming package plan"],
    details: [
      "Coat care plans bundle 3, 6 or 12 grooming sessions to be used over 3–12 months. They suit pet parents who already groom on a regular cycle and want predictable scheduling plus a discount over per-visit pricing. All Tails offers Starter Plan (3 sessions, ₹3,799), Care Plan (6 sessions, ₹6,999) and Wellness Plan (12 sessions, ₹14,999).",
      "Beyond the discount, the real benefit is consistency. Coats stay maintained, mats don't develop, ear infections are caught early, and the same groomer often handles the same pet across sessions — so they learn the pet's quirks and the pet learns the groomer's voice. That continuity reduces session-time stress more than any single technique.",
      "Plans typically aren't refundable for unused sessions, but most providers (All Tails included) let you reschedule freely within the plan duration and roll over unused sessions if a pet has a medical leave.",
    ],
    related: ["dog-grooming", "cat-grooming"],
  },
};

export const GLOSSARY_SLUGS = Object.keys(GLOSSARY_ENTRIES);

export function getGlossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY_ENTRIES[slug.toLowerCase()];
}
