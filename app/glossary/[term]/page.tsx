import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";

import { JsonLd } from "@/app/components/seo/JsonLd";
import { SeoPageShell } from "@/app/components/seo/SeoPageShell";
import {
  GLOSSARY_ENTRIES,
  GLOSSARY_SLUGS,
  getGlossaryEntry,
} from "@/lib/glossary/data";
import { SITE_URL } from "@/lib/seo/businessInfo";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";

export function generateStaticParams() {
  return GLOSSARY_SLUGS.map((term) => ({ term }));
}

type Params = { term: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { term } = await params;
  const entry = getGlossaryEntry(term);
  if (!entry) return {};

  return pageMetadata({
    title: `${entry.term} — Pet Grooming Glossary | All Tails`,
    description: entry.shortAnswer.slice(0, 155),
    path: `/glossary/${entry.slug}`,
  });
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { term } = await params;
  const entry = getGlossaryEntry(term);
  if (!entry) {
    notFound();
  }

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Glossary", path: "/glossary" },
    { name: entry.term, path: `/glossary/${entry.slug}` },
  ]);

  // DefinedTerm — the schema type AI engines pick up for "what is X" answers.
  // inDefinedTermSet links back to the glossary index so Google understands
  // this is part of a coherent collection, not an orphan page.
  const definedTermSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${SITE_URL}/glossary/${entry.slug}#term`,
    name: entry.term,
    description: entry.shortAnswer,
    url: `${SITE_URL}/glossary/${entry.slug}`,
    inDefinedTermSet: `${SITE_URL}/glossary#set`,
    ...(entry.alternateTerms?.length
      ? { alternateName: entry.alternateTerms }
      : {}),
  };

  return (
    <SeoPageShell>
      <JsonLd data={[breadcrumbs, definedTermSchema]} />

      <main className="relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[120px] -top-[120px] h-[380px] w-[380px] rounded-full bg-[#e9defa] opacity-60 blur-[110px]"
        />

        <div className="relative mx-auto max-w-[820px] px-5 pb-24 pt-12 lg:px-8 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#8a82a3]">
            <Link href="/" className="hover:text-[#5b49c8]">
              Home
            </Link>
            <span className="px-1.5 text-[#cfc7df]">/</span>
            <Link href="/glossary" className="hover:text-[#5b49c8]">
              Glossary
            </Link>
            <span className="px-1.5 text-[#cfc7df]">/</span>
            <span className="text-[#241b4b]">{entry.term}</span>
          </nav>

          <article className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8ddff] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5ce0]">
              <BookOpen className="h-3.5 w-3.5" />
              Glossary
            </span>
            <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.035em] text-[#241b4b] lg:text-[44px]">
              {entry.term}
            </h1>

            {/* The lead — short, direct, citation-friendly. AI engines lift this
                line verbatim for "what is X" queries. */}
            <p className="mt-6 text-[16px] font-semibold leading-[1.7] text-[#241b4b] lg:text-[17px]">
              {entry.shortAnswer}
            </p>

            {entry.alternateTerms?.length ? (
              <p className="mt-3 text-[12.5px] font-medium text-[#8a82a3]">
                Also known as: {entry.alternateTerms.join(", ")}.
              </p>
            ) : null}

            <div className="mt-8 space-y-5">
              {entry.details.map((para, index) => (
                <p
                  key={index}
                  className="text-[15px] font-medium leading-[1.85] text-[#4f475f]"
                >
                  {para}
                </p>
              ))}
            </div>

            {entry.notes && entry.notes.length > 0 ? (
              <aside className="mt-8 rounded-[20px] border border-[#f3d7a3] bg-[#fff8eb] p-5">
                <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#a36321]">
                  Notes
                </div>
                <ul className="mt-3 space-y-2 text-[13.5px] font-medium leading-[1.7] text-[#7a4a14]">
                  {entry.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </aside>
            ) : null}

            {entry.related && entry.related.length > 0 ? (
              <section className="mt-12 rounded-[24px] border border-[#ece4f8] bg-white p-6">
                <h2 className="text-[15.5px] font-bold text-[#241b4b]">Related terms</h2>
                <div className="mt-4 grid gap-2.5">
                  {entry.related
                    .map((slug) => GLOSSARY_ENTRIES[slug])
                    .filter(Boolean)
                    .map((related) => (
                      <Link
                        key={related.slug}
                        href={`/glossary/${related.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-[14px] border border-transparent px-2 py-2 text-[13.5px] font-medium text-[#4f475f] transition hover:border-[#ece4f8] hover:bg-[#fbfaff]"
                      >
                        <span>
                          <span className="font-bold text-[#241b4b]">
                            {related.term}
                          </span>
                          <span className="ml-1.5 text-[#8a82a3]">
                            — {related.shortAnswer.slice(0, 80)}…
                          </span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#9088b8] transition group-hover:text-[#6d5bd0]" />
                      </Link>
                    ))}
                </div>
              </section>
            ) : null}

            <div className="mt-12 rounded-[20px] border border-[#ded4f5] bg-[linear-gradient(135deg,#241b4b_0%,#3a2c6f_100%)] px-6 py-7 text-white">
              <h2 className="text-[17px] font-bold tracking-[-0.015em]">
                Ready to book a grooming session?
              </h2>
              <p className="mt-2 text-[13.5px] font-medium leading-[1.7] text-white/80">
                At-home grooming for dogs and cats across 10 cities. Packages from ₹999, ₹250 deposit slot block, trained groomers.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  href="/booking"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-white px-5 text-[13.5px] font-bold text-[#241b4b]"
                >
                  Book a slot
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/packages"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] bg-white/12 px-5 text-[13.5px] font-semibold text-white"
                >
                  View packages
                </Link>
              </div>
            </div>
          </article>
        </div>
      </main>
    </SeoPageShell>
  );
}
