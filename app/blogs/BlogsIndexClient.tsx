"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, Share2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type BlogIndexPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  coverImageUrl: string | null;
  featuredLabel: string | null;
  readTimeMinutes: number;
  publishedAt: string | null;
};

function formatPublishedAt(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getCategoryTone(category: string | null) {
  const value = (category || "").toLowerCase();
  if (value.includes("cat")) return "bg-[#edf7f1] text-[#256b4e]";
  if (value.includes("dog")) return "bg-[#fff3e7] text-[#b45309]";
  if (value.includes("breed")) return "bg-[#eef4ff] text-[#2855aa]";
  return "bg-[#f3efff] text-[#6d5bd0]";
}

function MetaRow({ post }: { post: BlogIndexPost }) {
  const publishedAt = formatPublishedAt(post.publishedAt);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#f7f2ff]/80">
      <span
        className={`rounded-full px-3 py-1 ${
          post.featuredLabel ? "bg-white/16 text-white" : getCategoryTone(post.category)
        }`}
      >
        {post.featuredLabel || post.category || "All Tails"}
      </span>
      <span>{post.readTimeMinutes} min read</span>
      {publishedAt ? <span>{publishedAt}</span> : null}
    </div>
  );
}

function SearchPanel({
  query,
  setQuery,
  activeCategory,
  setActiveCategory,
  categories,
  resultCount,
  compact = false,
}: {
  query: string;
  setQuery: (value: string) => void;
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  categories: string[];
  resultCount: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur-sm ${
        compact ? "" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
          Find a guide
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </div>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search breed guides, coat care, grooming..."
          className="h-[50px] w-full rounded-[18px] border border-white/12 bg-white/10 pl-11 pr-4 text-[14px] text-white outline-none placeholder:text-white/42"
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {["All", ...categories].map((category) => {
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                active
                  ? "bg-white text-[#241c3f]"
                  : "border border-white/12 bg-white/6 text-white/76"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpotlightCard({
  post,
  label,
  onShare,
}: {
  post: BlogIndexPost;
  label: string;
  onShare: (post: BlogIndexPost) => Promise<void>;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/6 p-3 backdrop-blur-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
        {label}
      </div>
      <div className="mt-3 grid grid-cols-[92px_minmax(0,1fr)] gap-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-white/10">
          <Image
            src={post.coverImageUrl || "/images/Banner.jpg"}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/56">
            {post.category || "All Tails"}
          </div>
          <h3 className="mt-2 text-[18px] font-black leading-[1.12] tracking-[-0.025em] text-white">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-[13px] leading-[1.65] text-white/66">
            {post.excerpt}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href={`/blogs/${post.slug}`}
              className="text-[12px] font-bold uppercase tracking-[0.14em] text-white"
            >
              Read
            </Link>
            <button
              type="button"
              onClick={() => void onShare(post)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/74"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function BlogsIndexClient({
  posts,
  categories,
}: {
  posts: BlogIndexPost[];
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      const categoryMatch =
        activeCategory === "All" || (post.category || "All Tails") === activeCategory;
      if (!categoryMatch) return false;
      if (!normalizedQuery) return true;
      return [post.title, post.excerpt, post.category || "", post.featuredLabel || ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeCategory, posts, query]);

  const featuredPost = filteredPosts[0];
  const spotlightPosts = filteredPosts.slice(1, 4);
  const editorialPosts = filteredPosts.slice(4, 8);
  const archivePosts = filteredPosts.slice(8);

  const sharePost = async (post: BlogIndexPost) => {
    const url = `${window.location.origin}/blogs/${post.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.excerpt, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
  };

  if (!featuredPost) {
    return (
      <div className="mt-10 rounded-[28px] border border-[#e9e3f6] bg-white px-6 py-14 text-center shadow-[0_18px_44px_rgba(73,44,120,0.06)]">
        <div className="mx-auto max-w-[420px]">
          <div className="inline-flex rounded-full bg-[#f3efff] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#6d5bd0]">
            No matches
          </div>
          <h2 className="mt-4 text-[28px] font-black tracking-[-0.03em] text-[#241c3f]">
            No guides match your current search
          </h2>
          <p className="mt-3 text-[15px] leading-[1.8] text-[#687086]">
            Try a broader keyword or switch back to all categories.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <section className="overflow-hidden rounded-[32px] border border-[#2c2445] bg-[#1d1730] text-white shadow-[0_30px_90px_rgba(32,20,56,0.24)]">
        <div className="border-b border-white/8 p-4 lg:hidden">
          <SearchPanel
            query={query}
            setQuery={setQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            categories={categories}
            resultCount={filteredPosts.length}
            compact
          />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_380px]">
          <article className="relative min-h-[420px] overflow-hidden sm:min-h-[520px]">
            <div className="absolute inset-0">
              <Image
                src={featuredPost.coverImageUrl || "/images/Banner.jpg"}
                alt={featuredPost.title}
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,12,32,0.24)_0%,rgba(18,12,32,0.68)_56%,rgba(18,12,32,0.94)_100%)]" />
            </div>

            <div className="relative flex min-h-[420px] flex-col justify-between px-4 py-4 sm:min-h-[520px] sm:px-7 sm:py-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-[360px] rounded-[22px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/86">
                    <Sparkles className="h-3.5 w-3.5" />
                    Editorial picks
                  </div>
                  <p className="mt-3 text-[14px] leading-[1.7] text-white/78">
                    Grooming advice built for real pet-parent intent: breed care, comfort, hygiene, and better booking decisions.
                  </p>
                </div>

                <div className="hidden grid-cols-1 gap-2 self-start rounded-[22px] border border-white/12 bg-white/8 p-3 text-[12px] text-white/76 backdrop-blur-sm sm:grid">
                  <div>{posts.length} published guides</div>
                  <div>{categories.length} browseable topics</div>
                  <div>Search, filter, share, save</div>
                </div>
              </div>

              <div className="max-w-[760px]">
                <MetaRow post={featuredPost} />
                <h2 className="mt-4 max-w-[10ch] text-[26px] font-black leading-[0.98] tracking-[-0.05em] text-white sm:max-w-[760px] sm:text-[50px] lg:text-[58px]">
                  {featuredPost.title}
                </h2>
                <p className="mt-4 max-w-[620px] text-[14px] leading-[1.75] text-white/78 sm:text-[17px]">
                  {featuredPost.excerpt}
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap">
                  <Link
                    href={`/blogs/${featuredPost.slug}`}
                    className="inline-flex h-[48px] items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-black text-[#241c3f]"
                  >
                    Start reading
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void sharePost(featuredPost)}
                    className="inline-flex h-[48px] items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-[14px] font-semibold text-white/92 backdrop-blur-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    Share guide
                  </button>
                </div>
              </div>
            </div>
          </article>

          <aside className="hidden border-l border-white/10 bg-[#241c3f] p-5 lg:block">
            <SearchPanel
              query={query}
              setQuery={setQuery}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categories={categories}
              resultCount={filteredPosts.length}
            />

            <div className="mt-4 space-y-3">
              {spotlightPosts.map((post, index) => (
                <SpotlightCard
                  key={post.id}
                  post={post}
                  label={index === 0 ? "Next read" : "More from All Tails"}
                  onShare={sharePost}
                />
              ))}
            </div>
          </aside>
        </div>

        {spotlightPosts.length ? (
          <div className="border-t border-white/8 p-4 lg:hidden">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/56">
              Keep browsing
            </div>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
              {spotlightPosts.map((post, index) => (
                <div key={post.id} className="min-w-[280px] snap-start">
                  <SpotlightCard
                    post={post}
                    label={index === 0 ? "Next read" : "More from All Tails"}
                    onShare={sharePost}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-8 border-y border-[#ece5ff] bg-white/72 px-4 py-5 backdrop-blur-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a84a3]">
              Browse all guides
            </div>
            <div className="mt-1 text-[15px] font-semibold text-[#241c3f]">
              Search-driven, breed-aware, and built for real booking intent.
            </div>
          </div>
          <div className="rounded-full bg-[#f3efff] px-4 py-2 text-[12px] font-semibold text-[#6d5bd0]">
            {filteredPosts.length} result{filteredPosts.length === 1 ? "" : "s"}
          </div>
        </div>
      </section>

      {editorialPosts.length ? (
        <section className="mt-8 space-y-5">
          {editorialPosts.map((post, index) => (
            <article
              key={post.id}
              className="grid gap-5 border-b border-[#ece5ff] pb-6 last:border-b-0 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:items-center"
            >
              <div className={`order-2 ${index % 2 === 1 ? "md:order-2" : "md:order-1"}`}>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a84a3]">
                  {post.featuredLabel || post.category || "All Tails"} · {post.readTimeMinutes} min read
                </div>
                <h3 className="mt-3 text-[28px] font-black leading-[1.08] tracking-[-0.035em] text-[#241c3f] sm:text-[34px]">
                  {post.title}
                </h3>
                <p className="mt-3 max-w-[620px] text-[15px] leading-[1.85] text-[#5f6474] sm:text-[16px]">
                  {post.excerpt}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link
                    href={`/blogs/${post.slug}`}
                    className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]"
                  >
                    Read article
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void sharePost(post)}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#4b4370]"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                </div>
              </div>

              <div className={`order-1 ${index % 2 === 1 ? "md:order-1" : "md:order-2"}`}>
                <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] bg-[#eee7ff] shadow-[0_20px_48px_rgba(73,44,120,0.08)]">
                  <Image
                    src={post.coverImageUrl || "/images/Banner.jpg"}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {archivePosts.length ? (
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a84a3]">
                Archive
              </div>
              <h3 className="mt-2 text-[28px] font-black tracking-[-0.035em] text-[#241c3f]">
                More reads worth opening
              </h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivePosts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-[24px] border border-[#ebe5ff] bg-white shadow-[0_18px_44px_rgba(73,44,120,0.05)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#efe8ff]">
                  <Image
                    src={post.coverImageUrl || "/images/Banner.jpg"}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a84a3]">
                    <span className={`rounded-full px-3 py-1 ${getCategoryTone(post.category)}`}>
                      {post.category || "All Tails"}
                    </span>
                    <span>{post.readTimeMinutes} min</span>
                  </div>
                  <h4 className="mt-3 text-[22px] font-black leading-[1.14] tracking-[-0.03em] text-[#241c3f]">
                    {post.title}
                  </h4>
                  <p className="mt-3 text-[14px] leading-[1.8] text-[#626b80]">
                    {post.excerpt}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <Link
                      href={`/blogs/${post.slug}`}
                      className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]"
                    >
                      Open guide
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void sharePost(post)}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#4b4370]"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
