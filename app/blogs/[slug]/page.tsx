import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/app/components/seo/JsonLd";
import { getPublishedBlogPostBySlug } from "@/lib/content/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";

function splitBody(body: string) {
  return body
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
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
  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blogs/${post.slug}`,
    ogImage: post.coverImageUrl ?? undefined,
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/blogs" },
    { name: post.title, path: `/blogs/${post.slug}` },
  ]);

  const article = articleSchema({
    slug: post.slug,
    title: post.title,
    description: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coverImageUrl: post.coverImageUrl,
  });

  return (
    <main className="min-h-screen bg-[#fcfbff] px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={[article, breadcrumbs]} />
      <article className="mx-auto max-w-[900px] rounded-[32px] border border-[#ebe5ff] bg-white p-6 shadow-[0_24px_70px_rgba(73,44,120,0.06)] sm:p-8">
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a84a3]">
          {post.category || "All Tails"} · {post.readTimeMinutes} min read
        </div>
        <h1 className="mt-3 text-[34px] font-black tracking-[-0.04em] text-[#2a2346]">
          {post.title}
        </h1>
        <p className="mt-4 text-[18px] leading-[1.8] text-[#6b7280]">
          {post.excerpt}
        </p>

        <div className="relative mt-8 h-[280px] w-full overflow-hidden rounded-[24px] sm:h-[360px]">
          <Image
            src={post.coverImageUrl || "/images/blog-1.jpeg"}
            alt={post.title}
            fill
            unoptimized
            className="object-cover"
          />
        </div>

        <div className="mt-8 space-y-5 text-[16px] leading-[1.95] text-[#4f5565]">
          {splitBody(post.body).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
