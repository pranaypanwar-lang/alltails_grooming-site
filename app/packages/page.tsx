import Link from "next/link";
import { Check, MessageCircle, Minus } from "lucide-react";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { TrackedExternalLink } from "../components/analytics/TrackedExternalLink";
import { INDIVIDUAL_SESSION_SERVICES, SERVICE_OPTIONS } from "@/lib/booking/constants";
import { pageMetadata } from "@/lib/seo/metadata";
import { SITE_URL, whatsappHref } from "@/lib/seo/businessInfo";
import {
  breadcrumbSchema,
  packageOfferCatalogSchema,
  serviceSchema,
} from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Pet Grooming Packages and Prices",
  description:
    "Compare All Tails at-home pet grooming packages, prices, inclusions, and add-ons. Choose the right grooming session for your dog or cat.",
  path: "/packages",
});

const COAT_CARE_PLANS = SERVICE_OPTIONS.filter(
  (service) => service.category === "Coat Care Plans"
).sort((a, b) => a.order - b.order);

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function PackagesPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Packages", path: "/packages" },
  ]);

  // Build AggregateOffer + per-package Offer schema for SERP rich snippets
  // — surfaces "₹999 – ₹14,999" pricing in the Google result for /packages
  // and lets each package show with its own price when long-tail queries
  // hit. Includes both individual sessions and coat care plans so the
  // range is honest.
  const allPackages = [...INDIVIDUAL_SESSION_SERVICES, ...COAT_CARE_PLANS];
  const offerCatalog = packageOfferCatalogSchema(
    allPackages.map((pkg) => ({
      name: pkg.name,
      description: pkg.shortDescription,
      price: pkg.price,
      duration: pkg.duration,
      url: `${SITE_URL}/packages#${slugify(pkg.name)}`,
    }))
  );

  return (
    <SeoPageShell>
      <JsonLd data={[serviceSchema(), breadcrumbs, ...(offerCatalog ? [offerCatalog] : [])]} />

      <section className="mx-auto max-w-[1100px] px-5 py-14 lg:px-8 lg:py-20">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
            Packages
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.04em] text-[#2a2346] lg:text-[44px]">
            Pet Grooming Packages and Prices
          </h1>
          <p className="mx-auto mt-4 max-w-[720px] text-[16px] leading-[1.8] text-[#6b7280]">
            Choose an at-home grooming package based on your pet&apos;s coat,
            comfort, and care needs. All sessions are handled by trained
            groomers at your doorstep.
          </p>
        </div>

        <h2 className="sr-only">Individual grooming sessions</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDIVIDUAL_SESSION_SERVICES.map((service) => {
            const slug = slugify(service.name);
            return (
              <article
                key={service.name}
                className="flex h-full flex-col rounded-[28px] border border-[#ece5fb] bg-white p-7 shadow-[0_18px_50px_rgba(34,22,74,0.06)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(34,22,74,0.1)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[20px] font-black tracking-[-0.02em] text-[#2a2346]">
                    {service.name}
                  </h3>
                  {service.badge ? (
                    <span className="rounded-full bg-[#f4efff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">
                      {service.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">
                  {service.shortDescription}
                </p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-[28px] font-black tracking-[-0.03em] text-[#2a2346]">
                    ₹{service.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[13px] text-[#6b7280]">
                    · {service.duration}
                  </span>
                </div>
                <ul className="mt-5 space-y-2">
                  {service.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2 text-[14px] leading-[1.6] text-[#3a3458]"
                    >
                      <span aria-hidden className="mt-1 text-[#6d5bd0]">
                        •
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {service.clarityNote ? (
                  <p className="mt-4 rounded-[14px] bg-[#faf8ff] px-4 py-3 text-[12px] leading-[1.6] text-[#5f6673]">
                    {service.clarityNote}
                  </p>
                ) : null}
                <Link
                  href={`/booking?package=${slug}`}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[#6d5bd0] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(109,91,208,0.3)] hover:bg-[#5f4fc2]"
                >
                  Book this package
                </Link>
              </article>
            );
          })}
        </div>

        <section className="mt-20">
          <h2 className="text-[26px] font-black tracking-[-0.03em] text-[#2a2346] lg:text-[32px]">
            Coat care plans
          </h2>
          <p className="mt-2 max-w-[720px] text-[15px] leading-[1.8] text-[#6b7280]">
            Multi-session plans for pet parents who want a steady grooming
            rhythm. Plan inclusions are confirmed by the team before
            scheduling.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COAT_CARE_PLANS.map((plan) => {
              const slug = slugify(plan.name);
              return (
                <article
                  key={plan.name}
                  className="flex h-full flex-col rounded-[28px] border border-[#ece5fb] bg-white p-7 shadow-[0_18px_50px_rgba(34,22,74,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[20px] font-black tracking-[-0.02em] text-[#2a2346]">
                      {plan.name}
                    </h3>
                    {plan.badge ? (
                      <span className="rounded-full bg-[#f4efff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">
                    {plan.shortDescription}
                  </p>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-[28px] font-black tracking-[-0.03em] text-[#2a2346]">
                      ₹{plan.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[13px] text-[#6b7280]">
                      · {plan.duration}
                    </span>
                  </div>
                  <ul className="mt-5 space-y-2">
                    {plan.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-2 text-[14px] leading-[1.6] text-[#3a3458]"
                      >
                        <span aria-hidden className="mt-1 text-[#6d5bd0]">
                          •
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/booking?package=${slug}`}
                    className="mt-6 inline-flex items-center justify-center rounded-full border border-[#cdbcf5] bg-white px-5 py-3 text-[14px] font-semibold text-[#5f4fc2] hover:bg-[#f4efff]"
                  >
                    Book this plan
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-20 rounded-[28px] bg-white p-8 shadow-[0_18px_50px_rgba(34,22,74,0.06)] lg:p-12">
          <h2 className="text-[24px] font-black tracking-[-0.03em] text-[#2a2346] lg:text-[28px]">
            What&apos;s included in each package
          </h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">
            Every package builds on the previous — you always get everything from the tier below plus more.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-[#ece5fb]">
                  <th className="pb-4 pr-4 text-[13px] font-semibold text-[#8a82a3]">Feature</th>
                  <th className="pb-4 px-4 text-center text-[13px] font-black text-[#241b4b]">
                    Essential Care<br /><span className="text-[16px] text-[#6d5bd0]">₹999</span>
                  </th>
                  <th className="pb-4 px-4 text-center text-[13px] font-black text-[#241b4b]">
                    <span className="inline-flex flex-col items-center">
                      <span className="rounded-full bg-[#f4efff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Most booked</span>
                      Signature Care<br /><span className="text-[16px] text-[#6d5bd0]">₹1,299</span>
                    </span>
                  </th>
                  <th className="pb-4 pl-4 text-center text-[13px] font-black text-[#241b4b]">
                    Complete Pampering<br /><span className="text-[16px] text-[#6d5bd0]">₹1,799</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3effc]">
                {[
                  { feature: "Bath + blow dry", essential: true, signature: true, complete: true },
                  { feature: "Brushing + de-tangling", essential: true, signature: true, complete: true },
                  { feature: "Nail trim", essential: true, signature: true, complete: true },
                  { feature: "Ear cleaning", essential: true, signature: true, complete: true },
                  { feature: "Hygiene haircut", essential: false, signature: true, complete: true },
                  { feature: "Dental hygiene", essential: false, signature: true, complete: true },
                  { feature: "Full body haircut + styling", essential: false, signature: false, complete: true },
                  { feature: "Paw butter", essential: false, signature: false, complete: true },
                  { feature: "Hair serum + perfume finish", essential: false, signature: false, complete: true },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3.5 pr-4 text-[13.5px] font-medium text-[#3a3458]">{row.feature}</td>
                    {[row.essential, row.signature, row.complete].map((included, i) => (
                      <td key={i} className="px-4 py-3.5 text-center">
                        {included
                          ? <Check className="mx-auto h-4 w-4 text-[#6d5bd0]" strokeWidth={2.8} />
                          : <Minus className="mx-auto h-4 w-4 text-[#d1cce8]" strokeWidth={2} />
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 rounded-[28px] bg-gradient-to-br from-[#6d5bd0] to-[#5f4fc2] p-8 text-white lg:p-12">
          <h2 className="text-[24px] font-black tracking-[-0.03em] lg:text-[30px]">
            Ready to book a grooming session?
          </h2>
          <p className="mt-3 max-w-[640px] text-[15px] leading-[1.7] text-white/85">
            Choose a package, share your city and date, and our team will
            confirm your slot. Or WhatsApp us — we&apos;ll help you pick.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#5f4fc2] hover:bg-[#f4efff]"
            >
              Check available slots
            </Link>
            <TrackedExternalLink
              type="whatsapp"
              href={`${whatsappHref}?text=${encodeURIComponent("Hi All Tails, I'd like help choosing a grooming package.")}`}
              target="_blank"
              rel="noopener noreferrer"
              trackingSource="packages_cta"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp us
            </TrackedExternalLink>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-[14px] font-semibold text-white hover:bg-white/10"
            >
              Read package FAQs
            </Link>
          </div>
        </section>
      </section>
    </SeoPageShell>
  );
}
