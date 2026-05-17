import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { whatsappHref } from "@/lib/seo/businessInfo";

import { ArticleBodyComposition } from "@/app/components/blogs/ArticleComposition";
import { JsonLd } from "@/app/components/seo/JsonLd";
import {
  blogHeadings,
  normalizeBlogImageUrl,
  parseBlogDocument,
} from "@/lib/content/blogFormat";
import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from "@/lib/content/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema, faqPageSchema, howToSchema } from "@/lib/seo/schema";
import { ArticleReadingTools, MobileReadingProgressBar, MobileShareStrip } from "./ArticleReadingTools";
import { Breadcrumbs } from "@/app/components/seo/Breadcrumbs";
import { BlogReadTracker } from "@/app/components/analytics/BlogReadTracker";

function slugifyHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPublishedAt(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  const document = parseBlogDocument(post.body);
  const ogImage = normalizeBlogImageUrl(document.heroImageUrl || post.coverImageUrl);
  const metadata = pageMetadata({
    title: document.seoTitle || post.title,
    description: document.metaDescription || post.excerpt,
    path: `/blogs/${post.slug}`,
    ogImage: ogImage || undefined,
  });
  if (document.seoTitle) {
    metadata.title = { absolute: document.seoTitle };
  }
  return metadata;
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const document = parseBlogDocument(post.body);
  const metaDescription = document.metaDescription || post.excerpt;
  const heroImage =
    normalizeBlogImageUrl(document.heroImageUrl || post.coverImageUrl) || "/images/Banner.jpg";
  const headings = blogHeadings(post.body).map((heading) => ({
    ...heading,
    id: slugifyHeading(heading.text),
  }));
  const publishedAt = formatPublishedAt(post.publishedAt);
  const lastReviewed = formatPublishedAt(post.updatedAt);

  const relatedPosts = (await getPublishedBlogPosts())
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((left, right) => {
      const leftScore =
        Number(left.category === post.category) * 2 +
        Number(parseBlogDocument(left.body).primaryKeyword === document.primaryKeyword);
      const rightScore =
        Number(right.category === post.category) * 2 +
        Number(parseBlogDocument(right.body).primaryKeyword === document.primaryKeyword);
      return rightScore - leftScore;
    })
    .slice(0, 3)
    .map((candidate) => ({
      slug: candidate.slug,
      title: candidate.title,
      excerpt: candidate.excerpt,
      category: candidate.category,
      coverImage:
        normalizeBlogImageUrl(parseBlogDocument(candidate.body).heroImageUrl || candidate.coverImageUrl) ||
        "/images/Banner.jpg",
      readTimeMinutes: candidate.readTimeMinutes,
    }));
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/blogs" },
    { name: post.title, path: `/blogs/${post.slug}` },
  ]);

  const wordCount = document.blocks
    .map((b) => {
      if (b.type === "paragraph" || b.type === "heading" || b.type === "callout") return b.text;
      if (b.type === "list") return b.items.join(" ");
      return "";
    })
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  const article = articleSchema({
    slug: post.slug,
    title: post.title,
    description: metaDescription,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coverImageUrl: heroImage,
    wordCount,
  });

  const faqSchema = document.faqs?.length
    ? faqPageSchema(document.faqs.map((faq) => ({ q: faq.question, a: faq.answer })))
    : null;

  // Detect step-by-step posts and generate HowTo schema from heading+paragraph pairs
  const isHowTo = /how\s+to|step.by.step|what happens|how.*groom|how.*reduce|how.*prepare/i.test(post.title);
  const howTo = isHowTo && document.blocks.length > 3
    ? (() => {
        const steps: { name: string; text: string }[] = [];
        let currentHeading = "";
        for (const block of document.blocks) {
          if (block.type === "heading") { currentHeading = block.text; continue; }
          if (block.type === "paragraph" && currentHeading) {
            steps.push({ name: currentHeading, text: block.text });
            currentHeading = "";
          }
        }
        return steps.length >= 3
          ? howToSchema({ name: post.title, description: metaDescription, steps: steps.slice(0, 8), image: heroImage })
          : null;
      })()
    : null;

  return (
    <main className="min-h-screen bg-[#fcfbff]">
      <MobileReadingProgressBar headings={headings} />
      <JsonLd data={[article, breadcrumbs, ...(faqSchema ? [faqSchema] : []), ...(howTo ? [howTo] : [])]} />
      <BlogReadTracker slug={post.slug} title={post.title} readTimeMinutes={post.readTimeMinutes ?? 6} />

      <article>
        <header className="overflow-hidden bg-[#1c1630] px-4 pb-8 pt-6 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <Breadcrumbs
              items={[
                { name: "Home", path: "/" },
                { name: "Guides", path: "/blogs" },
                { name: post.title, path: `/blogs/${post.slug}` },
              ]}
              className="text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_span[aria-current]]:text-white/90"
            />
            <Link
              href="/blogs"
              className="mt-3 inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/84"
            >
              Pet grooming guides
            </Link>

            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
              <div className="max-w-[760px]">
                <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/70">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {post.category || "All Tails"}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {post.readTimeMinutes} min read
                  </span>
                  {document.primaryKeyword ? (
                    <span className="hidden rounded-full bg-white/10 px-3 py-1 sm:inline-flex">
                      {document.primaryKeyword}
                    </span>
                  ) : null}
                  {publishedAt ? (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      Published {publishedAt}
                    </span>
                  ) : null}
                  {lastReviewed ? (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      Reviewed {lastReviewed}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-4 text-[34px] font-black leading-[1.02] tracking-[-0.05em] text-white sm:text-[48px] lg:text-[62px]">
                  {post.title}
                </h1>
                <p className="mt-4 max-w-[720px] text-[16px] leading-[1.82] text-white/76 sm:text-[19px]">
                  {post.excerpt}
                </p>
              </div>

              <div className="hidden rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur-sm lg:block">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
                  Why this guide matters
                </div>
                <p className="mt-3 text-[15px] leading-[1.8] text-white/78">
                  Clear answers, fixed package context, and grooming advice that matches how pet parents actually search before booking.
                </p>
                {headings.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {headings.slice(0, 3).map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-semibold text-white/82"
                      >
                        {heading.text}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="-mt-2 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[32px] border border-white/12 bg-[#e8defd] shadow-[0_30px_90px_rgba(41,28,70,0.24)] sm:aspect-[16/9]">
              <Image src={heroImage} alt={post.title} fill priority className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,16,39,0.06)_0%,rgba(23,16,39,0.1)_52%,rgba(23,16,39,0.28)_100%)]" />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="space-y-8">
                <ArticleBodyComposition blocks={document.blocks} faqs={document.faqs || []} headings={headings} />

                {/* Author bio */}
                <div className="rounded-[24px] border border-[#ece5ff] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(73,44,120,0.05)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4efff] text-[20px]">
                      🐾
                    </div>
                    <div>
                      <div className="text-[13px] font-black uppercase tracking-[0.13em] text-[#8a82a3]">Written by</div>
                      <div className="text-[16px] font-bold text-[#241c3f]">All Tails Editorial Team</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-[1.75] text-[#5f6673]">
                    Our editorial team consists of professional pet groomers and pet-care researchers who write clear, practical guides based on real grooming sessions across Delhi NCR, Chandigarh Tricity, Ludhiana, and Patiala.
                  </p>
                </div>

                {/* Back to guides — mobile only */}
                <div className="lg:hidden">
                  <Link
                    href="/blogs"
                    className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]"
                  >
                    <span aria-hidden="true">←</span>
                    All guides
                  </Link>
                </div>

                {/* Mobile booking CTA — shown after article, mobile only */}
                <div className="overflow-hidden rounded-[28px] bg-[#1a1033] shadow-[0_20px_55px_rgba(20,10,50,0.28)] lg:hidden">
                  <div className="relative p-5">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-8 -top-8 h-[160px] w-[160px] rounded-full bg-[#6d5bd0]/30 blur-[60px]"
                    />
                    <div className="relative">
                      <div className="inline-flex rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        Doorstep service
                      </div>
                      <p className="mt-3 text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-white">
                        Leave the grooming to us.
                      </p>
                      <p className="mt-2 text-[13.5px] leading-[1.65] text-white/65">
                        Trained groomers at your home — packages from ₹999. Pay online or after the session.
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        <Link
                          href="/booking"
                          className="flex h-[48px] items-center justify-center rounded-[16px] bg-[#6d5bd0] text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(109,91,208,0.35)] transition active:scale-[0.98]"
                        >
                          Book a session — from ₹999
                        </Link>
                        <a
                          href={`${whatsappHref}?text=${encodeURIComponent("Hi All Tails, I read one of your grooming guides and I'm interested in booking a session.")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-[44px] items-center justify-center gap-2 rounded-[16px] border border-white/[0.14] bg-white/[0.06] text-[13.5px] font-semibold text-white/90 transition active:scale-[0.98]"
                        >
                          Chat on WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile share strip — shown after the article, before related posts */}
                <MobileShareStrip title={post.title} />

                {relatedPosts.length ? (
                  <section className="rounded-[30px] border border-[#ece5ff] bg-white px-5 py-6 shadow-[0_16px_42px_rgba(73,44,120,0.04)] sm:px-8 sm:py-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a84a3]">
                          Keep reading
                        </div>
                        <h2 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-[#241c3f]">
                          More guides in the same flow
                        </h2>
                      </div>
                      <Link
                        href="/blogs"
                        className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]"
                      >
                        View all guides
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      {relatedPosts.map((relatedPost) => (
                        <article
                          key={relatedPost.slug}
                          className="overflow-hidden rounded-[24px] border border-[#ebe5ff] bg-white shadow-[0_16px_42px_rgba(73,44,120,0.05)]"
                        >
                          <div className="relative aspect-[16/10] overflow-hidden bg-[#eee7ff]">
                            <Image
                              src={relatedPost.coverImage}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="p-5">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a84a3]">
                              {relatedPost.category || "All Tails"} · {relatedPost.readTimeMinutes} min read
                            </div>
                            <h3 className="mt-3 text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-[#241c3f]">
                              {relatedPost.title}
                            </h3>
                            <p className="mt-3 text-[14px] leading-[1.75] text-[#626b80]">
                              {relatedPost.excerpt}
                            </p>
                            <Link
                              href={`/blogs/${relatedPost.slug}`}
                              className="mt-5 inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]"
                            >
                              Open guide
                              <span aria-hidden="true">→</span>
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>

            <aside className="hidden space-y-5 lg:sticky lg:top-6 lg:block lg:self-start">
              <ArticleReadingTools title={post.title} excerpt={post.excerpt} headings={headings} />
              <div className="overflow-hidden rounded-[28px] bg-[#1a1033] shadow-[0_20px_55px_rgba(20,10,50,0.28)]">
                <div className="relative p-5">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-6 -top-6 h-[130px] w-[130px] rounded-full bg-[#6d5bd0]/30 blur-[50px]"
                  />
                  <div className="relative">
                    <div className="text-[10.5px] font-black uppercase tracking-[0.18em] text-white/55">
                      Doorstep service
                    </div>
                    <p className="mt-3 text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-white">
                      Leave the grooming to us.
                    </p>
                    <p className="mt-2.5 text-[13px] leading-[1.7] text-white/65">
                      Packages from ₹999 — pay online or after the session.
                    </p>
                    <Link
                      href="/booking"
                      className="mt-5 flex h-[46px] items-center justify-center rounded-full bg-[#6d5bd0] text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(109,91,208,0.35)]"
                    >
                      Book a session
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </article>
    </main>
  );
}
