"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  parseBlogDocument,
  stringifyBlogDocument,
  type BlogBlock,
  type BlogFaq,
} from "@/lib/content/blogFormat";
import { AdminPageHeader } from "../components/common/AdminPageHeader";

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string | null;
  coverImageUrl: string | null;
  readTimeMinutes: number;
  isPublished: boolean;
  publishedAt: string | null;
};

type BlogEditorForm = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  excerpt: string;
  bodyDraft: string;
  faqDraft: string;
  category: string;
  coverImageUrl: string;
  heroImageUrl: string;
  readTimeMinutes: number;
  isPublished: boolean;
};

const EMPTY_POST: BlogEditorForm = {
  id: "",
  slug: "",
  title: "",
  seoTitle: "",
  metaDescription: "",
  primaryKeyword: "",
  secondaryKeywords: "",
  excerpt: "",
  bodyDraft: "",
  faqDraft: "",
  category: "Dog Grooming",
  coverImageUrl: "",
  heroImageUrl: "",
  readTimeMinutes: 8,
  isPublished: false,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function blockToDraft(block: BlogBlock) {
  if (block.type === "heading") return `${block.level === 3 ? "###" : "##"} ${block.text}`;
  if (block.type === "paragraph") return block.text;
  if (block.type === "list") return block.items.map((item) => `- ${item}`).join("\n");
  if (block.type === "callout") return `> ${block.title ? `${block.title}: ` : ""}${block.text}`;
  if (block.type === "image") return `![${block.alt}](${block.src})${block.caption ? `\n_${block.caption}_` : ""}`;
  if (block.type === "table") {
    const rows = [block.table.headers, ...block.table.rows];
    return rows.map((row) => row.join(" | ")).join("\n");
  }
  return "";
}

function parseDraftBlocks(draft: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  const chunks = draft
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    if (chunk.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, text: chunk.replace(/^###\s+/, "").trim() });
      continue;
    }
    if (chunk.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, text: chunk.replace(/^##\s+/, "").trim() });
      continue;
    }
    if (chunk.startsWith(">")) {
      const text = chunk.replace(/^>\s?/, "").trim();
      const [title, ...rest] = text.includes(": ") ? text.split(": ") : ["", text];
      blocks.push({ type: "callout", title: title || undefined, text: rest.join(": ").trim() || text });
      continue;
    }
    if (/^!\[[^\]]*\]\([^)]+\)/.test(chunk)) {
      const match = chunk.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        blocks.push({ type: "image", alt: match[1] || "Blog image", src: match[2] });
        continue;
      }
    }
    if (chunk.split("\n").every((line) => line.trim().startsWith("- "))) {
      blocks.push({
        type: "list",
        items: chunk
          .split("\n")
          .map((line) => line.replace(/^-\s+/, "").trim())
          .filter(Boolean),
      });
      continue;
    }
    if (chunk.includes(" | ") && chunk.split("\n").length >= 2) {
      const rows = chunk
        .split("\n")
        .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean))
        .filter((row) => row.length > 1);
      if (rows.length >= 2) {
        blocks.push({ type: "table", table: { headers: rows[0], rows: rows.slice(1) } });
        continue;
      }
    }
    blocks.push({ type: "paragraph", text: chunk.replace(/\n+/g, " ") });
  }

  return blocks;
}

function parseFaqDraft(draft: string): BlogFaq[] {
  return draft
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      const question = lines[0]?.replace(/^Q:\s*/i, "").trim() || "";
      const answer = lines.slice(1).join(" ").replace(/^A:\s*/i, "").trim();
      return { question, answer };
    })
    .filter((faq) => faq.question && faq.answer);
}

function hydrateForm(post: BlogPostRow): BlogEditorForm {
  const document = parseBlogDocument(post.body);
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    seoTitle: document.seoTitle || "",
    metaDescription: document.metaDescription || "",
    primaryKeyword: document.primaryKeyword || "",
    secondaryKeywords: document.secondaryKeywords?.join(", ") || "",
    excerpt: post.excerpt,
    bodyDraft: document.blocks.map(blockToDraft).join("\n\n"),
    faqDraft: (document.faqs || []).map((faq) => `${faq.question}\n${faq.answer}`).join("\n\n"),
    category: post.category || "",
    coverImageUrl: post.coverImageUrl || "",
    heroImageUrl: document.heroImageUrl || post.coverImageUrl || "",
    readTimeMinutes: post.readTimeMinutes,
    isPublished: post.isPublished,
  };
}

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<BlogEditorForm>(EMPTY_POST);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const previewDocument = useMemo(
    () => ({
      version: 1 as const,
      seoTitle: form.seoTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
      primaryKeyword: form.primaryKeyword.trim() || undefined,
      secondaryKeywords: form.secondaryKeywords.split(",").map((item) => item.trim()).filter(Boolean),
      heroImageUrl: form.heroImageUrl.trim() || form.coverImageUrl.trim() || undefined,
      blocks: parseDraftBlocks(form.bodyDraft),
      faqs: parseFaqDraft(form.faqDraft),
    }),
    [form]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/blog-posts");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load blog posts.");
      setPosts(data.posts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load blog posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleImageUpload = async (file: File, target: "coverImageUrl" | "heroImageUrl") => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads/blog-cover", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to upload blog image.");
    setForm((prev) => ({ ...prev, [target]: data.asset.publicUrl }));
  };

  const save = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.bodyDraft.trim()) {
      setError("Title, excerpt, and article body are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        isEditing ? `/api/admin/blog-posts/${form.id}` : "/api/admin/blog-posts",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            slug: form.slug || slugify(form.title),
            excerpt: form.excerpt,
            category: form.category || null,
            coverImageUrl: form.coverImageUrl || form.heroImageUrl || null,
            readTimeMinutes: form.readTimeMinutes,
            isPublished: form.isPublished,
            body: stringifyBlogDocument(previewDocument),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save blog post.");
      setForm(EMPTY_POST);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save blog post.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    const res = await fetch(`/api/admin/blog-posts/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Failed to delete blog post.");
      return;
    }
    if (form.id === id) setForm(EMPTY_POST);
    await load();
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blogs"
        subtitle="Create SEO-ready articles with structured sections, tables, images, and FAQ schema."
        onRefresh={() => void load()}
        isRefreshing={loading}
      />

      {error ? (
        <div className="rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
        <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[18px] font-bold text-[#2a2346]">
                {isEditing ? "Edit blog post" : "Create blog post"}
              </div>
              <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
                Use ## headings, - list items, pipe tables, and Q/A FAQ blocks. The page will render them as mobile-friendly article sections.
              </p>
            </div>
            <label className="flex h-[38px] items-center gap-2 rounded-full border border-[#ddd1fb] px-4 text-[12px] font-semibold text-[#2a2346]">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))} />
              Published
            </label>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value, slug: prev.slug || slugify(e.target.value) }))} placeholder="Blog title" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
              <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="URL slug" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
              <input type="number" value={form.readTimeMinutes} onChange={(e) => setForm((prev) => ({ ...prev, readTimeMinutes: Number(e.target.value || 5) }))} placeholder="Read time" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
            </div>

            <div className="rounded-[18px] border border-[#eee8ff] bg-[#fbf9ff] p-4">
              <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">SEO and AEO</div>
              <div className="mt-3 grid gap-3">
                <input value={form.seoTitle} onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))} placeholder="SEO title" className="h-[44px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none" />
                <textarea value={form.metaDescription} onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))} placeholder="Meta description" className="min-h-[80px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 py-3 text-[13px] outline-none" />
                <div className="grid gap-3 lg:grid-cols-2">
                  <input value={form.primaryKeyword} onChange={(e) => setForm((prev) => ({ ...prev, primaryKeyword: e.target.value }))} placeholder="Primary keyword" className="h-[44px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none" />
                  <input value={form.secondaryKeywords} onChange={(e) => setForm((prev) => ({ ...prev, secondaryKeywords: e.target.value }))} placeholder="Secondary keywords, comma separated" className="h-[44px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none" />
                </div>
              </div>
            </div>

            <textarea value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Short excerpt shown on cards and article header" className="min-h-[90px] rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[13px] outline-none" />

            <div className="grid gap-4 lg:grid-cols-2">
              {(["coverImageUrl", "heroImageUrl"] as const).map((target) => (
                <div key={target} className="rounded-[18px] border border-[#eee8ff] p-4">
                  <div className="text-[12px] font-black uppercase tracking-[0.12em] text-[#8a84a3]">
                    {target === "coverImageUrl" ? "Listing image" : "Hero image"}
                  </div>
                  <input
                    value={form[target]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [target]: e.target.value }))}
                    placeholder="/images/blogs/..."
                    className="mt-3 h-[42px] w-full rounded-[14px] border border-[#ddd1fb] px-3 text-[12px] outline-none"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void handleImageUpload(file, target);
                      e.currentTarget.value = "";
                    }}
                    className="mt-3 max-w-full text-[12px]"
                  />
                </div>
              ))}
            </div>

            <textarea value={form.bodyDraft} onChange={(e) => setForm((prev) => ({ ...prev, bodyDraft: e.target.value }))} placeholder={"Article body\n\n## Section heading\n\nParagraph text...\n\n- List item\n- List item\n\nColumn A | Column B\nValue A | Value B"} className="min-h-[420px] rounded-[18px] border border-[#ddd1fb] px-4 py-3 font-mono text-[13px] leading-[1.7] outline-none" />
            <textarea value={form.faqDraft} onChange={(e) => setForm((prev) => ({ ...prev, faqDraft: e.target.value }))} placeholder={"FAQs for schema\n\nHow much does dog grooming at home cost?\nDog grooming at home starts at Rs 999.\n\nIs haircut included?\nNo, haircut is not included in Essential Care."} className="min-h-[180px] rounded-[18px] border border-[#ddd1fb] px-4 py-3 text-[13px] leading-[1.7] outline-none" />

            <div className="flex flex-wrap gap-3">
              <button onClick={() => void save()} disabled={saving} className="inline-flex h-[42px] items-center rounded-[14px] bg-[#6d5bd0] px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                {saving ? "Saving..." : isEditing ? "Update blog post" : "Create blog post"}
              </button>
              {isEditing ? (
                <button onClick={() => setForm(EMPTY_POST)} className="inline-flex h-[42px] items-center rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] font-semibold text-[#4b4370]">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <div className="text-[18px] font-bold text-[#2a2346]">Preview health</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-[16px] bg-[#f8f3ff] p-3">
                <div className="font-black text-[#2a2346]">{previewDocument.blocks.length}</div>
                <div className="mt-1 text-[#7b738f]">Content blocks</div>
              </div>
              <div className="rounded-[16px] bg-[#f8f3ff] p-3">
                <div className="font-black text-[#2a2346]">{previewDocument.faqs.length}</div>
                <div className="mt-1 text-[#7b738f]">FAQ schema items</div>
              </div>
            </div>
            {form.heroImageUrl || form.coverImageUrl ? (
              <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-[18px] bg-[#f2ecff]">
                <Image src={form.heroImageUrl || form.coverImageUrl} alt="Blog preview" fill unoptimized className="object-cover" />
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <div className="text-[18px] font-bold text-[#2a2346]">Existing posts</div>
            <div className="mt-4 space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded-[16px] border border-[#eee8ff] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#2a2346]">{post.title}</div>
                      <div className="mt-1 text-[11px] text-[#8a90a6]">{post.slug}</div>
                      <div className="mt-2 line-clamp-2 text-[12px] text-[#6b7280]">{post.excerpt}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${post.isPublished ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fff8eb] text-[#b45309]"}`}>
                      {post.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setForm(hydrateForm(post))} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0]">
                      Edit
                    </button>
                    {post.isPublished ? (
                      <a href={`/blogs/${post.slug}`} target="_blank" className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#4b4370]">
                        View
                      </a>
                    ) : null}
                    <button onClick={() => void remove(post.id)} className="rounded-[12px] border border-[#ffd7d7] px-3 py-2 text-[12px] font-semibold text-[#b42318]">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!posts.length && !loading ? (
                <div className="rounded-[16px] bg-[#fbf9ff] px-4 py-5 text-[13px] text-[#7b738f]">No blog posts yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
