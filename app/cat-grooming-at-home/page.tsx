import Link from "next/link";
import { ArrowRight, Check, Heart, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { TrackedExternalLink } from "../components/analytics/TrackedExternalLink";
import { INDIVIDUAL_SESSION_SERVICES } from "@/lib/booking/constants";
import { BUSINESS_INFO, SITE_URL, phoneTel, whatsappHref } from "@/lib/seo/businessInfo";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  professionalServiceSchema,
  serviceSchema,
} from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Cat Grooming at Home | Stress-free Doorstep Service | All Tails",
  description:
    "Cat grooming at home — gentle handling, cat-safe products, no salon trip. Bath, de-matting, nail trim and ear cleaning at your doorstep. Packages from ₹999.",
  path: "/cat-grooming-at-home",
});

const CAT_GROOMING_FAQS = [
  {
    q: "Do cats really need grooming?",
    a: "Yes — but less often than dogs. Cats self-groom, so daily upkeep isn't needed. Long-coat breeds (Persian, Maine Coon, Ragdoll) develop mats that they can't manage alone. Senior cats and overweight cats often need help reaching their tail and hindquarters. And every cat benefits from periodic nail trimming, ear inspection and (when coats get oily or matted) a proper bath.",
  },
  {
    q: "How is at-home cat grooming different from dog grooming?",
    a: "Cats experience grooming as inherently threatening — water, confinement and strangers all trigger their flight response. Sessions are shorter (45–75 minutes), use cat-specific products free of essential oils, and prioritise the cat's comfort over a perfect cut. Our handlers use slow approach, wrap-towel restraint when needed, and break the session into small steps so the cat can reset between them.",
  },
  {
    q: "What does a cat grooming session include?",
    a: "Brushing and de-matting, nail trim, ear cleaning, and optionally a bath with a cat-safe shampoo. Long-haired cats may also need a sanitary trim around the rear to keep things clean. Bath isn't always included — for short-haired cats with healthy coats, brushing and nail trim alone are usually enough.",
  },
  {
    q: "What if my cat hates being groomed?",
    a: "We start with a slow-acclimation visit. If your cat genuinely cannot tolerate handling — usually obvious within the first few minutes — we don't force it. For severe matting or grooming needs that the cat won't allow, the safe option is sedation grooming under a vet's supervision. We'll tell you honestly if we think that's the right route instead of pushing through.",
  },
  {
    q: "Are your shampoos and products safe for cats?",
    a: "Yes. We use cat-specific shampoos that are free of essential oils — tea tree, eucalyptus, pennyroyal and several others are toxic to cats. Many dog shampoos (especially those containing permethrin for tick control) are also dangerous for cats. We never substitute. If you're not sure what's in a product you already own, don't use it on a cat without checking with a vet.",
  },
  {
    q: "How much does cat grooming at home cost?",
    a: "₹999 for Essential Care (brushing + nail trim + ear cleaning + light bath if needed) up to ₹1,799 for Complete Pampering (full bath, de-matting, sanitary trim, paw care). Most healthy short-haired cats only need Essential Care; long-haired cats with mats benefit from the higher tiers.",
  },
  {
    q: "Do I need to be home for the session?",
    a: "Yes, especially for cats — they handle stranger-arrival much better when you're present. For cat grooming we recommend you be in or near the room for at least the first 15 minutes so the cat associates the groomer's arrival with you being calm.",
  },
];

export default function CatGroomingAtHomePage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Cat grooming at home", path: "/cat-grooming-at-home" },
  ]);

  const catGroomingServiceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/cat-grooming-at-home#service`,
    name: "Cat grooming at home",
    serviceType: "Doorstep cat grooming",
    description:
      "At-home cat grooming with calm-handling protocols and cat-safe products. Brushing, de-matting, nail trim, ear cleaning and bath when needed.",
    provider: { "@id": `${SITE_URL}/#localbusiness` },
    areaServed: BUSINESS_INFO.serviceAreas.map((name) => ({
      "@type": "City",
      name,
    })),
    offers: INDIVIDUAL_SESSION_SERVICES.map((pkg) => ({
      "@type": "Offer",
      name: pkg.name,
      description: pkg.shortDescription,
      price: pkg.price,
      priceCurrency: "INR",
      url: `${SITE_URL}/packages`,
      availability: "https://schema.org/InStock",
    })),
    audience: {
      "@type": "PeopleAudience",
      audienceType: "Cat owners",
    },
  };

  const catFaqSchema = faqPageSchema(CAT_GROOMING_FAQS);

  return (
    <SeoPageShell>
      <JsonLd
        data={[
          professionalServiceSchema(),
          serviceSchema(),
          catGroomingServiceSchema,
          catFaqSchema,
          breadcrumbs,
        ]}
      />

      <main className="relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)]">
        <div aria-hidden className="pointer-events-none absolute -right-[140px] -top-[120px] h-[420px] w-[420px] rounded-full bg-[#e9defa] opacity-70 blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-[160px] -left-[120px] h-[440px] w-[440px] rounded-full bg-[#fff0e3] opacity-50 blur-[120px]" />

        <div className="relative mx-auto max-w-[1100px] px-5 pb-24 pt-12 lg:px-8 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#8a82a3]">
            <Link href="/" className="hover:text-[#5b49c8]">Home</Link>
            <span className="px-1.5 text-[#cfc7df]">/</span>
            <span className="text-[#241b4b]">Cat grooming at home</span>
          </nav>

          <section className="mt-6">
            <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5ce0]">
              Cat-safe doorstep service
            </span>
            <h1 className="mt-5 text-[36px] font-black leading-[1.08] tracking-[-0.035em] text-[#241b4b] lg:text-[52px]">
              Cat grooming at home.
              <br />
              <span className="text-[#6d5bd0]">Calm hands, cat-safe products.</span>
            </h1>
            <p className="mt-4">
              <span className="inline-flex items-center rounded-full bg-[#f4efff] px-4 py-1.5 text-[13.5px] font-semibold text-[#5b49c8]">
                Essential ₹999 · Signature ₹1,299 · Complete Pampering ₹1,799
              </span>
            </p>
            <p className="mt-4 max-w-[760px] text-[15.5px] font-medium leading-[1.75] text-[#4f475f] lg:text-[16.5px]">
              Cats hate being moved, restrained and bathed by strangers — almost universally. At-home grooming removes the worst of those triggers. Our trained handlers use slow approach, calm restraint, and cat-specific products free of essential oils. We&apos;ll do as much as your cat will allow, and tell you honestly when sedation grooming with a vet is the safer call.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-medium text-[#5f5878]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(38,28,70,0.05)]">
                <span className="text-[#f2a11a]">★</span>
                <span className="font-semibold text-[#241b4b]">{BUSINESS_INFO.aggregateRating.ratingValue}</span>
                <span className="text-[#8a82a3]">· {BUSINESS_INFO.aggregateRating.reviewCount} reviews</span>
              </span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#11724f]" />Calm-handling protocols</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-[#b84a4a]" />Cat-safe products</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-[#6d5bd0]" />From ₹999</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/booking" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#6d5bd0] px-6 text-[14.5px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)]">
                Book a grooming slot
                <ArrowRight className="h-4 w-4" />
              </Link>
              <TrackedExternalLink type="whatsapp" href={`${whatsappHref}?text=${encodeURIComponent("Hi All Tails, I'm interested in cat grooming at home.")}`} target="_blank" rel="noopener noreferrer" trackingService="cat_grooming" trackingSource="cat_hero" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(37,211,102,0.28)]">
                <MessageCircle className="h-4 w-4" />WhatsApp us
              </TrackedExternalLink>
              <TrackedExternalLink type="call" href={phoneTel} trackingService="cat_grooming" trackingSource="cat_hero" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-[#ded7f1] bg-white px-5 text-[14px] font-semibold text-[#5b49c8]">
                <Phone className="h-4 w-4" />Call now
              </TrackedExternalLink>
            </div>
          </section>

          {/* What cats actually need */}
          <section className="mt-14">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              What cat grooming actually covers
            </h2>
            <p className="mt-3 max-w-[760px] text-[14.5px] font-medium leading-[1.75] text-[#5f5878]">
              Cat grooming isn&apos;t a smaller version of dog grooming — it&apos;s a different service. Cats need de-matting and nail care more than they need full styling. A bath is included only when the coat is oily, matted or there&apos;s a medical reason. We focus on what your cat actually benefits from.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { title: "Brushing + de-matting", body: "Slow brush-out for the coat type. Mats are loosened gently with a de-matting tool — not yanked." },
                { title: "Nail trim", body: "Clip and file. We trim what we can comfortably reach without overwhelming the cat. Most cats tolerate this best of all the steps." },
                { title: "Ear inspection + clean", body: "Visual check for redness, debris and wax buildup. Gentle wipe with a cat-safe cleaner." },
                { title: "Sanitary trim", body: "For long-haired cats — trimming around the rear to keep hygiene easy between sessions." },
                { title: "Bath (when needed)", body: "Cat-specific shampoo free of essential oils. Done only when the coat warrants it — not every session." },
                { title: "Paw + pad check", body: "Inspect for litter buildup, cracked pads, or sticky residue. Quick trim of paw-pad fur if it&apos;s overgrown." },
              ].map((item) => (
                <div key={item.title} className="rounded-[18px] border border-[#ece4f8] bg-white px-4 py-3.5">
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6d5bd0]" strokeWidth={2.8} />
                    <div>
                      <div className="text-[14px] font-bold text-[#241b4b]">{item.title}</div>
                      <div className="mt-1 text-[12.5px] font-medium leading-[1.6] text-[#6b7280]">{item.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* The honest section — when cat grooming at home doesn't work */}
          <section className="mt-14 rounded-[28px] border border-[#f3d7a3] bg-[#fff8eb] px-6 py-7 lg:px-8">
            <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#7a4a14]">
              When at-home cat grooming isn&apos;t the right call
            </h2>
            <p className="mt-3 max-w-[760px] text-[14px] font-medium leading-[1.7] text-[#7a4a14]">
              We&apos;re honest about this because pushing through with a stressed cat can hurt the cat and the groomer. At-home grooming works for most cats most of the time, but it doesn&apos;t work for every cat:
            </p>
            <ul className="mt-4 space-y-2 text-[13.5px] font-medium text-[#7a4a14]">
              <li>• Severe matting that needs shaving — usually requires sedation grooming under a vet.</li>
              <li>• Cats with active aggression who can&apos;t be safely handled by a stranger — sedation grooming is safer.</li>
              <li>• Medical conditions that require full hydro-bath equipment we don&apos;t carry to homes.</li>
            </ul>
            <p className="mt-4 max-w-[760px] text-[13.5px] font-medium leading-[1.7] text-[#7a4a14]">
              For these cases, we&apos;ll recommend a vet clinic and decline the booking respectfully. We won&apos;t take your money and produce a half-done session.
            </p>
          </section>

          {/* Packages */}
          <section className="mt-14">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              Pick a package
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {INDIVIDUAL_SESSION_SERVICES.map((pkg) => (
                <article key={pkg.name} className="flex flex-col rounded-[26px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
                  <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">{pkg.name}</div>
                  <div className="mt-1 text-[12.5px] font-medium text-[#8a82a3]">{pkg.duration} · {pkg.shortDescription}</div>
                  <div className="mt-4 text-[22px] font-black text-[#241b4b]">₹{pkg.price}</div>
                  <ul className="mt-3 space-y-1.5 text-[13px] font-medium leading-[1.55] text-[#4f475f]">
                    {pkg.bullets.slice(0, 3).map((bullet) => (
                      <li key={bullet} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6d5bd0]" strokeWidth={2.6} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/booking?package=${pkg.name.toLowerCase().replace(/\s+/g, "-")}`} className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-[#241b4b] text-[13.5px] font-semibold text-white">
                    Book {pkg.name}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] font-medium text-[#8a82a3]">
              For most healthy short-haired cats, Essential Care covers what they actually need. Long-haired or senior cats often benefit from Signature Care or Complete Pampering.
            </p>
          </section>

          {/* FAQs */}
          <section className="mt-14">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              Frequently asked questions
            </h2>
            <div className="mt-5 space-y-2.5">
              {CAT_GROOMING_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-[18px] border border-[#ece4f8] bg-white px-4 py-3.5 open:bg-[#fbfaff]">
                  <summary className="cursor-pointer list-none text-[14px] font-bold text-[#241b4b] [&::-webkit-details-marker]:hidden">{faq.q}</summary>
                  <p className="mt-2.5 text-[13.5px] font-medium leading-[1.7] text-[#4f475f]">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="mt-14">
            <div className="overflow-hidden rounded-[32px] border border-[#ded4f5] bg-[linear-gradient(135deg,#241b4b_0%,#3a2c6f_100%)] px-6 py-10 text-white shadow-[0_24px_60px_rgba(38,28,70,0.18)] lg:px-10">
              <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">Book your slot</div>
              <h2 className="mt-2 max-w-[640px] text-[28px] font-black leading-[1.15] tracking-[-0.025em] lg:text-[32px]">
                Cat grooming at home — done right.
              </h2>
              <p className="mt-3 max-w-[560px] text-[14px] font-medium leading-[1.7] text-white/80">
                Book online, or WhatsApp us with your cat&apos;s breed and temperament. We&apos;ll match a calm-experienced groomer and confirm within minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link href="/booking" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-white px-6 text-[14.5px] font-bold text-[#241b4b]">
                  Book a slot
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <TrackedExternalLink type="whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" trackingService="cat_grooming" trackingSource="cat_final_cta" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366]/15 px-5 text-[14px] font-semibold text-white">
                  <MessageCircle className="h-4 w-4" />WhatsApp us
                </TrackedExternalLink>
              </div>
            </div>
          </section>
        </div>
      </main>
    </SeoPageShell>
  );
}
