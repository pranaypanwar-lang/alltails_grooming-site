"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { ArticleBodyComposition } from "@/app/components/blogs/ArticleComposition";
import { parseBlogDocument, stringifyBlogDocument } from "@/lib/content/blogFormat";
import {
  blockToDraft,
  parseDraftBlocks,
  parseFaqDraft,
} from "@/lib/content/draftParser";
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
  showOnHomepage: boolean;
  showOnBlogsIndex: boolean;
  homepagePriority: number;
  featuredLabel: string;
  readTimeMinutes: number;
  isPublished: boolean;
};

type BatchImportResult = {
  imported: number;
  posts: { id: string; slug: string; title: string }[];
};

type EditorScope = "bodyDraft" | "faqDraft" | "batchDraft";

type SearchMatch = {
  index: number;
  start: number;
  end: number;
  snippetStart: number;
  snippetEnd: number;
};

type SectionWindow = {
  heading: string;
  start: number;
  end: number;
  text: string;
};

type InlineImagePlacement = "cursor" | "opening" | "end" | `heading:${string}`;

type PlannerImageItem = {
  id: string;
  storageUrl: string;
  originalName: string;
  alt: string;
  caption: string;
  suggestedPlacement: Exclude<InlineImagePlacement, "cursor">;
  placement: Exclude<InlineImagePlacement, "cursor">;
};

const MAX_PLANNER_IMAGES = 6;

type ArticlePreviewStop = {
  id: string;
  label: string;
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
  showOnHomepage: false,
  showOnBlogsIndex: true,
  homepagePriority: 1,
  featuredLabel: "",
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

function getSectionWindow(source: string, anchorIndex: number): SectionWindow {
  if (!source.trim()) {
    return { heading: "Selected section", start: 0, end: 0, text: "" };
  }

  const lineStarts: number[] = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "\n" && i + 1 < source.length) lineStarts.push(i + 1);
  }

  const headingIndices = lineStarts.filter((lineStart) => {
    const line = source.slice(lineStart, source.indexOf("\n", lineStart) === -1 ? source.length : source.indexOf("\n", lineStart));
    return /^#{1,6}\s/.test(line.trim());
  });

  let start = 0;
  for (const headingIndex of headingIndices) {
    if (headingIndex <= anchorIndex) start = headingIndex;
    else break;
  }

  let end = source.length;
  for (const headingIndex of headingIndices) {
    if (headingIndex > anchorIndex) {
      end = headingIndex;
      break;
    }
  }

  const sectionText = source.slice(start, end).trimEnd();
  const firstLine = sectionText.split("\n")[0]?.trim() || "Selected section";
  const heading = firstLine.replace(/^#{1,6}\s*/, "") || "Selected section";

  return {
    heading,
    start,
    end,
    text: sectionText,
  };
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
    showOnHomepage: Boolean(document.editorial?.showOnHomepage),
    showOnBlogsIndex: document.editorial?.showOnBlogsIndex ?? true,
    homepagePriority: Number(document.editorial?.homepagePriority || 1),
    featuredLabel: document.editorial?.featuredLabel || "",
    readTimeMinutes: post.readTimeMinutes,
    isPublished: post.isPublished,
  };
}

function buildInlineImageMarkdown(url: string, alt: string, caption: string) {
  const safeAlt = alt.trim() || "Blog image";
  const safeCaption = caption.trim();
  return safeCaption ? `![${safeAlt}](${url})\n_${safeCaption}_` : `![${safeAlt}](${url})`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertImageBlockIntoDraft(
  draft: string,
  imageBlock: string,
  placement: Exclude<InlineImagePlacement, "cursor">
) {
  const normalizedDraft = draft.trimEnd();
  const firstHeadingIndex = normalizedDraft.search(/^##\s+/m);

  if (placement === "opening") {
    const insertAt = firstHeadingIndex >= 0 ? firstHeadingIndex : normalizedDraft.length;
    const before = normalizedDraft.slice(0, insertAt).trimEnd();
    const after = normalizedDraft.slice(insertAt).trimStart();
    return [before, imageBlock, after].filter(Boolean).join("\n\n");
  }

  if (placement === "end") {
    return [normalizedDraft, imageBlock].filter(Boolean).join("\n\n");
  }

  const headingText = placement.replace(/^heading:/, "");
  const headingRegex = new RegExp(
    `^#{2,3}\\s+${escapeRegExp(headingText)}\\s*$`,
    "m"
  );
  const match = headingRegex.exec(normalizedDraft);
  if (!match || match.index === undefined) {
    return [normalizedDraft, imageBlock].filter(Boolean).join("\n\n");
  }

  const headingLineEnd = normalizedDraft.indexOf("\n", match.index);
  const insertAt = headingLineEnd === -1 ? normalizedDraft.length : headingLineEnd + 1;
  const before = normalizedDraft.slice(0, insertAt).trimEnd();
  const after = normalizedDraft.slice(insertAt).trimStart();
  return [before, imageBlock, after].filter(Boolean).join("\n\n");
}

function recommendImagePlacement(
  sourceText: string,
  headingOptions: { label: string; value: `heading:${string}` }[]
): Exclude<InlineImagePlacement, "cursor"> {
  const normalized = sourceText.toLowerCase();

  const keywordMatch = (
    keywords: string[],
    candidates: string[]
  ) =>
    keywords.some((keyword) => normalized.includes(keyword)) &&
    candidates.find((candidate) => normalized.includes(candidate));

  const headingByText = (matcher: (heading: string) => boolean) => {
    const found = headingOptions.find((option) =>
      matcher(option.value.replace(/^heading:/, "").toLowerCase())
    );
    return found?.value;
  };

  if (keywordMatch(["process", "session", "setup", "workstation", "vanity"], ["process", "setup", "session"])) {
    return (
      headingByText((heading) =>
        /(process|session|setup|workstation|happens)/.test(heading)
      ) || "opening"
    );
  }

  if (keywordMatch(["package", "essential", "signature", "pampering", "pricing"], ["package", "pricing"])) {
    return headingByText((heading) => /(package|pricing|essential|signature|pampering)/.test(heading)) || "opening";
  }

  if (keywordMatch(["teddy", "summer", "lion", "haircut", "styling"], ["teddy", "summer", "lion", "haircut", "styling"])) {
    return headingByText((heading) => /(teddy|summer|lion|haircut|styling)/.test(heading)) || "end";
  }

  if (keywordMatch(["dematting", "matting", "matted"], ["dematting", "matting"])) {
    return headingByText((heading) => /(dematting|matting|matted)/.test(heading)) || "end";
  }

  if (keywordMatch(["before", "after", "result", "finish"], ["before", "after", "result", "finish"])) {
    return headingByText((heading) => /(result|finish|complete|pampering)/.test(heading)) || "end";
  }

  if (normalized.includes("faq")) {
    return "end";
  }

  return headingOptions[0]?.value || "opening";
}

function placementHeadingLabel(placement: Exclude<InlineImagePlacement, "cursor">) {
  if (placement === "opening") return "Opening section";
  if (placement === "end") return "Article end";
  return placement.replace(/^heading:/, "");
}

function placementHelpCopy(placement: Exclude<InlineImagePlacement, "cursor">) {
  if (placement === "opening") {
    return "Image appears after the intro and before the first main section.";
  }
  if (placement === "end") {
    return "Image appears near the end of the article body.";
  }
  return `Image appears directly under the heading "${placementHeadingLabel(placement)}".`;
}

function buildPreviewStops(
  title: string,
  blocks: Array<{ type: string; text?: string }>,
  faqCount: number
): ArticlePreviewStop[] {
  const headingStops = blocks
    .filter((block) => block.type === "heading" && typeof block.text === "string")
    .map((block) => block.text!.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((heading) => ({
      id: `heading:${heading}`,
      label: heading,
    }));

  return [
    { id: "title", label: title.trim() || "Article title" },
    { id: "opening", label: "Opening section" },
    ...headingStops,
    ...(faqCount ? [{ id: "faq", label: "FAQs" }] : []),
    { id: "end", label: "Article end" },
  ];
}

function clampPreviewWindow(
  stops: ArticlePreviewStop[],
  placement: Exclude<InlineImagePlacement, "cursor">
) {
  const targetId = placement === "end" ? "end" : placement;
  const targetIndex = Math.max(
    0,
    stops.findIndex((stop) => stop.id === targetId)
  );
  const safeTargetIndex = targetIndex === -1 ? 0 : targetIndex;
  const start = Math.max(0, safeTargetIndex - 1);
  const end = Math.min(stops.length, safeTargetIndex + 2);
  return {
    targetIndex: safeTargetIndex,
    visibleStops: stops.slice(start, end),
    windowStart: start,
  };
}

function PlacementPreview({
  articleTitle,
  stops,
  placement,
}: {
  articleTitle: string;
  stops: ArticlePreviewStop[];
  placement: Exclude<InlineImagePlacement, "cursor">;
}) {
  const { targetIndex, visibleStops, windowStart } = clampPreviewWindow(stops, placement);
  const targetId = stops[targetIndex]?.id;

  return (
    <div className="space-y-3 rounded-[14px] border border-[#ebe5fb] bg-[#fcfbff] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
            Placement preview
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[#2a2346]">
            {placementHeadingLabel(placement)}
          </div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">
          Mobile first
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
        <div className="rounded-[24px] border border-[#ddd1fb] bg-[#181327] p-2 shadow-[0_12px_30px_rgba(37,23,69,0.12)]">
          <div className="overflow-hidden rounded-[20px] bg-white">
            <div className="border-b border-[#f0ebff] px-3 py-2">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                Mobile article
              </div>
              <div className="mt-1 line-clamp-2 text-[13px] font-semibold leading-[1.4] text-[#241c3f]">
                {articleTitle || "Article title"}
              </div>
            </div>
            <div className="space-y-2 px-3 py-3">
              {visibleStops.map((stop, index) => {
                const absoluteIndex = windowStart + index;
                const isTarget = stop.id === targetId;
                const isTitle = absoluteIndex === 0;
                return (
                  <div
                    key={`${stop.id}-${absoluteIndex}`}
                    className={`rounded-[14px] border px-3 py-2 ${
                      isTarget
                        ? "border-[#6d5bd0] bg-[#f3efff]"
                        : isTitle
                          ? "border-[#ece5ff] bg-[#faf8ff]"
                          : "border-[#f1ecff] bg-white"
                    }`}
                  >
                    <div className="text-[11px] font-semibold leading-[1.45] text-[#4b4370]">
                      {stop.label}
                    </div>
                    {isTarget ? (
                      <div className="mt-2 rounded-[12px] border border-dashed border-[#6d5bd0] bg-white px-3 py-3 text-[11px] font-semibold text-[#6d5bd0]">
                        Planned image appears here
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-[#ddd1fb] bg-white p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
            Desktop article
          </div>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_88px] gap-3">
            <div className="space-y-2">
              <div className="rounded-[12px] border border-[#ece5ff] bg-[#faf8ff] px-3 py-2 text-[12px] font-semibold text-[#241c3f]">
                {articleTitle || "Article title"}
              </div>
              {visibleStops.map((stop, index) => {
                const absoluteIndex = windowStart + index;
                const isTarget = stop.id === targetId;
                const isTitle = absoluteIndex === 0;
                return (
                  <div
                    key={`desktop-${stop.id}-${absoluteIndex}`}
                    className={`rounded-[12px] border px-3 py-2 text-[11px] font-medium ${
                      isTarget
                        ? "border-[#6d5bd0] bg-[#f3efff] text-[#4b4370]"
                        : isTitle
                          ? "border-[#ece5ff] bg-[#faf8ff] text-[#4b4370]"
                          : "border-[#f1ecff] bg-white text-[#6b647d]"
                    }`}
                  >
                    {stop.label}
                  </div>
                );
              })}
            </div>
            <div className="space-y-2">
              <div className="rounded-[12px] border border-[#ece5ff] bg-[#faf8ff] px-2 py-2 text-center text-[10px] font-semibold text-[#8a84a3]">
                Share
              </div>
              <div className="rounded-[12px] border border-[#ece5ff] bg-[#faf8ff] px-2 py-3 text-center text-[10px] font-semibold text-[#8a84a3]">
                TOC
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-white px-3 py-2 text-[12px] leading-[1.6] text-[#5f5876]">
        {placementHelpCopy(placement)}
      </div>
    </div>
  );
}

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<BlogEditorForm>(EMPTY_POST);
  const [batchDraft, setBatchDraft] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchImportResult | null>(null);
  const [postSearch, setPostSearch] = useState("");
  const [editorScope, setEditorScope] = useState<EditorScope>("bodyDraft");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [batchFindText, setBatchFindText] = useState("");
  const [batchReplaceText, setBatchReplaceText] = useState("");
  const [activeBatchMatch, setActiveBatchMatch] = useState<number>(-1);
  const [selectedSection, setSelectedSection] = useState<SectionWindow | null>(null);
  const [inlineImageAlt, setInlineImageAlt] = useState("");
  const [inlineImageCaption, setInlineImageCaption] = useState("");
  const [inlineImagePlacement, setInlineImagePlacement] =
    useState<InlineImagePlacement>("cursor");
  const [inlineImageUploading, setInlineImageUploading] = useState(false);
  const [plannerImages, setPlannerImages] = useState<PlannerImageItem[]>([]);
  const [plannerUploading, setPlannerUploading] = useState(false);
  const bodyDraftRef = useRef<HTMLTextAreaElement | null>(null);
  const faqDraftRef = useRef<HTMLTextAreaElement | null>(null);
  const batchDraftRef = useRef<HTMLTextAreaElement | null>(null);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const filteredPosts = useMemo(() => {
    const query = postSearch.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) =>
      [post.title, post.slug, post.excerpt, post.category || ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [postSearch, posts]);
  const previewDocument = useMemo(
    () => ({
      version: 1 as const,
      seoTitle: form.seoTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
      primaryKeyword: form.primaryKeyword.trim() || undefined,
      secondaryKeywords: form.secondaryKeywords.split(",").map((item) => item.trim()).filter(Boolean),
      heroImageUrl: form.heroImageUrl.trim() || form.coverImageUrl.trim() || undefined,
      editorial: {
        showOnHomepage: form.showOnHomepage,
        showOnBlogsIndex: form.showOnBlogsIndex,
        homepagePriority: form.homepagePriority,
        featuredLabel: form.featuredLabel.trim() || undefined,
      },
      blocks: parseDraftBlocks(form.bodyDraft),
      faqs: parseFaqDraft(form.faqDraft),
    }),
    [form]
  );
  const bodyHeadingOptions = useMemo(
    () =>
      previewDocument.blocks
        .filter((block) => block.type === "heading")
        .map((heading) => ({
          label: `${heading.level === 3 ? "H3" : "H2"} · ${heading.text}`,
          value: `heading:${heading.text}` as `heading:${string}`,
        })),
    [previewDocument]
  );
  const previewHeadings = useMemo(
    () =>
      previewDocument.blocks
        .filter(
          (
            block
          ): block is Extract<(typeof previewDocument.blocks)[number], { type: "heading" }> =>
            block.type === "heading"
        )
        .map((heading) => ({
          text: heading.text,
          level: heading.level ?? 2,
          id: slugify(heading.text),
        })),
    [previewDocument]
  );
  const articlePreviewStops = useMemo(
    () => buildPreviewStops(form.title, previewDocument.blocks, previewDocument.faqs.length),
    [form.title, previewDocument.blocks, previewDocument.faqs.length]
  );
  const editorValue =
    editorScope === "bodyDraft"
      ? form.bodyDraft
      : editorScope === "faqDraft"
        ? form.faqDraft
        : batchDraft;
  const editorMatchCount = useMemo(() => {
    const needle = findText.trim();
    if (!needle) return 0;
    return editorValue.toLowerCase().split(needle.toLowerCase()).length - 1;
  }, [editorValue, findText]);
  const batchMatchCount = useMemo(() => {
    const needle = batchFindText.trim();
    if (!needle) return 0;
    return batchDraft.toLowerCase().split(needle.toLowerCase()).length - 1;
  }, [batchDraft, batchFindText]);
  const batchMatches = useMemo<SearchMatch[]>(() => {
    const needle = batchFindText.trim();
    if (!needle) return [];
    const matches: SearchMatch[] = [];
    const lowerSource = batchDraft.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let fromIndex = 0;
    while (fromIndex < lowerSource.length) {
      const start = lowerSource.indexOf(lowerNeedle, fromIndex);
      if (start === -1) break;
      const end = start + needle.length;
      matches.push({
        index: matches.length,
        start,
        end,
        snippetStart: Math.max(0, start - 40),
        snippetEnd: Math.min(batchDraft.length, end + 60),
      });
      fromIndex = end;
    }
    return matches;
  }, [batchDraft, batchFindText]);

  const getScopeRef = (scope: EditorScope) => {
    if (scope === "bodyDraft") return bodyDraftRef.current;
    if (scope === "faqDraft") return faqDraftRef.current;
    return batchDraftRef.current;
  };

  const setScopeValue = (scope: EditorScope, nextValue: string) => {
    if (scope === "bodyDraft") {
      setForm((prev) => ({ ...prev, bodyDraft: nextValue }));
      return;
    }
    if (scope === "faqDraft") {
      setForm((prev) => ({ ...prev, faqDraft: nextValue }));
      return;
    }
    setBatchDraft(nextValue);
  };

  const jumpToMatch = (scope: EditorScope, startIndex = 0) => {
    const needle = findText.trim();
    if (!needle) return false;
    const source =
      scope === "bodyDraft" ? form.bodyDraft : scope === "faqDraft" ? form.faqDraft : batchDraft;
    const lowerSource = source.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let index = lowerSource.indexOf(lowerNeedle, startIndex);
    if (index === -1 && startIndex > 0) {
      index = lowerSource.indexOf(lowerNeedle, 0);
    }
    if (index === -1) return false;

    const target = getScopeRef(scope);
    if (!target) return false;
    target.focus();
    target.setSelectionRange(index, index + needle.length);
    return true;
  };

  const findNext = () => {
    const target = getScopeRef(editorScope);
    const startIndex = target ? target.selectionEnd : 0;
    jumpToMatch(editorScope, startIndex);
  };

  const replaceNext = () => {
    const needle = findText.trim();
    if (!needle) return;
    const target = getScopeRef(editorScope);
    const source =
      editorScope === "bodyDraft"
        ? form.bodyDraft
        : editorScope === "faqDraft"
          ? form.faqDraft
          : batchDraft;
    const lowerSource = source.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    const startIndex = target ? target.selectionStart : 0;
    let index = lowerSource.indexOf(lowerNeedle, startIndex);
    if (index === -1) {
      index = lowerSource.indexOf(lowerNeedle, 0);
    }
    if (index === -1) return;

    const nextValue =
      source.slice(0, index) + replaceText + source.slice(index + needle.length);
    setScopeValue(editorScope, nextValue);

    requestAnimationFrame(() => {
      const nextTarget = getScopeRef(editorScope);
      if (!nextTarget) return;
      const selectionEnd = index + replaceText.length;
      nextTarget.focus();
      nextTarget.setSelectionRange(index, selectionEnd);
    });
  };

  const replaceAll = () => {
    const needle = findText.trim();
    if (!needle) return;
    const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedNeedle, "gi");
    const source =
      editorScope === "bodyDraft"
        ? form.bodyDraft
        : editorScope === "faqDraft"
          ? form.faqDraft
          : batchDraft;
    setScopeValue(editorScope, source.replace(regex, replaceText));
  };

  const jumpToBatchMatch = (startIndex = 0) => {
    const needle = batchFindText.trim();
    if (!needle) return false;
    const lowerSource = batchDraft.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let index = lowerSource.indexOf(lowerNeedle, startIndex);
    if (index === -1 && startIndex > 0) {
      index = lowerSource.indexOf(lowerNeedle, 0);
    }
    if (index === -1 || !batchDraftRef.current) return false;
    batchDraftRef.current.focus();
    batchDraftRef.current.setSelectionRange(index, index + needle.length);
    const matchIndex = batchMatches.findIndex((match) => match.start === index);
    if (matchIndex !== -1) setActiveBatchMatch(matchIndex);
    return true;
  };

  const focusBatchMatch = (matchIndex: number) => {
    const match = batchMatches[matchIndex];
    if (!match || !batchDraftRef.current) return;
    batchDraftRef.current.focus();
    batchDraftRef.current.setSelectionRange(match.start, match.end);
    setActiveBatchMatch(matchIndex);
    setSelectedSection(getSectionWindow(batchDraft, match.start));
  };

  const findNextInBatch = () => {
    const startIndex = batchDraftRef.current ? batchDraftRef.current.selectionEnd : 0;
    jumpToBatchMatch(startIndex);
  };

  const replaceNextInBatch = () => {
    const needle = batchFindText.trim();
    if (!needle) return;
    const lowerSource = batchDraft.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    const startIndex = batchDraftRef.current ? batchDraftRef.current.selectionStart : 0;
    let index = lowerSource.indexOf(lowerNeedle, startIndex);
    if (index === -1) {
      index = lowerSource.indexOf(lowerNeedle, 0);
    }
    if (index === -1) return;

    const nextValue =
      batchDraft.slice(0, index) + batchReplaceText + batchDraft.slice(index + needle.length);
    setBatchDraft(nextValue);

    requestAnimationFrame(() => {
      if (!batchDraftRef.current) return;
      const selectionEnd = index + batchReplaceText.length;
      batchDraftRef.current.focus();
      batchDraftRef.current.setSelectionRange(index, selectionEnd);
    });
  };

  const replaceAllInBatch = () => {
    const needle = batchFindText.trim();
    if (!needle) return;
    const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedNeedle, "gi");
    setBatchDraft((prev) => prev.replace(regex, batchReplaceText));
  };

  const updateSelectedSection = (nextSectionText: string) => {
    setSelectedSection((prev) => {
      if (!prev) return prev;
      const nextDraft = batchDraft.slice(0, prev.start) + nextSectionText + batchDraft.slice(prev.end);
      setBatchDraft(nextDraft);
      return {
        ...prev,
        end: prev.start + nextSectionText.length,
        text: nextSectionText,
        heading:
          nextSectionText.split("\n")[0]?.trim().replace(/^#{1,6}\s*/, "") || prev.heading,
      };
    });
  };

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

  useEffect(() => {
    setPlannerImages([]);
  }, [form.id]);

  const insertInlineImageIntoDraft = (
    imageUrl: string,
    alt: string,
    caption: string,
    placement: InlineImagePlacement
  ) => {
    const imageBlock = buildInlineImageMarkdown(imageUrl, alt, caption);

    setForm((prev) => {
      if (placement === "cursor") {
        const draft = prev.bodyDraft.trimEnd();
        const insertAt = bodyDraftRef.current?.selectionStart ?? draft.length;
        const before = draft.slice(0, insertAt).trimEnd();
        const after = draft.slice(insertAt).trimStart();
        return {
          ...prev,
          bodyDraft: [before, imageBlock, after].filter(Boolean).join("\n\n"),
        };
      }
      return {
        ...prev,
        bodyDraft: insertImageBlockIntoDraft(prev.bodyDraft, imageBlock, placement),
      };
    });
  };

  const handleImageUpload = async (file: File, target: "coverImageUrl" | "heroImageUrl") => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads/blog-cover", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to upload blog image.");
    setForm((prev) => ({ ...prev, [target]: data.asset.publicUrl }));
  };

  const handleInlineImageUpload = async (file: File) => {
    setInlineImageUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/blog-cover", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to upload blog image.");
      insertInlineImageIntoDraft(
        data.asset.publicUrl,
        inlineImageAlt || form.title || "Blog image",
        inlineImageCaption,
        inlineImagePlacement
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload blog image.");
    } finally {
      setInlineImageUploading(false);
    }
  };

  const handlePlannerImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (plannerImages.length >= MAX_PLANNER_IMAGES) {
      setError(`You can plan up to ${MAX_PLANNER_IMAGES} images per blog.`);
      return;
    }

    setPlannerUploading(true);
    setError("");

    try {
      const uploadedItems: PlannerImageItem[] = [];
      const remainingSlots = MAX_PLANNER_IMAGES - plannerImages.length;

      for (const file of Array.from(files).slice(0, remainingSlots)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/uploads/blog-cover", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to upload blog image.");

        const suggestedPlacement = recommendImagePlacement(
          `${file.name} ${form.title} ${form.primaryKeyword} ${form.category}`,
          bodyHeadingOptions
        );

        uploadedItems.push({
          id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
          storageUrl: data.asset.publicUrl,
          originalName: file.name,
          alt: file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
          caption: "",
          suggestedPlacement,
          placement: suggestedPlacement,
        });
      }

      setPlannerImages((prev) => [...prev, ...uploadedItems]);
      if (files.length > remainingSlots) {
        setError(`Only the first ${remainingSlots} image${remainingSlots === 1 ? "" : "s"} were added. Planner limit is ${MAX_PLANNER_IMAGES} images per blog.`);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload blog image.");
    } finally {
      setPlannerUploading(false);
    }
  };

  const applyPlannerImages = () => {
    if (!plannerImages.length) return;

    setForm((prev) => {
      const nextDraft = plannerImages.reduce((draft, item) => {
        const imageBlock = buildInlineImageMarkdown(item.storageUrl, item.alt, item.caption);
        return insertImageBlockIntoDraft(draft, imageBlock, item.placement);
      }, prev.bodyDraft);

      return { ...prev, bodyDraft: nextDraft };
    });

    setPlannerImages([]);
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

  const importBatch = async () => {
    if (!batchDraft.trim()) {
      setError("Paste the prepared blog batch before importing.");
      return;
    }

    setBatchLoading(true);
    setBatchResult(null);
    setError("");
    try {
      const res = await fetch("/api/admin/blog-posts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: batchDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to import blog batch.");
      setBatchResult(data);
      await load();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import blog batch.");
    } finally {
      setBatchLoading(false);
    }
  };

  const loadBatchFile = async (file: File) => {
    const content = await file.text();
    setBatchDraft(content);
    setBatchResult(null);
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

      <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-bold text-[#2a2346]">Bulk import prepared blogs</div>
            <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
              Paste the prepared SEO blog format here. The importer will create structured articles, FAQs, and metadata. You can upload images later.
            </p>
          </div>
          <button
            onClick={() => void importBatch()}
            disabled={batchLoading}
            className="inline-flex h-[42px] items-center rounded-[14px] bg-[#2a2346] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {batchLoading ? "Importing..." : "Import batch"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex h-[40px] cursor-pointer items-center rounded-[14px] border border-[#ddd1fb] px-4 text-[12px] font-semibold text-[#4b4370]">
            Load `.txt` or `.md` file
            <input
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void loadBatchFile(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <div className="text-[12px] text-[#8a84a3]">
            Use one file containing all prepared blogs in the same format.
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-[#eee8ff] bg-[#fbf9ff] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                Bulk Draft Find And Replace
              </div>
              <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
                Search and update text directly inside the bulk blog draft before importing.
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">
              {batchMatchCount} match{batchMatchCount === 1 ? "" : "es"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <input
              value={batchFindText}
              onChange={(e) => setBatchFindText(e.target.value)}
              placeholder="Find in bulk draft"
              className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
            />
            <input
              value={batchReplaceText}
              onChange={(e) => setBatchReplaceText(e.target.value)}
              placeholder="Replace with"
              className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={findNextInBatch} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#4b4370]">
              Find next
            </button>
            <button onClick={replaceNextInBatch} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#4b4370]">
              Replace next
            </button>
            <button onClick={replaceAllInBatch} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0]">
              Replace all
            </button>
          </div>

          {batchMatches.length ? (
            <div className="mt-4 max-h-[240px] space-y-2 overflow-y-auto rounded-[14px] border border-[#eee8ff] bg-white p-3">
              {batchMatches.map((match) => {
                const before = batchDraft.slice(match.snippetStart, match.start);
                const highlighted = batchDraft.slice(match.start, match.end);
                const after = batchDraft.slice(match.end, match.snippetEnd);
                return (
                  <button
                    key={`${match.start}-${match.end}`}
                    onClick={() => focusBatchMatch(match.index)}
                    className={`block w-full rounded-[12px] px-3 py-2 text-left text-[12px] leading-[1.6] ${
                      activeBatchMatch === match.index
                        ? "bg-[#f3efff] text-[#2a2346]"
                        : "bg-[#fcfbff] text-[#5d5674]"
                    }`}
                  >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a84a3]">
                      Match {match.index + 1}
                    </div>
                    <div className="font-mono">
                      {match.snippetStart > 0 ? "..." : ""}
                      {before}
                      <span className="rounded bg-[#fde68a] px-1 text-[#2a2346]">{highlighted}</span>
                      {after}
                      {match.snippetEnd < batchDraft.length ? "..." : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {selectedSection ? (
            <div className="mt-4 rounded-[14px] border border-[#ddd1fb] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                    Focused Section Editor
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-[#2a2346]">
                    {selectedSection.heading}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!batchDraftRef.current || activeBatchMatch < 0) return;
                    const match = batchMatches[activeBatchMatch];
                    if (!match) return;
                    batchDraftRef.current.focus();
                    batchDraftRef.current.setSelectionRange(match.start, match.end);
                  }}
                  className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#4b4370]"
                >
                  Jump in full draft
                </button>
              </div>

              <textarea
                value={selectedSection.text}
                onChange={(e) => updateSelectedSection(e.target.value)}
                className="mt-3 min-h-[260px] w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 font-mono text-[12px] leading-[1.7] outline-none"
              />
            </div>
          ) : null}
        </div>

        <textarea
          ref={batchDraftRef}
          value={batchDraft}
          onChange={(e) => setBatchDraft(e.target.value)}
          placeholder="Paste the prepared blog batch here..."
          className="mt-4 min-h-[260px] w-full rounded-[18px] border border-[#ddd1fb] px-4 py-3 font-mono text-[12px] leading-[1.7] outline-none"
        />

        {batchResult ? (
          <div className="mt-4 rounded-[18px] border border-[#d7f1df] bg-[#f4fff6] px-4 py-4 text-[13px] text-[#166534]">
            Imported {batchResult.imported} posts.
          </div>
        ) : null}
      </div>

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
            <div className="rounded-[18px] border border-[#eee8ff] bg-[#fbf9ff] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                    Editor tools
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
                    Make quick text changes and find words inside the article body, FAQs, or batch import draft.
                  </p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">
                  {editorMatchCount} match{editorMatchCount === 1 ? "" : "es"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
                <select
                  value={editorScope}
                  onChange={(e) => setEditorScope(e.target.value as EditorScope)}
                  className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-3 text-[13px] outline-none"
                >
                  <option value="bodyDraft">Article body</option>
                  <option value="faqDraft">FAQs</option>
                  <option value="batchDraft">Bulk import draft</option>
                </select>
                <input
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Find text"
                  className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
                />
                <input
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace with"
                  className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={findNext} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#4b4370]">
                  Find next
                </button>
                <button onClick={replaceNext} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#4b4370]">
                  Replace next
                </button>
                <button onClick={replaceAll} className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0]">
                  Replace all
                </button>
              </div>
            </div>

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

            <div className="rounded-[18px] border border-[#eee8ff] bg-[#fbf9ff] p-4">
              <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                Editorial placement
              </div>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <label className="flex items-center justify-between rounded-[14px] border border-[#ddd1fb] bg-white px-4 py-3 text-[13px] text-[#2a2346]">
                  <span className="font-semibold">Show on homepage cards</span>
                  <input
                    type="checkbox"
                    checked={form.showOnHomepage}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showOnHomepage: e.target.checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-[14px] border border-[#ddd1fb] bg-white px-4 py-3 text-[13px] text-[#2a2346]">
                  <span className="font-semibold">Show on /blogs index</span>
                  <input
                    type="checkbox"
                    checked={form.showOnBlogsIndex}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showOnBlogsIndex: e.target.checked }))
                    }
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <input
                  type="number"
                  value={form.homepagePriority}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      homepagePriority: Math.max(1, Number(e.target.value || 1)),
                    }))
                  }
                  placeholder="Homepage order"
                  className="h-[44px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
                />
                <input
                  value={form.featuredLabel}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, featuredLabel: e.target.value }))
                  }
                  placeholder="Featured label (optional)"
                  className="h-[44px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
                />
              </div>
            </div>

            <textarea value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Short excerpt shown on cards and article header" className="min-h-[90px] rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[13px] outline-none" />

            <div className="rounded-[18px] border border-[#eee8ff] bg-[#fbf9ff] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                    How blog images work
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
                    Use one image for blog cards, one image for the article hero, and up to six section images inside the article body.
                  </p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">
                  Keep roles separate
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[16px] border border-[#ddd1fb] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#2a2346]">
                    1. Card image
                  </div>
                  <div className="mt-2 text-[12px] leading-[1.6] text-[#6b647d]">
                    Used on homepage and <code>/blogs</code> cards.
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#ddd1fb] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#2a2346]">
                    2. Article hero
                  </div>
                  <div className="mt-2 text-[12px] leading-[1.6] text-[#6b647d]">
                    Large image shown at the top of the blog article.
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#ddd1fb] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#2a2346]">
                    3. In-article images
                  </div>
                  <div className="mt-2 text-[12px] leading-[1.6] text-[#6b647d]">
                    Place images inside the article body under the correct heading. Planner is best when you have multiple images.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {(["coverImageUrl", "heroImageUrl"] as const).map((target) => (
                <div key={target} className="rounded-[18px] border border-[#eee8ff] p-4">
                  <div className="text-[12px] font-black uppercase tracking-[0.12em] text-[#8a84a3]">
                    {target === "coverImageUrl" ? "Card image" : "Article hero image"}
                  </div>
                  <p className="mt-2 text-[12px] leading-[1.6] text-[#7b738f]">
                    {target === "coverImageUrl"
                      ? "Shows on the homepage and /blogs listing cards."
                      : "Shows at the top of the blog article page."}
                  </p>
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

            <div className="rounded-[18px] border border-[#eee8ff] bg-[#fbf9ff] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                      Single in-article image
                    </div>
                    <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
                    Use this for one-off placement. If a blog has multiple section images, use the planner below instead.
                    </p>
                  </div>
                <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">
                  Smart placement
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <input
                  value={inlineImageAlt}
                  onChange={(e) => setInlineImageAlt(e.target.value)}
                  placeholder="Image alt text"
                  className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
                />
                <input
                  value={inlineImageCaption}
                  onChange={(e) => setInlineImageCaption(e.target.value)}
                  placeholder="Image caption (optional)"
                  className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
                />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <select
                  value={inlineImagePlacement}
                  onChange={(e) => setInlineImagePlacement(e.target.value as InlineImagePlacement)}
                  className="h-[42px] rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] outline-none"
                >
                  <option value="cursor">Insert at cursor</option>
                  <option value="opening">After opening section</option>
                  <option value="end">At article end</option>
                  {bodyHeadingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="inline-flex h-[42px] cursor-pointer items-center justify-center rounded-[14px] bg-[#2a2346] px-4 text-[13px] font-semibold text-white">
                  {inlineImageUploading ? "Uploading..." : "Upload and place image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void handleInlineImageUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#eee8ff] bg-[#fbf9ff] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                      Image Placement Planner
                    </div>
                  <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
                    Recommended for blogs with multiple images. Upload up to six, review suggested sections, check mobile and desktop placement, then insert them into the article in one pass.
                  </p>
                </div>
                <label className={`inline-flex h-[42px] items-center justify-center rounded-[14px] px-4 text-[13px] font-semibold text-white ${plannerImages.length >= MAX_PLANNER_IMAGES || plannerUploading ? "cursor-not-allowed bg-[#b5abd8]" : "cursor-pointer bg-[#6d5bd0]"}`}>
                  {plannerUploading ? "Uploading..." : "Upload planner images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={plannerImages.length >= MAX_PLANNER_IMAGES || plannerUploading}
                    onChange={(e) => {
                      void handlePlannerImageUpload(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="mt-3 text-[12px] text-[#7b738f]">
                {plannerImages.length}/{MAX_PLANNER_IMAGES} planned images
              </div>

              <div className="mt-4 rounded-[14px] border border-[#ddd1fb] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                  Detected headings
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!bodyHeadingOptions.length ? (
                    <span className="text-[12px] text-[#7b738f]">
                      Add section headings in the article body to unlock section-aware recommendations.
                    </span>
                  ) : (
                    bodyHeadingOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-[#e6defd] bg-[#fbf9ff] px-3 py-1 text-[11px] font-semibold text-[#5f5876]"
                      >
                        {option.label}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {plannerImages.length ? (
                <div className="mt-4 space-y-3">
                  {plannerImages.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-4 rounded-[16px] border border-[#ddd1fb] bg-white p-4 lg:grid-cols-[120px_minmax(0,1fr)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[#efe8ff]">
                        <Image
                          src={item.storageUrl}
                          alt={item.alt}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 space-y-3">
                        <div className="text-[12px] font-semibold text-[#2a2346]">
                          {item.originalName}
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <input
                            value={item.alt}
                            onChange={(e) =>
                              setPlannerImages((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id ? { ...entry, alt: e.target.value } : entry
                                )
                              )
                            }
                            placeholder="Alt text"
                            className="h-[40px] rounded-[12px] border border-[#ddd1fb] px-3 text-[12px] outline-none"
                          />
                          <input
                            value={item.caption}
                            onChange={(e) =>
                              setPlannerImages((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id ? { ...entry, caption: e.target.value } : entry
                                )
                              )
                            }
                            placeholder="Caption"
                            className="h-[40px] rounded-[12px] border border-[#ddd1fb] px-3 text-[12px] outline-none"
                          />
                        </div>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <select
                            value={item.placement}
                            onChange={(e) =>
                              setPlannerImages((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        placement: e.target.value as Exclude<
                                          InlineImagePlacement,
                                          "cursor"
                                        >,
                                      }
                                    : entry
                                )
                              )
                            }
                            className="h-[40px] rounded-[12px] border border-[#ddd1fb] px-3 text-[12px] outline-none"
                          >
                            <option value="opening">After opening section</option>
                            <option value="end">At article end</option>
                            {bodyHeadingOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setPlannerImages((prev) =>
                                prev.filter((entry) => entry.id !== item.id)
                              )
                            }
                            className="rounded-[12px] border border-[#ffd7d7] px-3 py-2 text-[12px] font-semibold text-[#b42318]"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="text-[11px] text-[#8a84a3]">
                          Suggested placement:{" "}
                          <span className="font-semibold text-[#6d5bd0]">
                            {item.suggestedPlacement === "opening"
                              ? "After opening section"
                              : item.suggestedPlacement === "end"
                                ? "At article end"
                                : item.suggestedPlacement.replace(/^heading:/, "")}
                          </span>
                        </div>
                        <PlacementPreview
                          articleTitle={form.title}
                          stops={articlePreviewStops}
                          placement={item.placement}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={applyPlannerImages}
                      className="inline-flex h-[42px] items-center rounded-[14px] bg-[#2a2346] px-4 text-[13px] font-semibold text-white"
                    >
                      Insert planned images into article
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlannerImages([])}
                      className="inline-flex h-[42px] items-center rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] font-semibold text-[#4b4370]"
                    >
                      Clear planner
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <textarea ref={bodyDraftRef} value={form.bodyDraft} onChange={(e) => setForm((prev) => ({ ...prev, bodyDraft: e.target.value }))} placeholder={"Article body\n\n## Section heading\n\nParagraph text...\n\n- List item\n- List item\n\nColumn A | Column B\nValue A | Value B"} className="min-h-[420px] rounded-[18px] border border-[#ddd1fb] px-4 py-3 font-mono text-[13px] leading-[1.7] outline-none" />
            <textarea ref={faqDraftRef} value={form.faqDraft} onChange={(e) => setForm((prev) => ({ ...prev, faqDraft: e.target.value }))} placeholder={"FAQs for schema\n\nHow much does dog grooming at home cost?\nDog grooming at home starts at Rs 999.\n\nIs haircut included?\nNo, haircut is not included in Essential Care."} className="min-h-[180px] rounded-[18px] border border-[#ddd1fb] px-4 py-3 text-[13px] leading-[1.7] outline-none" />

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
              <div className="rounded-[16px] bg-[#f8f3ff] p-3">
                <div className="font-black text-[#2a2346]">
                  {form.showOnHomepage ? `#${form.homepagePriority}` : "No"}
                </div>
                <div className="mt-1 text-[#7b738f]">Homepage placement</div>
              </div>
              <div className="rounded-[16px] bg-[#f8f3ff] p-3">
                <div className="font-black text-[#2a2346]">
                  {form.showOnBlogsIndex ? "Visible" : "Hidden"}
                </div>
                <div className="mt-1 text-[#7b738f]">/blogs visibility</div>
              </div>
            </div>
            {form.heroImageUrl || form.coverImageUrl ? (
              <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-[18px] bg-[#f2ecff]">
                <Image src={form.heroImageUrl || form.coverImageUrl} alt="Blog preview" fill unoptimized className="object-cover" />
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                  Live article preview
                </div>
                <p className="mt-1 text-[12px] leading-[1.6] text-[#7b738f]">
                  Uses the same section composition, image treatments, and caption styling as the public article page.
                </p>
              </div>

              <div className="rounded-[20px] border border-[#ece5ff] bg-[#181327] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/60">
                    Mobile article
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/72">
                    Primary preview
                  </div>
                </div>
                <div className="mx-auto max-w-[360px] overflow-hidden rounded-[28px] bg-[#fcfbff] shadow-[0_20px_50px_rgba(10,8,20,0.25)]">
                  <div className="bg-[#1c1630] px-4 pb-5 pt-4 text-white">
                    <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/82">
                      {form.category || "Pet grooming guides"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                      <span className="rounded-full bg-white/10 px-3 py-1">
                        {form.category || "All Tails"}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1">
                        {form.readTimeMinutes} min read
                      </span>
                      {form.primaryKeyword ? (
                        <span className="rounded-full bg-white/10 px-3 py-1">
                          {form.primaryKeyword}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-[26px] font-black leading-[1.02] tracking-[-0.04em] text-white">
                      {form.title || "Article title"}
                    </div>
                    <div className="mt-3 text-[14px] leading-[1.75] text-white/76">
                      {form.excerpt || "Article excerpt appears here."}
                    </div>
                  </div>

                  {(form.heroImageUrl || form.coverImageUrl) ? (
                    <div className="px-3 pt-3">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#efe8ff]">
                        <Image
                          src={form.heroImageUrl || form.coverImageUrl}
                          alt="Article hero preview"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="max-h-[640px] overflow-y-auto px-3 py-3">
                    <ArticleBodyComposition
                      blocks={previewDocument.blocks}
                      faqs={previewDocument.faqs}
                      headings={previewHeadings}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#ece5ff] bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
                    Desktop article
                  </div>
                  <div className="rounded-full bg-[#f3efff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">
                    Layout check
                  </div>
                </div>
                <div className="overflow-hidden rounded-[24px] border border-[#ece5ff] bg-[#fcfbff] shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
                  <div className="grid lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <div className="bg-[#1c1630] px-5 pb-5 pt-4 text-white">
                        <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/82">
                          Pet grooming guides
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                          <span className="rounded-full bg-white/10 px-3 py-1">
                            {form.category || "All Tails"}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1">
                            {form.readTimeMinutes} min read
                          </span>
                        </div>
                        <div className="mt-3 text-[28px] font-black leading-[1.02] tracking-[-0.04em] text-white">
                          {form.title || "Article title"}
                        </div>
                      </div>
                      {(form.heroImageUrl || form.coverImageUrl) ? (
                        <div className="px-4 pt-4">
                          <div className="relative aspect-[16/9] overflow-hidden rounded-[24px] bg-[#efe8ff]">
                            <Image
                              src={form.heroImageUrl || form.coverImageUrl}
                              alt="Desktop article hero preview"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        </div>
                      ) : null}
                      <div className="max-h-[420px] overflow-y-auto px-4 py-4">
                        <ArticleBodyComposition
                          blocks={previewDocument.blocks}
                          faqs={previewDocument.faqs}
                          headings={previewHeadings}
                        />
                      </div>
                    </div>
                    <div className="hidden border-l border-[#ece5ff] bg-white/80 p-3 lg:block">
                      <div className="rounded-[14px] border border-[#ece5ff] bg-[#faf8ff] px-3 py-2 text-[11px] font-semibold text-[#8a84a3]">
                        Reading tools
                      </div>
                      <div className="mt-3 space-y-2">
                        {previewHeadings.slice(0, 6).map((heading) => (
                          <div
                            key={heading.id}
                            className="rounded-[12px] border border-[#f0ebff] bg-white px-3 py-2 text-[11px] font-medium text-[#5f5876]"
                          >
                            {heading.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-[18px] font-bold text-[#2a2346]">Existing posts</div>
              <input
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="Find posts by title, slug, excerpt..."
                className="h-[40px] w-full max-w-[260px] rounded-[14px] border border-[#ddd1fb] px-4 text-[12px] outline-none"
              />
            </div>
            <div className="mt-4 space-y-3">
              {filteredPosts.map((post) => (
                <div key={post.id} className="rounded-[16px] border border-[#eee8ff] px-4 py-3">
                  {(() => {
                    const draft = hydrateForm(post);
                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#2a2346]">{post.title}</div>
                      <div className="mt-1 text-[11px] text-[#8a90a6]">{post.slug}</div>
                      <div className="mt-2 line-clamp-2 text-[12px] text-[#6b7280]">{post.excerpt}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {draft.showOnHomepage ? (
                          <span className="rounded-full bg-[#f4efff] px-2 py-1 text-[10px] font-semibold text-[#6d5bd0]">
                            Homepage #{draft.homepagePriority}
                          </span>
                        ) : null}
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${draft.showOnBlogsIndex ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fff8eb] text-[#b45309]"}`}>
                          {draft.showOnBlogsIndex ? "/blogs visible" : "/blogs hidden"}
                        </span>
                        {draft.featuredLabel ? (
                          <span className="rounded-full bg-[#fff5ee] px-2 py-1 text-[10px] font-semibold text-[#c2410c]">
                            {draft.featuredLabel}
                          </span>
                        ) : null}
                      </div>
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
                      </>
                    );
                  })()}
                </div>
              ))}
              {!filteredPosts.length && !loading ? (
                <div className="rounded-[16px] bg-[#fbf9ff] px-4 py-5 text-[13px] text-[#7b738f]">No blog posts yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
