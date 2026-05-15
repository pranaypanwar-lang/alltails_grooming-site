import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/app/components/seo/JsonLd";
import {
  normalizeBlogImageUrl,
  parseBlogDocument,
  type BlogBlock,
  type BlogTable,
} from "@/lib/content/blogFormat";
import { getPublishedBlogPostBySlug } from "@/lib/content/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema, faqPageSchema } from "@/lib/seo/schema";

function BlogTableView({ table }: { table: BlogTable }) {
  return (
    <div className="my-7 overflow-hidden rounded-[22px] border border-[#e7ddff] bg-white shadow-[0_16px_36px_rgba(73,44,120,0.05)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[14px]">
          <thead className="bg-[#f7f1ff] text-[#2a2346]">
            <tr>
              {table.headers.map((header) => (
                <th key={header} className="px-4 py-3 font-black">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efe8ff] text-[#5f6474]">
            {table.rows.map((row, index) => (
              <tr key={`${row.join("-")}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlogBlockView({ block }: { block: BlogBlock }) {
  if (block.type === "heading") {
    const Heading = block.level === 3 ? "h3" : "h2";
    return (
      <Heading
        className={
          block.level === 3
            ? "mt-8 text-[22px] font-black tracking-[-0.02em] text-[#2a2346]"
            : "mt-10 text-[28px] font-black tracking-[-0.03em] text-[#2a2346]"
        }
      >
        {block.text}
      </Heading>
    );
  }

  if (block.type === "paragraph") {
    return <p className="mt-4 text-[16px] leading-[1.9] text-[#545a6c]">{block.text}</p>;
  }

  if (block.type === "list") {
    return (
      <ul className="mt-5 grid gap-2 text-[15px] leading-[1.75] text-[#545a6c] sm:grid-cols-2">
        {block.items.map((item) => (
          <li key={item} className="rounded-[16px] border border-[#eee7ff] bg-white px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "table") {
    return <BlogTableView table={block.table} />;
  }

  if (block.type === "image") {
    return (
      <figure className="my-8">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[26px] bg-[#efe8ff] shadow-[0_20px_48px_rgba(73,44,120,0.08)]">
          <Image src={normalizeBlogImageUrl(block.src) || "/images/Banner.jpg"} alt={block.alt} fill unoptimized className="object-cover" />
        </div>
        {block.caption ? (
          <figcaption className="mt-3 text-center text-[13px] leading-[1.6] text-[#7a728d]">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === "callout") {
    return (
      <div className="my-7 rounded-[24px] border border-[#eadfff] bg-[#f8f2ff] px-5 py-5 text-[#4d426f]">
        {block.title ? <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]">{block.title}</div> : null}
        <p className={block.title ? "mt-2 text-[16px] leading-[1.8]" : "text-[16px] leading-[1.8]"}>{block.text}</p>
      </div>
    );
  }

  return null;
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
  const seoTitle = document.seoTitle || post.title;
  const metaDescription = document.metaDescription || post.excerpt;
  const heroImage = normalizeBlogImageUrl(document.heroImageUrl || post.coverImageUrl) || "/images/Banner.jpg";
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
    <main className="min-h-screen bg-[#fbf8ff]">
      <JsonLd data={faqSchema ? [article, breadcrumbs, faqSchema] : [article, breadcrumbs]} />

      <article>
        <header className="px-4 pb-8 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[980px]">
            <Link href="/blogs" className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]">
              Pet grooming guides
            </Link>
            <h1 className="mt-5 text-[36px] font-black leading-[1.05] tracking-[-0.045em] text-[#241c3f] sm:text-[54px]">
              {post.title}
            </h1>
            <p className="mt-5 max-w-[760px] text-[17px] leading-[1.8] text-[#626b80] sm:text-[19px]">
              {post.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#7c7394]">
              <span className="rounded-full bg-white px-3 py-2">{post.category || "All Tails"}</span>
              <span className="rounded-full bg-white px-3 py-2">{post.readTimeMinutes} min read</span>
              {document.primaryKeyword ? <span className="rounded-full bg-white px-3 py-2">{document.primaryKeyword}</span> : null}
            </div>
          </div>
        </header>

        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1100px]">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[30px] bg-[#eee7ff] shadow-[0_24px_70px_rgba(73,44,120,0.10)] sm:aspect-[16/8]">
              <Image src={heroImage} alt={post.title} fill priority unoptimized className="object-cover" />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 rounded-[28px] border border-[#eee7ff] bg-white/82 px-5 py-6 shadow-[0_18px_50px_rgba(73,44,120,0.05)] sm:px-8">
              {document.blocks.map((block, index) => (
                <BlogBlockView key={`${block.type}-${index}`} block={block} />
              ))}

              {document.faqs?.length ? (
                <section className="mt-12">
                  <h2 className="text-[28px] font-black tracking-[-0.03em] text-[#2a2346]">FAQs</h2>
                  <div className="mt-5 space-y-3">
                    {document.faqs.map((faq) => (
                      <details key={faq.question} className="group rounded-[20px] border border-[#eadfff] bg-[#fcfaff] px-4 py-4">
                        <summary className="cursor-pointer text-[15px] font-black text-[#2a2346]">
                          {faq.question}
                        </summary>
                        <p className="mt-3 text-[14px] leading-[1.8] text-[#5f6474]">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-[28px] bg-[#241c3f] p-5 text-white shadow-[0_20px_55px_rgba(36,28,63,0.20)]">
                <div className="text-[12px] font-black uppercase tracking-[0.16em] text-white/60">Book at home</div>
                <div className="mt-3 text-[26px] font-black tracking-[-0.03em]">Dog grooming starts at Rs 999</div>
                <p className="mt-3 text-[14px] leading-[1.7] text-white/74">
                  Fixed package pricing, trained groomers, and a Rs 250 deposit to confirm your slot.
                </p>
                <Link href="/booking-preview" className="mt-5 inline-flex h-[46px] w-full items-center justify-center rounded-full bg-white text-[14px] font-black text-[#241c3f]">
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
