import Link from "next/link";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { INDIVIDUAL_SESSION_SERVICES } from "@/lib/booking/constants";
import {
  BUSINESS_INFO,
  whatsappHref,
} from "@/lib/seo/businessInfo";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  serviceSchema,
} from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Book At-Home Pet Grooming",
  description:
    "Book an at-home pet grooming session with All Tails. Choose a package, check available slots, add pet details, and confirm your grooming session.",
  path: "/booking",
});

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function BookingPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Book", path: "/booking" },
  ]);

  return (
    <SeoPageShell>
      <JsonLd data={[serviceSchema(), breadcrumbs]} />

      <section className="mx-auto max-w-[960px] px-5 py-14 lg:px-8 lg:py-20">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
            Book
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.04em] text-[#2a2346] lg:text-[44px]">
            Book At-Home Pet Grooming
          </h1>
          <p className="mx-auto mt-4 max-w-[720px] text-[16px] leading-[1.8] text-[#6b7280]">
            Choose a grooming package, check available slots, and confirm a
            doorstep grooming session for your dog or cat.
          </p>
          <p className="mx-auto mt-3 max-w-[600px] text-[13px] uppercase tracking-[0.18em] text-[#7a5ce0]">
            Gentle handling · Trained groomers · Doorstep convenience
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/?book=1"
            className="inline-flex items-center justify-center rounded-full bg-[#6d5bd0] px-7 py-4 text-[15px] font-semibold text-white shadow-[0_14px_36px_rgba(109,91,208,0.32)] hover:bg-[#5f4fc2]"
          >
            Start booking
          </Link>
          <p className="text-[12px] text-[#6b7280]">
            Or pick a package below to start with it pre-selected.
          </p>
        </div>

        <section className="mt-14">
          <h2 className="text-[22px] font-black tracking-[-0.03em] text-[#2a2346] lg:text-[26px]">
            Start with a package
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {INDIVIDUAL_SESSION_SERVICES.map((service) => {
              const slug = slugify(service.name);
              return (
                <Link
                  key={service.name}
                  href={`/?book=${slug}`}
                  className="flex flex-col rounded-[24px] border border-[#ece5fb] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(34,22,74,0.1)]"
                >
                  <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#2a2346]">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">
                    {service.shortDescription}
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-[20px] font-black tracking-[-0.02em] text-[#2a2346]">
                      ₹{service.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[12px] text-[#6b7280]">
                      · {service.duration}
                    </span>
                  </div>
                  <span className="mt-5 text-[13px] font-semibold text-[#6d5bd0]">
                    Book this package →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-14 rounded-[28px] bg-white p-8 shadow-[0_18px_50px_rgba(34,22,74,0.06)] lg:p-12">
          <h2 className="text-[22px] font-black tracking-[-0.03em] text-[#2a2346] lg:text-[26px]">
            How booking works
          </h2>
          <ol className="mt-6 space-y-5">
            {[
              {
                title: "Choose a package",
                body: "Pick the grooming package that matches your pet’s coat and care needs.",
              },
              {
                title: "Share city and date",
                body: "Tell us where and when you’d like the groomer to visit.",
              },
              {
                title: "Confirm your slot",
                body: "Add your details, choose a payment option, and confirm the booking.",
              },
              {
                title: "Doorstep grooming",
                body: "Our groomer arrives during your booked window with all required tools and products.",
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f4efff] text-[14px] font-bold text-[#6d5bd0]">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-[#2a2346]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-[1.7] text-[#6b7280]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 rounded-[24px] border border-[#ece5fb] bg-white p-7">
          <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#2a2346]">
            Need help booking?
          </h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">
            If you can’t find a slot for your preferred date, message us on
            WhatsApp and our team will help you confirm.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-[#cdbcf5] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#5f4fc2] hover:bg-[#f4efff]"
            >
              WhatsApp us
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full bg-[#6d5bd0] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#5f4fc2]"
            >
              Other ways to contact
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-[#6b7280]">
            Booking team available {BUSINESS_INFO.hours.toLowerCase()}.
          </p>
        </section>
      </section>
    </SeoPageShell>
  );
}
