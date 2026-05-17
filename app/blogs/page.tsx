import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { blogEditorial, blogHeroImage } from "@/lib/content/blogFormat";
import { getPublishedBlogPosts } from "@/lib/content/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BlogsIndexClient } from "./BlogsIndexClient";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Pet Grooming Guides",
  description:
    "Read All Tails guides on pet grooming, coat care, dog haircuts, anxious pets, grooming frequency, and at-home pet care.",
  path: "/blogs",
});

export default async function BlogsPage() {
  const posts = await getPublishedBlogPosts();
  const categories = Array.from(
    new Set(posts.map((post) => post.category).filter(Boolean))
  ) as string[];
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/blogs" },
  ]);

  return (
    <SeoPageShell>
      <JsonLd data={breadcrumbs} />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <div>
            <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-[#7a5ce0]">
              All Tails Articles
            </div>
            <h1 className="mt-5 max-w-[720px] text-[38px] font-black leading-[1.04] tracking-[-0.045em] text-[#2a2346] sm:text-[56px]">
              Pet Grooming Guides
            </h1>
            <p className="mt-4 max-w-[720px] text-[16px] leading-[1.85] text-[#6b7280] sm:text-[18px]">
              Helpful reads on coat care, comfort, hygiene, and choosing the
              right grooming routine for your pet.
            </p>
          </div>

          <BlogsIndexClient
            categories={categories}
            posts={posts.map((post) => {
              const editorial = blogEditorial(post.body);
              return {
                id: post.id,
                slug: post.slug,
                title: post.title,
                excerpt: post.excerpt,
                category: post.category,
                coverImageUrl: blogHeroImage(post.body, post.coverImageUrl),
                featuredLabel: editorial.featuredLabel ?? null,
                readTimeMinutes: post.readTimeMinutes,
                publishedAt: post.publishedAt?.toISOString() ?? null,
              };
            })}
          />
        </div>
      </section>
    </SeoPageShell>
  );
}
