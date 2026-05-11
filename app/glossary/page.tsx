import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { GLOSSARY_ENTRIES, GLOSSARY_SLUGS } from "@/lib/glossary/data";
import { SITE_URL } from "@/lib/seo/businessInfo";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Pet Grooming Glossary | What's Included, How It Works | All Tails",
  description:
    "Short, plain-English definitions of pet grooming terms — dog grooming, cat grooming, hygiene haircut, de-shedding, dental hygiene and more. Built for clarity.",
  path: "/glossary",
});

export default function GlossaryIndexPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Glossary", path: "/glossary" },
  ]);

  // Collection of DefinedTerm entries — declares this page as a glossary
  // index, helps AI engines understand the scope and surface entries in
  // "what is X" answers.
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/glossary#set`,
    name: "All Tails pet grooming glossary",
    description:
      "Definitions of common pet grooming terms used by All Tails — at-home doorstep grooming for dogs and cats.",
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: GLOSSARY_SLUGS.map((slug) => {
      const entry = GLOSSARY_ENTRIES[slug];
      return {
        "@type": "DefinedTerm",
        "@id": `${SITE_URL}/glossary/${slug}#term`,
        name: entry.term,
        description: entry.shortAnswer,
        url: `${SITE_URL}/glossary/${slug}`,
      };
    }),
  };

  return (
    <SeoPageShell>
      <JsonLd data={[breadcrumbs, collectionSchema]} />

      <main className="relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[140px] -top-[120px] h-[420px] w-[420px] rounded-full bg-[#e9defa] opacity-70 blur-[110px]"
        />

        <div className="relative mx-auto max-w-[1000px] px-5 pb-24 pt-12 lg:px-8 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#8a82a3]">
            <Link href="/" className="hover:text-[#5b49c8]">
              Home
            </Link>
            <span className="px-1.5 text-[#cfc7df]">/</span>
            <span className="text-[#241b4b]">Glossary</span>
          </nav>

          <section className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8ddff] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5ce0]">
              <BookOpen className="h-3.5 w-3.5" />
              Glossary
            </span>
            <h1 className="mt-5 max-w-[820px] text-[34px] font-black leading-[1.1] tracking-[-0.035em] text-[#241b4b] lg:text-[44px]">
              Pet grooming, in plain English.
            </h1>
            <p className="mt-5 max-w-[700px] text-[15.5px] font-medium leading-[1.75] text-[#4f475f]">
              Short definitions of the terms you&apos;ll see on our packages, FAQs and booking flow. We wrote each one for clarity — no jargon, no marketing fluff, just what the thing actually is.
            </p>
          </section>

          <section className="mt-12 grid gap-3">
            {GLOSSARY_SLUGS.map((slug) => {
              const entry = GLOSSARY_ENTRIES[slug];
              return (
                <Link
                  key={slug}
                  href={`/glossary/${slug}`}
                  className="group rounded-[20px] border border-[#ece4f8] bg-white p-5 shadow-[0_8px_22px_rgba(38,28,70,0.04)] transition hover:border-[#cabbf3] hover:shadow-[0_14px_36px_rgba(109,91,208,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-bold text-[#241b4b]">
                        {entry.term}
                      </h2>
                      <p className="mt-2 text-[13.5px] font-medium leading-[1.7] text-[#5f5878]">
                        {entry.shortAnswer}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#9088b8] transition group-hover:text-[#6d5bd0]" />
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      </main>
    </SeoPageShell>
  );
}
