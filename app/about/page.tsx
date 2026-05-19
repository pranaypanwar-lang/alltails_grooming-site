import Link from "next/link";
import { ArrowRight, Heart, MapPin, MessageCircle, ShieldCheck, Sparkles, Users } from "lucide-react";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { TrackedExternalLink } from "../components/analytics/TrackedExternalLink";
import { BUSINESS_INFO, SITE_URL, whatsappHref } from "@/lib/seo/businessInfo";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "About All Tails | At-Home Pet Grooming Across Delhi NCR, Tricity & Punjab",
  description:
    "All Tails is a doorstep pet grooming service for dogs and cats across 10 cities. Trained groomers, vegan products, transparent packages from ₹999.",
  path: "/about",
});

const TRUST_PILLARS = [
  {
    icon: Heart,
    title: "Vegan, paraben-free products",
    body:
      "Every shampoo, conditioner and finishing product we carry is 100% vegan, sulfate-free and paraben-free. We pick formulations safe for the everyday Indian pet — short coats, long coats, sensitive skin and senior pets included.",
  },
  {
    icon: ShieldCheck,
    title: "Trained, background-verified groomers",
    body:
      "Our groomers are trained on calm-handling protocols, breed-specific cuts and tool hygiene. We sanitise clippers, blades and brushes between every visit. No salon shortcuts.",
  },
  {
    icon: MapPin,
    title: "Doorstep, never a salon",
    body:
      "We don't operate a walk-in salon. Every session happens at your home so your pet stays in their familiar environment — no car ride, no kennel wait, no separation stress. Most-comfortable for anxious dogs, senior pets and first-timers.",
  },
  {
    icon: Sparkles,
    title: "Transparent packages, deposit-backed slots",
    body:
      "Three individual packages from ₹999 to ₹1,799 and three coat-care plans for repeat sessions. No surprise charges. Pay online or block your slot with a ₹250 deposit and settle the balance with the groomer after the visit.",
  },
];

const METHODOLOGY = [
  {
    step: "01",
    title: "You book a slot",
    body:
      "Pick a package, city and date. Our system shows real-time availability for the team that serves your area. Same-day slots are usually available in major cities.",
  },
  {
    step: "02",
    title: "Groomer is assigned",
    body:
      "Within 30 minutes of booking, a trained groomer is auto-matched based on availability, location and pet type. You get a confirmation on WhatsApp.",
  },
  {
    step: "03",
    title: "Pre-visit coordination",
    body:
      "One day before, our team confirms address, parking, and any special handling notes. For long-hair styling, we may ask for a recent photo to plan the cut.",
  },
  {
    step: "04",
    title: "Doorstep grooming session",
    body:
      "The groomer arrives at the booked slot with every tool and product. Sessions run 60–120 minutes depending on the package. You can stay in the room or step away — whatever your pet prefers.",
  },
  {
    step: "05",
    title: "Aftercare follow-up",
    body:
      "You pay any remaining balance to the groomer in cash or UPI. We follow up the next day on WhatsApp to check coat condition and pet comfort. Photos are welcome.",
  },
];

export default function AboutPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS_INFO.name,
    legalName: BUSINESS_INFO.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Premium at-home pet grooming service for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana and Patiala. Trained groomers, vegan products, transparent packages.",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_INFO.address.streetAddress,
      addressLocality: BUSINESS_INFO.address.addressLocality,
      addressRegion: BUSINESS_INFO.address.addressRegion,
      postalCode: BUSINESS_INFO.address.postalCode,
      addressCountry: BUSINESS_INFO.address.addressCountry,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: BUSINESS_INFO.phoneDisplay,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
    ],
    sameAs: [
      BUSINESS_INFO.socials.instagram,
      BUSINESS_INFO.socials.facebook,
      BUSINESS_INFO.socials.linkedin,
    ],
    knowsAbout: [
      "At-home pet grooming",
      "Dog grooming",
      "Cat grooming",
      "Pet hygiene",
      "Coat care",
      "Doorstep grooming services",
    ],
  };

  // AboutPage schema — primary entity is the Organization. Gives AI engines
  // a clean "what is this page" signal for citation when a user asks about
  // All Tails the company.
  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE_URL}/about#webpage`,
    url: `${SITE_URL}/about`,
    name: "About All Tails",
    description:
      "All Tails is a doorstep pet grooming service for dogs and cats across 10 cities in North India.",
    mainEntity: { "@id": `${SITE_URL}/#organization` },
    // breadcrumb ref intentionally omitted — breadcrumbSchema() doesn't emit
    // a top-level @id on the BreadcrumbList, so a reference here would be
    // a dangling pointer. The visible breadcrumb in the nav already links.
  };

  return (
    <SeoPageShell>
      <JsonLd
        data={[
          organizationSchema,
          aboutPageSchema,
          breadcrumbs,
        ]}
      />

      <main className="relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[140px] -top-[120px] h-[420px] w-[420px] rounded-full bg-[#e9defa] opacity-70 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[160px] -left-[120px] h-[440px] w-[440px] rounded-full bg-[#fff0e3] opacity-50 blur-[120px]"
        />

        <div className="relative mx-auto max-w-[1100px] px-5 pb-24 pt-12 lg:px-8 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#8a82a3]">
            <Link href="/" className="hover:text-[#5b49c8]">
              Home
            </Link>
            <span className="px-1.5 text-[#cfc7df]">/</span>
            <span className="text-[#241b4b]">About</span>
          </nav>

          {/* Hero */}
          <section className="mt-6">
            <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5ce0]">
              About All Tails
            </span>
            <h1 className="mt-5 max-w-[820px] text-[36px] font-black leading-[1.08] tracking-[-0.035em] text-[#241b4b] lg:text-[52px]">
              Premium grooming.
              <br />
              <span className="text-[#6d5bd0]">At your doorstep.</span>
            </h1>
            <p className="mt-5 max-w-[760px] text-[15.5px] font-medium leading-[1.75] text-[#4f475f] lg:text-[16.5px]">
              All Tails is a doorstep pet grooming service for dogs and cats. We don&apos;t operate a walk-in salon — our trained groomers visit your home with every tool and product needed for a full session. We&apos;re built around one belief: pets are calmer, healthier and easier to groom in their own environment, on their own schedule.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] font-medium text-[#5f5878]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(38,28,70,0.05)]">
                <span className="text-[#f2a11a]">★</span>
                <span className="font-semibold text-[#241b4b]">
                  {BUSINESS_INFO.aggregateRating.ratingValue}
                </span>
                <span className="text-[#8a82a3]">
                  · {BUSINESS_INFO.aggregateRating.reviewCount} Google reviews
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#11724f]" />
                {BUSINESS_INFO.serviceAreas.length} cities served
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-[#b84a4a]" />
                Vegan products
              </span>
            </div>
          </section>

          {/* What we believe */}
          <section className="mt-16">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[30px]">
              What we believe about grooming
            </h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[26px] border border-[#ece4f8] bg-white p-6 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
                <h3 className="text-[17px] font-bold text-[#241b4b]">
                  Salons aren&apos;t built for pets, they&apos;re built for throughput.
                </h3>
                <p className="mt-3 text-[14px] font-medium leading-[1.75] text-[#5f5878]">
                  Traditional pet salons process pets in batches — kennel wait, separation from owner, unfamiliar dryers and strangers, sometimes a back-to-back schedule that rushes the actual grooming. For an anxious dog or a senior pet, that environment is closer to a vet visit than a spa. We removed it entirely. Every session is one groomer, one pet, one home.
                </p>
              </div>
              <div className="rounded-[26px] border border-[#ece4f8] bg-white p-6 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
                <h3 className="text-[17px] font-bold text-[#241b4b]">
                  Premium isn&apos;t a price tag, it&apos;s the care behind every decision.
                </h3>
                <p className="mt-3 text-[14px] font-medium leading-[1.75] text-[#5f5878]">
                  We picked vegan, sulfate-free, paraben-free products because they&apos;re kinder to skin — not because they sound better. We trained our groomers on calm handling because anxious pets stay anxious if rushed. We made pricing transparent because surprise charges erode trust faster than any bad haircut. Each choice came from doing this badly the first time and getting it right after.
                </p>
              </div>
            </div>
          </section>

          {/* Trust pillars */}
          <section className="mt-16">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[30px]">
              What you get with every session
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {TRUST_PILLARS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-[24px] border border-[#ece4f8] bg-white p-5 shadow-[0_10px_28px_rgba(38,28,70,0.05)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#f5f1ff] text-[#6d5bd0]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15.5px] font-bold text-[#241b4b]">{title}</h3>
                    <p className="mt-2 text-[13.5px] font-medium leading-[1.7] text-[#5f5878]">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* How a booking works */}
          <section className="mt-16">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[30px]">
              How a booking actually works
            </h2>
            <p className="mt-3 max-w-[700px] text-[14.5px] font-medium leading-[1.75] text-[#5f5878]">
              From your tap to our groomer leaving your door, five steps and roughly two hours of involvement on your side. No surprises baked in.
            </p>
            <ol className="mt-6 grid gap-3">
              {METHODOLOGY.map(({ step, title, body }) => (
                <li
                  key={step}
                  className="flex items-start gap-4 rounded-[20px] border border-[#ece4f8] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(38,28,70,0.04)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#241b4b] text-[13px] font-black text-white">
                    {step}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#241b4b]">{title}</h3>
                    <p className="mt-1.5 text-[13.5px] font-medium leading-[1.7] text-[#5f5878]">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Service area summary */}
          <section className="mt-16">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[30px]">
              Where we operate
            </h2>
            <p className="mt-3 max-w-[700px] text-[14.5px] font-medium leading-[1.75] text-[#5f5878]">
              Headquartered in Gurugram with a Chandigarh Tricity team operating from a second office. Currently serving {BUSINESS_INFO.serviceAreas.length} cities across three regions:
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[#ece4f8] bg-white p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9088b8]">Delhi NCR</div>
                <div className="mt-2 text-[14.5px] font-bold text-[#241b4b]">
                  Delhi · Gurgaon · Noida · Ghaziabad · Faridabad
                </div>
              </div>
              <div className="rounded-[22px] border border-[#ece4f8] bg-white p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9088b8]">Chandigarh Tricity</div>
                <div className="mt-2 text-[14.5px] font-bold text-[#241b4b]">
                  Chandigarh · Mohali · Panchkula
                </div>
              </div>
              <div className="rounded-[22px] border border-[#ece4f8] bg-white p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9088b8]">Punjab</div>
                <div className="mt-2 text-[14.5px] font-bold text-[#241b4b]">
                  Ludhiana · Patiala
                </div>
              </div>
            </div>
            <p className="mt-5 text-[13.5px] font-medium text-[#6b7280]">
              Don&apos;t see your city?{" "}
              <Link href="/contact" className="text-[#5b49c8] underline decoration-[#cfc7df] underline-offset-[3px]">
                Get in touch
              </Link>{" "}
              and we&apos;ll let you know when we&apos;re routing through nearby.
            </p>
          </section>

          {/* Contact CTA */}
          <section className="mt-16">
            <div className="overflow-hidden rounded-[32px] border border-[#ded4f5] bg-[linear-gradient(135deg,#241b4b_0%,#3a2c6f_100%)] px-6 py-10 text-white shadow-[0_24px_60px_rgba(38,28,70,0.18)] lg:px-10">
              <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Get in touch
              </div>
              <h2 className="mt-2 max-w-[600px] text-[26px] font-black leading-[1.15] tracking-[-0.025em] lg:text-[32px]">
                Questions, partnerships, press, careers — we read everything.
              </h2>
              <p className="mt-3 max-w-[560px] text-[14px] font-medium leading-[1.7] text-white/80">
                For booking and slot questions, WhatsApp is fastest. For everything else, email works well.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <TrackedExternalLink
                  type="whatsapp"
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  trackingSource="about_cta"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366] px-5 text-[14px] font-semibold text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp us
                </TrackedExternalLink>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-white px-5 text-[14px] font-bold text-[#241b4b]"
                >
                  Visit contact page
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </SeoPageShell>
  );
}
