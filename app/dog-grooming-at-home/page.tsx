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
  title: "Dog Grooming at Home | Doorstep Grooming Across Delhi NCR, Tricity, Punjab | All Tails",
  description:
    "Book dog grooming at home with All Tails. Trained groomers visit your doorstep with bath, haircut, nail trim, ear cleaning and full styling. Packages from ₹999.",
  path: "/dog-grooming-at-home",
});

const DOG_GROOMING_FAQS = [
  {
    q: "What is dog grooming at home?",
    a: "Dog grooming at home is a doorstep service where a trained groomer visits your home with every tool and product needed to bathe, brush, trim and style your dog. Your dog stays in their familiar environment — no salon trip, no kennel wait, no separation stress.",
  },
  {
    q: "How long does a dog grooming session take?",
    a: "60–120 minutes depending on the package. Essential Care (bath-led upkeep) takes around 60–75 minutes. Signature Care (bath + hygiene haircut) takes 75–90 minutes. Complete Pampering (full body styling) takes 90–120 minutes. Long-coat breeds and senior dogs may need slightly longer.",
  },
  {
    q: "How much does dog grooming at home cost?",
    a: "Essential Care starts at ₹999 for bath-led upkeep with nail trim and ear cleaning. Signature Care is ₹1,299 (most booked) and includes a hygiene haircut and dental hygiene. Complete Pampering at ₹1,799 includes a full body haircut, paw butter, dental care and the full spa finish. Coat care plans starting at ₹3,799 give a discount for repeat sessions.",
  },
  {
    q: "Which dog breeds do you groom?",
    a: "All breeds. We regularly groom Shih Tzu, Pomeranian, Lhasa Apso, Maltese, Golden Retriever, Labrador, Beagle, Pug, Indie dogs, German Shepherd, Husky and dozens more. For long-coat or double-coat breeds, mention your dog's specific breed when booking so we plan the right tools and time.",
  },
  {
    q: "Is at-home dog grooming safe for anxious or senior dogs?",
    a: "Yes — it's actually safer for many anxious and senior dogs than a salon. The familiar environment lowers stress, our groomers use calm-handling protocols, and there's no rush from a back-to-back salon schedule. Tell us about any anxiety, health condition or handling preference at booking so we plan accordingly.",
  },
  {
    q: "What products do you use?",
    a: "100% vegan, sulfate-free, paraben-free shampoos and conditioners. Pet-safe nail trimmers, ear-cleaning solution, dental hygiene products and (for Complete Pampering) paw butter and finishing spray. Tools are sanitised between every visit.",
  },
  {
    q: "Can you groom my dog if I'm not home?",
    a: "We recommend you or another adult be home for the session, especially for a first booking. The groomer needs access, a non-slip surface for the bath area, and a quick handover of any pet handling notes. For repeat bookings with familiar groomers, some customers leave keys with society security — message us on WhatsApp to coordinate.",
  },
];

export default function DogGroomingAtHomePage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Dog grooming at home", path: "/dog-grooming-at-home" },
  ]);

  // Page-specific Service schema scoped to dog grooming. Distinguishes
  // this page from the general professional service node — Google can
  // surface both ProfessionalService (the business) and Service (this
  // page's specific offering) in different SERP contexts.
  const dogGroomingServiceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/dog-grooming-at-home#service`,
    name: "Dog grooming at home",
    serviceType: "Doorstep dog grooming",
    description:
      "At-home dog grooming for all breeds — bath, brushing, nail trim, ear cleaning, hygiene haircut or full body styling. Trained groomers visit your home with all tools and products.",
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
      audienceType: "Dog owners",
    },
  };

  const dogFaqSchema = faqPageSchema(DOG_GROOMING_FAQS);

  return (
    <SeoPageShell>
      <JsonLd
        data={[
          professionalServiceSchema(),
          serviceSchema(),
          dogGroomingServiceSchema,
          dogFaqSchema,
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
            <span className="text-[#241b4b]">Dog grooming at home</span>
          </nav>

          <section className="mt-6">
            <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5ce0]">
              Doorstep service
            </span>
            <h1 className="mt-5 text-[36px] font-black leading-[1.08] tracking-[-0.035em] text-[#241b4b] lg:text-[52px]">
              Dog grooming at home.
              <br />
              <span className="text-[#6d5bd0]">All breeds, all coats.</span>
            </h1>
            <p className="mt-4">
              <span className="inline-flex items-center rounded-full bg-[#f4efff] px-4 py-1.5 text-[13.5px] font-semibold text-[#5b49c8]">
                Essential ₹999 · Signature ₹1,299 · Complete Pampering ₹1,799
              </span>
            </p>
            <p className="mt-4 max-w-[760px] text-[15.5px] font-medium leading-[1.75] text-[#4f475f] lg:text-[16.5px]">
              All Tails brings professional dog grooming to your doorstep across 10 cities. Trained groomers carry every tool and product — bath, brushing, nail trim, ear cleaning, hygiene haircut or full body styling — to your home, so your dog never leaves their familiar environment.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-medium text-[#5f5878]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(38,28,70,0.05)]">
                <span className="text-[#f2a11a]">★</span>
                <span className="font-semibold text-[#241b4b]">{BUSINESS_INFO.aggregateRating.ratingValue}</span>
                <span className="text-[#8a82a3]">· {BUSINESS_INFO.aggregateRating.reviewCount} reviews</span>
              </span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#11724f]" />Trained groomers</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-[#b84a4a]" />Vegan products</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-[#6d5bd0]" />From ₹999</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/booking" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#6d5bd0] px-6 text-[14.5px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)]">
                Book a grooming slot
                <ArrowRight className="h-4 w-4" />
              </Link>
              <TrackedExternalLink type="whatsapp" href={`${whatsappHref}?text=${encodeURIComponent("Hi All Tails, I'm interested in dog grooming at home.")}`} target="_blank" rel="noopener noreferrer" trackingService="dog_grooming" trackingSource="dog_hero" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(37,211,102,0.28)]">
                <MessageCircle className="h-4 w-4" />WhatsApp us
              </TrackedExternalLink>
              <TrackedExternalLink type="call" href={phoneTel} trackingService="dog_grooming" trackingSource="dog_hero" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-[#ded7f1] bg-white px-5 text-[14px] font-semibold text-[#5b49c8]">
                <Phone className="h-4 w-4" />Call now
              </TrackedExternalLink>
            </div>
          </section>

          {/* What's included */}
          <section className="mt-14">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              What a dog grooming session covers
            </h2>
            <p className="mt-3 max-w-[700px] text-[14.5px] font-medium leading-[1.75] text-[#5f5878]">
              Every session starts with the bath and ends with a finish appropriate to your package. Inclusions scale with the tier you pick.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { title: "Bath + blow dry", body: "Premium vegan shampoo, conditioner, full coat dry with a forced-air dryer." },
                { title: "Brushing + de-tangling", body: "Brush-out for the breed's coat type, light de-shedding for double coats." },
                { title: "Nail trim + paw care", body: "Clip and file. Paw butter for cracked pads in Complete Pampering." },
                { title: "Ear cleaning", body: "Gentle wipe and inspection for redness, debris or yeast buildup." },
                { title: "Hygiene haircut", body: "Face, paws, sanitary area. Included in Signature Care and Complete Pampering." },
                { title: "Full body haircut", body: "Breed-appropriate styling. Included in Complete Pampering." },
                { title: "Dental hygiene", body: "Tooth brushing + oral spray for breath. Signature Care and Complete Pampering." },
                { title: "Hair serum + perfume", body: "Finishing touches that reduce knotting and leave a clean scent. Complete Pampering." },
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
          </section>

          {/* Breeds */}
          <section className="mt-14">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              Breeds we groom
            </h2>
            <p className="mt-3 max-w-[760px] text-[14.5px] font-medium leading-[1.75] text-[#5f5878]">
              All breeds welcome. For long-coat and double-coat breeds, mention the breed when booking so we plan tools and time accordingly.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { group: "Long-coat", breeds: "Shih Tzu, Lhasa Apso, Maltese, Pomeranian, Pekingese" },
                { group: "Double-coat", breeds: "Golden Retriever, Labrador, Husky, German Shepherd" },
                { group: "Short-coat", breeds: "Beagle, Pug, Bulldog, Indie (smooth coat), Dachshund" },
                { group: "Curly / wiry", breeds: "Poodle, Cocker Spaniel, Schnauzer, Terriers" },
                { group: "Toy / small", breeds: "Yorkshire Terrier, Chihuahua, Toy Poodle" },
                { group: "Indie / mixed", breeds: "Indie dogs of every coat type — adopted, rescued, mixed lineage" },
              ].map((row) => (
                <div key={row.group} className="rounded-[18px] border border-[#ece4f8] bg-white px-4 py-3.5">
                  <div className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#7a5ce0]">{row.group}</div>
                  <div className="mt-1.5 text-[13.5px] font-medium text-[#4f475f]">{row.breeds}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Why doorstep */}
          <section className="mt-14">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              Why dog owners pick doorstep grooming
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { title: "Calmer for anxious dogs", body: "Familiar environment, no kennel wait, no salon background noise. Most reactive dogs handle at-home grooming better than salon grooming." },
                { title: "Senior-pet friendly", body: "Older dogs with arthritis, weak joints or limited mobility avoid the car ride and the wait. Sessions can be paced to your dog's comfort." },
                { title: "Multi-pet households", body: "Two or three pets in the same booking — they're more comfortable together at home than separated in a salon." },
              ].map((item) => (
                <div key={item.title} className="rounded-[20px] border border-[#ece4f8] bg-white p-5">
                  <div className="text-[14.5px] font-bold text-[#241b4b]">{item.title}</div>
                  <p className="mt-2 text-[13px] font-medium leading-[1.6] text-[#6b7280]">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section className="mt-14">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              Frequently asked questions
            </h2>
            <div className="mt-5 space-y-2.5">
              {DOG_GROOMING_FAQS.map((faq) => (
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
                Ready to book dog grooming at home?
              </h2>
              <p className="mt-3 max-w-[560px] text-[14px] font-medium leading-[1.7] text-white/80">
                Pick a slot online, or message us on WhatsApp with your area and your dog&apos;s breed. Most cities have same-day slots; expect a confirmation within minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link href="/booking" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-white px-6 text-[14.5px] font-bold text-[#241b4b]">
                  Book a slot
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <TrackedExternalLink type="whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" trackingService="dog_grooming" trackingSource="dog_final_cta" className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366]/15 px-5 text-[14px] font-semibold text-white">
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
