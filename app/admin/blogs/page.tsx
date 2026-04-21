"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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

const EMPTY_POST = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  category: "",
  coverImageUrl: "",
  readTimeMinutes: 5,
  isPublished: false,
};

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_POST);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

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

  const handleCoverUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads/blog-cover", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to upload blog cover.");
    setForm((prev) => ({ ...prev, coverImageUrl: data.asset.publicUrl }));
  };

  const save = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.body.trim()) {
      setError("Title, excerpt, and body are required.");
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
            ...form,
            category: form.category || null,
            coverImageUrl: form.coverImageUrl || null,
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
        subtitle="Create, edit, publish, and manage homepage blog content."
        onRefresh={() => void load()}
        isRefreshing={loading}
      />

      {error ? (
        <div className="rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="text-[18px] font-bold text-[#2a2346]">
            {isEditing ? "Edit blog post" : "Create blog post"}
          </div>
          <div className="mt-4 grid gap-4">
            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
            <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="Slug (optional)" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
            <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
            <textarea value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Excerpt" className="min-h-[90px] rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[13px] outline-none" />
            <textarea value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} placeholder="Article body" className="min-h-[220px] rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[13px] outline-none" />
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="number" value={form.readTimeMinutes} onChange={(e) => setForm((prev) => ({ ...prev, readTimeMinutes: Number(e.target.value || 5) }))} placeholder="Read time" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
              <label className="flex h-[44px] items-center gap-3 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] text-[#2a2346]">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))} />
                Publish immediately
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void handleCoverUpload(file);
                  e.currentTarget.value = "";
                }}
                className="max-w-full text-[12px]"
              />
              {form.coverImageUrl ? (
                <span className="text-[12px] text-[#6d5bd0]">Thumbnail image attached</span>
              ) : null}
            </div>
            {form.coverImageUrl ? (
              <div className="overflow-hidden rounded-[18px] border border-[#ece5ff] bg-[#faf8ff] p-3">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a84a3]">
                  Thumbnail preview
                </div>
                <div className="relative h-[180px] w-full overflow-hidden rounded-[14px] bg-[#f2ecff]">
                  <Image
                    src={form.coverImageUrl}
                    alt={form.title || "Blog thumbnail preview"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>
            ) : null}
            <div className="flex gap-3">
              <button onClick={() => void save()} disabled={saving} className="inline-flex h-[42px] items-center rounded-[14px] bg-[#6d5bd0] px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                {saving ? "Saving…" : isEditing ? "Update blog post" : "Create blog post"}
              </button>
              {isEditing ? (
                <button onClick={() => setForm(EMPTY_POST)} className="inline-flex h-[42px] items-center rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] font-semibold text-[#4b4370]">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
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
                    <div className="mt-2 text-[12px] text-[#6b7280]">{post.excerpt}</div>
                  </div>
                  {post.coverImageUrl ? (
                    <div className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[14px] border border-[#ece5ff] bg-[#f7f2ff]">
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${post.isPublished ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fff8eb] text-[#b45309]"}`}>
                    {post.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setForm({ ...post, category: post.category || "", coverImageUrl: post.coverImageUrl || "" })} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0]">
                    Edit
                  </button>
                  <button onClick={() => void remove(post.id)} className="rounded-[12px] border border-[#ffd7d7] px-3 py-2 text-[12px] font-semibold text-[#b42318]">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
