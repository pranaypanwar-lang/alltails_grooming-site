import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleBodyComposition } from "@/app/components/blogs/ArticleComposition";
import { JsonLd } from "@/app/components/seo/JsonLd";
import {
  blogHeadings,
  normalizeBlogImageUrl,
  parseBlogDocument,
} from "@/lib/content/blogFormat";
import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from "@/lib/content/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema, faqPageSchema } from "@/lib/seo/schema";
import { ArticleReadingTools, MobileReadingProgressBar, MobileShareStrip } from "./ArticleReadingTools";

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

  const article = articleSchema({
    slug: post.slug,
    title: post.title,
    description: metaDescription,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coverImageUrl: heroImage,
  });
  const faqSchema = document.faqs?.length
    ? faqPageSchema(document.faqs.map((faq) => ({ q: faq.question, a: faq.answer })))
    : null;

  return (
    <main className="min-h-screen bg-[#fcfbff]">
      <MobileReadingProgressBar headings={headings} />
      <JsonLd data={faqSchema ? [article, breadcrumbs, faqSchema] : [article, breadcrumbs]} />

      <article>
        <header className="overflow-hidden bg-[#1c1630] px-4 pb-8 pt-6 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <Link
              href="/blogs"
              className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/84"
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
                      {publishedAt}
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
              <Image src={heroImage} alt={post.title} fill priority unoptimized className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,16,39,0.06)_0%,rgba(23,16,39,0.1)_52%,rgba(23,16,39,0.28)_100%)]" />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="space-y-8">
                <ArticleBodyComposition blocks={document.blocks} faqs={document.faqs || []} headings={headings} />

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
                <div className="rounded-[28px] bg-[#241c3f] p-5 text-white shadow-[0_20px_55px_rgba(36,28,63,0.20)] lg:hidden">
                  <div className="text-[12px] font-black uppercase tracking-[0.16em] text-white/60">
                    Book at home
                  </div>
                  <div className="mt-3 text-[24px] font-black tracking-[-0.03em]">
                    Dog grooming starts at Rs 999
                  </div>
                  <p className="mt-3 text-[14px] leading-[1.7] text-white/74">
                    Fixed package pricing, trained groomers, and a Rs 250 deposit to confirm your slot.
                  </p>
                  <Link
                    href="/booking-preview"
                    className="mt-5 inline-flex h-[46px] w-full items-center justify-center rounded-full bg-white text-[14px] font-black text-[#241c3f]"
                  >
                    Book grooming
                  </Link>
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
                              unoptimized
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
              <div className="rounded-[28px] bg-[#241c3f] p-5 text-white shadow-[0_20px_55px_rgba(36,28,63,0.20)]">
                <div className="text-[12px] font-black uppercase tracking-[0.16em] text-white/60">
                  Book at home
                </div>
                <div className="mt-3 text-[26px] font-black tracking-[-0.03em]">
                  Dog grooming starts at Rs 999
                </div>
                <p className="mt-3 text-[14px] leading-[1.7] text-white/74">
                  Fixed package pricing, trained groomers, and a Rs 250 deposit to confirm your slot.
                </p>
                <Link
                  href="/booking-preview"
                  className="mt-5 inline-flex h-[46px] w-full items-center justify-center rounded-full bg-white text-[14px] font-black text-[#241c3f]"
                >
                  Book grooming
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </article>
    </main>
  );
}
