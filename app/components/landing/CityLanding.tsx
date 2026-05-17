import Link from "next/link";
import { ArrowRight, Check, Heart, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";

import type { CityLandingData } from "@/lib/cities/data";
import { INDIVIDUAL_SESSION_SERVICES } from "@/lib/booking/constants";
import { phoneTel, whatsappHref, BUSINESS_INFO } from "@/lib/seo/businessInfo";
import { TrackedExternalLink } from "@/app/components/analytics/TrackedExternalLink";

/**
 * Shared template for every /pet-grooming/[city] landing page.
 *
 * Design contract:
 *   - All city-specific copy comes from CityLandingData (data file).
 *   - Layout, schema, CTAs are uniform across cities (this file).
 *   - Adding a new city = adding a CityLandingData entry, no template
 *     edits required.
 *
 * Brand: matches the existing booking-flow + homepage aesthetics
 * (rounded-[28-32px] cards, soft purple/cream ambient glows, font-black
 * for hero only, font-semibold elsewhere). Sticky mobile CTA is global
 * from the root layout — this template intentionally doesn't render its
 * own footer bar.
 */

const NEARBY_CITIES: Record<string, { label: string; slug: string }[]> = {
  delhi: [
    { label: "Gurgaon", slug: "gurgaon" },
    { label: "Noida", slug: "noida" },
    { label: "Faridabad", slug: "faridabad" },
    { label: "Ghaziabad", slug: "ghaziabad" },
  ],
  gurgaon: [
    { label: "Delhi", slug: "delhi" },
    { label: "Faridabad", slug: "faridabad" },
    { label: "Noida", slug: "noida" },
  ],
  noida: [
    { label: "Delhi", slug: "delhi" },
    { label: "Ghaziabad", slug: "ghaziabad" },
    { label: "Gurgaon", slug: "gurgaon" },
  ],
  chandigarh: [
    { label: "Mohali", slug: "mohali" },
    { label: "Panchkula", slug: "panchkula" },
  ],
  mohali: [
    { label: "Chandigarh", slug: "chandigarh" },
    { label: "Panchkula", slug: "panchkula" },
  ],
  panchkula: [
    { label: "Chandigarh", slug: "chandigarh" },
    { label: "Mohali", slug: "mohali" },
  ],
  faridabad: [
    { label: "Delhi", slug: "delhi" },
    { label: "Gurgaon", slug: "gurgaon" },
  ],
  ghaziabad: [
    { label: "Delhi", slug: "delhi" },
    { label: "Noida", slug: "noida" },
  ],
};

type Props = {
  data: CityLandingData;
};

export function CityLanding({ data }: Props) {
  const whatsappMessage = `Hi All Tails, I'm interested in at-home pet grooming in ${data.displayName}.`;
  const whatsappUrl = `${whatsappHref}?text=${encodeURIComponent(whatsappMessage)}`;
  const bookingHref = `/booking?city=${data.slug}`;
  const nearbyCities = NEARBY_CITIES[data.slug] ?? [];

  return (
    <main className="relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)]">
      {/* Ambient brand glows — visual continuity with booking flow + hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[140px] -top-[120px] h-[420px] w-[420px] rounded-full bg-[#e9defa] opacity-70 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[160px] -left-[120px] h-[440px] w-[440px] rounded-full bg-[#fff0e3] opacity-50 blur-[120px]"
      />

      <div className="relative mx-auto max-w-[1100px] px-5 pb-24 pt-12 lg:px-8 lg:pt-16">
        {/* Breadcrumbs (rendered visibly for users; schema in <head>) */}
        <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#8a82a3]">
          <Link href="/" className="hover:text-[#5b49c8]">
            Home
          </Link>
          <span className="px-1.5 text-[#cfc7df]">/</span>
          <Link href="/pet-grooming" className="hover:text-[#5b49c8]">
            Pet grooming
          </Link>
          <span className="px-1.5 text-[#cfc7df]">/</span>
          <span className="text-[#241b4b]">{data.displayName}</span>
        </nav>

        {/* Hero */}
        <section className="mt-6">
          <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5ce0]">
            {data.region}
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.035em] text-[#241b4b] lg:text-[48px]">
            Pet Grooming at Home in {data.displayName}
          </h1>

          {/* Opening answer block — primary AEO target */}
          <p className="mt-5 max-w-[760px] text-[15.5px] font-medium leading-[1.75] text-[#4f475f] lg:text-[16.5px]">
            {data.intro}
          </p>

          {/* Trust row */}
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-medium text-[#5f5878]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(38,28,70,0.05)]">
              <span className="text-[#f2a11a]">★</span>
              <span className="font-semibold text-[#241b4b]">
                {BUSINESS_INFO.aggregateRating.ratingValue}
              </span>
              <span className="text-[#8a82a3]">
                · {BUSINESS_INFO.aggregateRating.reviewCount} reviews
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#11724f]" />
              Trained groomers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-[#b84a4a]" />
              Vegan products
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#6d5bd0]" />
              From ₹999
            </span>
          </div>

          {/* Hero CTAs */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href={bookingHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#6d5bd0] px-6 text-[14.5px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)]"
            >
              Book a grooming slot
              <ArrowRight className="h-4 w-4" />
            </Link>
            <TrackedExternalLink
              type="whatsapp"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              trackingCity={data.slug}
              trackingSource="city_hero"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366]/12 px-5 text-[14px] font-semibold text-[#11724f]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp us
            </TrackedExternalLink>
            <TrackedExternalLink
              type="call"
              href={phoneTel}
              trackingCity={data.slug}
              trackingSource="city_hero"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-[#ded7f1] bg-white px-5 text-[14px] font-semibold text-[#5b49c8]"
            >
              <Phone className="h-4 w-4" />
              Call now
            </TrackedExternalLink>
          </div>

          {data.callout ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f6f2ff] px-3.5 py-1.5 text-[12.5px] font-medium text-[#5b49c8]">
              <Sparkles className="h-3.5 w-3.5" />
              {data.callout}
            </p>
          ) : null}

          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#edfbf1] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#11724f]">
            <span className="h-2 w-2 rounded-full bg-[#11724f]" aria-hidden />
            Slots available this week in {data.displayName}
          </p>
        </section>

        {/* Packages */}
        <section className="mt-14">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#241b4b] lg:text-[28px]">
              Grooming packages in {data.displayName}
            </h2>
            <Link
              href="/packages"
              className="text-[13px] font-semibold text-[#6d5bd0] underline decoration-[#cfc7df] underline-offset-[3px]"
            >
              All packages
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {INDIVIDUAL_SESSION_SERVICES.map((pkg) => (
              <article
                key={pkg.name}
                className="flex flex-col rounded-[26px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]"
              >
                <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">
                  {pkg.name}
                </div>
                <div className="mt-1 text-[12.5px] font-medium text-[#8a82a3]">
                  {pkg.duration} · {pkg.shortDescription}
                </div>
                <div className="mt-4 text-[22px] font-black text-[#241b4b]">
                  ₹{pkg.price}
                </div>
                <ul className="mt-3 space-y-1.5 text-[13px] font-medium leading-[1.55] text-[#4f475f]">
                  {pkg.bullets.slice(0, 3).map((bullet) => (
                    <li key={bullet} className="flex items-start gap-1.5">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6d5bd0]"
                        strokeWidth={2.6}
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`${bookingHref}&package=${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-[#241b4b] text-[13.5px] font-semibold text-white"
                >
                  Book {pkg.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Areas served */}
        {data.areas.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-[22px] font-black tracking-[-0.02em] text-[#241b4b]">
              Areas we serve in {data.displayName}
            </h2>
            <p className="mt-2 text-[13.5px] font-medium leading-[1.7] text-[#6b7280]">
              Most-served zones below. If your locality isn&apos;t listed, message us
              on WhatsApp — we often have a groomer routing through nearby.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {data.areas.map((area) => (
                <li
                  key={area}
                  className="flex items-center gap-2 rounded-[14px] border border-[#ece4f8] bg-white px-3.5 py-2.5 text-[13px] font-medium text-[#3f3760]"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#6d5bd0]" />
                  {area}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* What's included */}
        <section className="mt-14">
          <h2 className="text-[22px] font-black tracking-[-0.02em] text-[#241b4b]">
            What&apos;s included in a session
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { title: "Bath + blow dry", body: "Premium vegan shampoo and conditioner, full coat dry." },
              { title: "Nail trim + paw care", body: "Trim, file, and paw butter for cracked pads." },
              { title: "Ear cleaning", body: "Gentle wipe and inspection for redness or buildup." },
              { title: "Hygiene haircut", body: "Trimming around face, paws and sanitary area." },
              { title: "Dental hygiene", body: "Tooth brushing with oral spray (Signature Care +)." },
              { title: "Full body styling", body: "Breed-appropriate haircut and finish (Complete Pampering)." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[18px] border border-[#ece4f8] bg-white px-4 py-3.5"
              >
                <div className="text-[14px] font-bold text-[#241b4b]">{item.title}</div>
                <div className="mt-1 text-[12.5px] font-medium leading-[1.55] text-[#6b7280]">
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why at-home */}
        <section className="mt-14">
          <h2 className="text-[22px] font-black tracking-[-0.02em] text-[#241b4b]">
            Why at-home grooming
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-[#ece4f8] bg-white p-5">
              <div className="text-[14.5px] font-bold text-[#241b4b]">No salon trip</div>
              <p className="mt-2 text-[13px] font-medium leading-[1.6] text-[#6b7280]">
                Skip the car ride, kennel wait and pickup logistics. Your pet stays in
                their familiar environment.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#ece4f8] bg-white p-5">
              <div className="text-[14.5px] font-bold text-[#241b4b]">Less stress</div>
              <p className="mt-2 text-[13px] font-medium leading-[1.6] text-[#6b7280]">
                Anxious dogs, senior pets and first-timers do better at home. We use
                calm handling and pet-safe products throughout.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#ece4f8] bg-white p-5">
              <div className="text-[14.5px] font-bold text-[#241b4b]">Same tools, no compromise</div>
              <p className="mt-2 text-[13px] font-medium leading-[1.6] text-[#6b7280]">
                Groomers carry blow dryers, clippers, premium shampoos. Same kit as a
                salon, just at your address.
              </p>
            </div>
          </div>
        </section>

        {/* City-specific FAQs */}
        <section className="mt-14">
          <h2 className="text-[22px] font-black tracking-[-0.02em] text-[#241b4b]">
            Frequently asked questions
          </h2>
          <div className="mt-5 space-y-2.5">
            {data.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-[18px] border border-[#ece4f8] bg-white px-4 py-3.5 open:bg-[#fbfaff]"
              >
                <summary className="cursor-pointer list-none text-[14px] font-bold text-[#241b4b] [&::-webkit-details-marker]:hidden">
                  {faq.question}
                </summary>
                <p className="mt-2.5 text-[13.5px] font-medium leading-[1.7] text-[#4f475f]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Nearby cities */}
        {nearbyCities.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#241b4b]">
              Also serving nearby
            </h2>
            <p className="mt-2 text-[13.5px] font-medium leading-[1.7] text-[#6b7280]">
              We cover multiple cities in this region — check the page for your exact area.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {nearbyCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/pet-grooming/${city.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-[14px] border border-[#ece4f8] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#5b49c8] shadow-[0_4px_14px_rgba(38,28,70,0.04)] transition hover:border-[#c9b8f5] hover:bg-[#f9f6ff]"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#6d5bd0]" />
                  Pet grooming in {city.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Final CTA card */}
        <section className="mt-14">
          <div className="overflow-hidden rounded-[32px] border border-[#ded4f5] bg-[linear-gradient(135deg,#241b4b_0%,#3a2c6f_100%)] px-6 py-10 text-white shadow-[0_24px_60px_rgba(38,28,70,0.18)] lg:px-10">
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Book your slot
            </div>
            <h2 className="mt-2 max-w-[640px] text-[28px] font-black leading-[1.15] tracking-[-0.025em] lg:text-[32px]">
              Ready to book grooming in {data.displayName}?
            </h2>
            <p className="mt-3 max-w-[560px] text-[14px] font-medium leading-[1.7] text-white/80">
              Pick a slot online, or message us on WhatsApp with your area and pet
              details — our team confirms within minutes during operating hours.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href={bookingHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-white px-6 text-[14.5px] font-bold text-[#241b4b]"
              >
                Book a slot
                <ArrowRight className="h-4 w-4" />
              </Link>
              <TrackedExternalLink
                type="whatsapp"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                trackingCity={data.slug}
                trackingSource="city_final_cta"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366]/15 px-5 text-[14px] font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp us
              </TrackedExternalLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
