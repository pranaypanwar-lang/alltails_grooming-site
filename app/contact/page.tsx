import Link from "next/link";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import {
  BUSINESS_INFO,
  emailMailto,
  phoneTel,
  whatsappHref,
} from "@/lib/seo/businessInfo";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  professionalServiceSchema,
} from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Contact All Tails | Phone, WhatsApp, Hours",
  description:
    "Contact All Tails for pet grooming bookings, package guidance, service-area support, and grooming questions by phone, WhatsApp, or email.",
  path: "/contact",
});

export default function ContactPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ]);

  return (
    <SeoPageShell>
      <JsonLd data={[professionalServiceSchema(), breadcrumbs]} />

      <section className="mx-auto max-w-[960px] px-5 py-14 lg:px-8 lg:py-20">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
            Contact
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.04em] text-[#2a2346] lg:text-[44px]">
            Contact All Tails
          </h1>
          <p className="mx-auto mt-4 max-w-[700px] text-[16px] leading-[1.8] text-[#6b7280]">
            Need help choosing a grooming package or booking a slot? Contact
            the All Tails team for support with at-home pet grooming, service
            areas, and appointment coordination.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <a
            href={phoneTel}
            className="rounded-[24px] border border-[#ece5fb] bg-white p-7 transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(34,22,74,0.1)]"
          >
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
              Phone
            </h2>
            <p className="mt-3 text-[20px] font-bold text-[#2a2346]">
              {BUSINESS_INFO.phoneDisplay}
            </p>
            <p className="mt-2 text-[13px] text-[#6b7280]">Tap to call</p>
          </a>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[24px] border border-[#ece5fb] bg-white p-7 transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(34,22,74,0.1)]"
          >
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
              WhatsApp
            </h2>
            <p className="mt-3 text-[20px] font-bold text-[#2a2346]">
              {BUSINESS_INFO.phoneDisplay}
            </p>
            <p className="mt-2 text-[13px] text-[#6b7280]">
              Chat with our booking team
            </p>
          </a>

          <a
            href={emailMailto}
            className="rounded-[24px] border border-[#ece5fb] bg-white p-7 transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(34,22,74,0.1)]"
          >
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
              Email
            </h2>
            <p className="mt-3 text-[20px] font-bold text-[#2a2346]">
              {BUSINESS_INFO.email}
            </p>
            <p className="mt-2 text-[13px] text-[#6b7280]">
              We reply during working hours
            </p>
          </a>

          <div className="rounded-[24px] border border-[#ece5fb] bg-white p-7">
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
              Hours
            </h2>
            <p className="mt-3 text-[20px] font-bold text-[#2a2346]">
              {BUSINESS_INFO.hours}
            </p>
            <p className="mt-2 text-[13px] text-[#6b7280]">
              Bookings handled during these hours
            </p>
          </div>
        </div>

        <section className="mt-16 rounded-[28px] bg-white p-8 shadow-[0_18px_50px_rgba(34,22,74,0.06)] lg:p-12">
          <h2 className="text-[22px] font-black tracking-[-0.03em] text-[#2a2346] lg:text-[26px]">
            How All Tails works
          </h2>
          <p className="mt-3 max-w-[680px] text-[15px] leading-[1.8] text-[#6b7280]">
            {BUSINESS_INFO.serviceModelDescription}
          </p>
        </section>

        <section className="mt-12 rounded-[28px] bg-white p-8 shadow-[0_18px_50px_rgba(34,22,74,0.06)] lg:p-12">
          <h2 className="text-[22px] font-black tracking-[-0.03em] text-[#2a2346] lg:text-[26px]">
            Service areas
          </h2>
          <p className="mt-3 max-w-[760px] text-[15px] leading-[1.8] text-[#6b7280]">
            We currently serve selected areas across{" "}
            {BUSINESS_INFO.serviceAreas.join(", ")}.
          </p>
        </section>

        <section className="mt-16 rounded-[28px] bg-gradient-to-br from-[#6d5bd0] to-[#5f4fc2] p-8 text-white lg:p-12">
          <h2 className="text-[24px] font-black tracking-[-0.03em] lg:text-[30px]">
            Book a grooming session
          </h2>
          <p className="mt-3 max-w-[640px] text-[15px] leading-[1.7] text-white/85">
            Choose a package, share your city and date, and our team will
            confirm your slot.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#5f4fc2] hover:bg-[#f4efff]"
            >
              Book pet grooming
            </Link>
            <Link
              href="/packages"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-[14px] font-semibold text-white hover:bg-white/10"
            >
              Compare packages
            </Link>
          </div>
        </section>
      </section>
    </SeoPageShell>
  );
}
