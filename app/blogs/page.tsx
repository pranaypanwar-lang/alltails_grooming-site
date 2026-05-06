import Link from "next/link";
import Image from "next/image";

import { getPublishedBlogPosts } from "@/lib/content/server";
import { pageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Pet Grooming Guides",
  description:
    "Read All Tails guides on pet grooming, coat care, dog haircuts, anxious pets, grooming frequency, and at-home pet care.",
  path: "/blogs",
});

export default async function BlogsPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="min-h-screen bg-[#fcfbff] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
            All Tails Articles
          </div>
          <h1 className="mt-5 text-[34px] font-black tracking-[-0.04em] text-[#2a2346]">
            Grooming guidance for pet parents
          </h1>
          <p className="mx-auto mt-3 max-w-[700px] text-[16px] leading-[1.8] text-[#6b7280]">
            Helpful reads on coat care, comfort, hygiene, and choosing the right
            grooming routine for your pet.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-[24px] border border-[#ebe5ff] bg-white shadow-[0_18px_45px_rgba(73,44,120,0.06)]"
            >
              <div className="relative h-[220px] w-full overflow-hidden">
                <Image
                  src={post.coverImageUrl || "/images/blog-1.jpeg"}
                  alt={post.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a84a3]">
                  {post.category || "All Tails"}
                </div>
                <h2 className="mt-2 text-[20px] font-black tracking-[-0.02em] text-[#2a2346]">
                  {post.title}
                </h2>
                <p className="mt-3 text-[14px] leading-[1.75] text-[#6b7280]">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[12px] text-[#8a90a6]">
                    {post.readTimeMinutes} min read
                  </span>
                  <Link
                    href={`/blogs/${post.slug}`}
                    className="text-[13px] font-semibold text-[#6d5bd0]"
                  >
                    Read article
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
