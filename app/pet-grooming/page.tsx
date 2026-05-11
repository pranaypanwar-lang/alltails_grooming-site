import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { CITY_LANDINGS, CITY_LANDING_SLUGS } from "@/lib/cities/data";
import { BUSINESS_INFO } from "@/lib/seo/businessInfo";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serviceSchema } from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Pet Grooming at Home | Cities Served | All Tails",
  description:
    "All Tails offers at-home pet grooming for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana and Patiala. Pick your city to book a doorstep session.",
  path: "/pet-grooming",
});

const REGION_GROUPS = [
  {
    region: "Delhi NCR",
    slugs: ["delhi", "gurgaon", "noida", "faridabad", "ghaziabad"] as const,
  },
  {
    region: "Chandigarh Tricity",
    slugs: ["chandigarh", "mohali", "panchkula"] as const,
  },
  {
    region: "Punjab",
    slugs: ["ludhiana", "patiala"] as const,
  },
] as const;

export default function PetGroomingIndexPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Pet grooming", path: "/pet-grooming" },
  ]);

  return (
    <SeoPageShell>
      <JsonLd data={[serviceSchema(), breadcrumbs]} />

      <main className="relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[120px] -top-[120px] h-[400px] w-[400px] rounded-full bg-[#e9defa] opacity-60 blur-[110px]"
        />
        <div className="relative mx-auto max-w-[1100px] px-5 pb-24 pt-12 lg:px-8 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#8a82a3]">
            <Link href="/" className="hover:text-[#5b49c8]">
              Home
            </Link>
            <span className="px-1.5 text-[#cfc7df]">/</span>
            <span className="text-[#241b4b]">Pet grooming</span>
          </nav>

          <span className="mt-6 inline-flex rounded-full border border-[#e8ddff] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5ce0]">
            Cities served
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.035em] text-[#241b4b] lg:text-[48px]">
            Pet grooming at home.
            <br />
            <span className="text-[#6d5bd0]">Pick your city.</span>
          </h1>
          <p className="mt-5 max-w-[680px] text-[15.5px] font-medium leading-[1.75] text-[#4f475f]">
            All Tails offers doorstep grooming for dogs and cats across {CITY_LANDING_SLUGS.length} cities. Trained groomers carry every tool and product to your home — same-day slots are usually available in our main cities. Pick yours below.
          </p>

          {REGION_GROUPS.map((group) => (
            <section key={group.region} className="mt-12">
              <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#241b4b]">
                {group.region}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.slugs.map((slug) => {
                  const city = CITY_LANDINGS[slug];
                  if (!city) return null;
                  return (
                    <Link
                      key={slug}
                      href={`/pet-grooming/${slug}`}
                      className="group flex items-center justify-between rounded-[20px] border border-[#ece4f8] bg-white p-5 shadow-[0_10px_28px_rgba(38,28,70,0.05)] transition hover:border-[#cabbf3] hover:shadow-[0_14px_36px_rgba(109,91,208,0.10)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f1ff] text-[#6d5bd0]">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[15.5px] font-bold text-[#241b4b]">
                            Pet grooming in {city.displayName}
                          </div>
                          <div className="mt-1 text-[12.5px] font-medium text-[#8a82a3]">
                            {city.areas.slice(0, 3).join(" · ")}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#9088b8] transition group-hover:text-[#6d5bd0]" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Contact strip */}
          <section className="mt-16 rounded-[28px] border border-[#ece4f8] bg-white p-6 lg:p-8">
            <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#241b4b]">
              Don&apos;t see your city?
            </h2>
            <p className="mt-2 max-w-[640px] text-[14px] font-medium leading-[1.7] text-[#6b7280]">
              We service {BUSINESS_INFO.serviceAreas.length} cities directly and route through nearby zones based on team availability. WhatsApp us with your area and we&apos;ll confirm whether we can groom your pet there.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#241b4b] px-5 text-[13.5px] font-semibold text-white"
              >
                Contact us
              </Link>
              <Link
                href="/packages"
                className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#ded7f1] bg-white px-5 text-[13.5px] font-semibold text-[#5b49c8]"
              >
                View packages
              </Link>
            </div>
          </section>
        </div>
      </main>
    </SeoPageShell>
  );
}
