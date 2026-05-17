"use client";

import { Copy, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type HeadingItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

function useReadingState(headings: HeadingItem[]) {
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState<string>(headings[0]?.id || "");

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (scrollTop / total) * 100)) : 0);

      let next = headings[0]?.id || "";
      for (const heading of headings) {
        const el = document.getElementById(heading.id);
        if (el && el.getBoundingClientRect().top <= 160) next = heading.id;
      }
      setActiveHeading(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [headings]);

  return { progress, activeHeading };
}

// Thin fixed reading progress bar — mobile only
export function MobileReadingProgressBar({ headings }: { headings: HeadingItem[] }) {
  const { progress } = useReadingState(headings);
  return (
    <div className="fixed left-0 right-0 top-0 z-[70] h-[3px] bg-[#e8e0ff] lg:hidden">
      <div
        className="h-full bg-[#6d5bd0] transition-[width] duration-200"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Mobile share strip — rendered after article body, before related posts
export function MobileShareStrip({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(title + "\n" + (typeof window !== "undefined" ? window.location.href : ""))}`;

  return (
    <div className="rounded-[24px] border border-[#ece5ff] bg-white px-5 py-5 shadow-[0_16px_42px_rgba(73,44,120,0.04)] lg:hidden">
      <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
        Found this useful?
      </div>
      <p className="mt-1 text-[14px] text-[#5f6474]">Share this guide with other pet parents.</p>
      <div className="mt-4 flex gap-3">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center rounded-[16px] bg-[#25d366] py-3 text-[14px] font-bold text-white"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex flex-1 items-center justify-center rounded-[16px] border border-[#ddd1fb] py-3 text-[14px] font-bold text-[#4b4370]"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

// Full desktop sidebar widget
export function ArticleReadingTools({
  title,
  excerpt,
  headings,
}: {
  title: string;
  excerpt: string;
  headings: HeadingItem[];
}) {
  const { progress, activeHeading } = useReadingState(headings);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: excerpt, url: shareUrl });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(shareUrl);
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(`${title}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const sectionLabel = useMemo(() => {
    const current = headings.find((h) => h.id === activeHeading);
    return current?.text || "Opening";
  }, [activeHeading, headings]);

  return (
    <aside className="space-y-5">
      <div className="overflow-hidden rounded-[24px] border border-[#31264f] bg-[#241c3f] text-white shadow-[0_22px_56px_rgba(36,28,63,0.22)]">
        <div className="h-1.5 w-full bg-white/10">
          <div
            className="h-full bg-[#f7c96d] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
            Reading progress
          </div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-[30px] font-black tracking-[-0.04em]">
                {Math.round(progress)}%
              </div>
              <div className="text-[13px] text-white/72">
                Currently on {sectionLabel}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/82">
                Scroll-aware
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">
                {headings.length} sections
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[16px] bg-white text-[13px] font-semibold text-[#241c3f]"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[16px] border border-white/14 bg-white/8 text-[13px] font-semibold text-white/92"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(shareUrl)}
              className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[16px] border border-white/14 bg-white/8 text-[13px] font-semibold text-white/92"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
        </div>
      </div>

      {headings.length ? (
        <div className="rounded-[24px] border border-[#ebe5ff] bg-white p-5 shadow-[0_16px_40px_rgba(73,44,120,0.05)]">
          <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
            Jump through the guide
          </div>
          <nav className="mt-4 space-y-2">
            {headings.map((heading) => {
              const active = heading.id === activeHeading;
              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`block rounded-[16px] border px-3 py-2.5 text-[13px] leading-[1.55] transition ${
                    active
                      ? "border-[#ddd0ff] bg-[#f3efff] font-semibold text-[#241c3f]"
                      : "border-transparent text-[#4b4370] hover:border-[#eee7ff] hover:bg-[#f7f1ff]"
                  } ${heading.level === 3 ? "ml-3" : ""}`}
                >
                  {heading.text}
                </a>
              );
            })}
          </nav>
        </div>
      ) : null}
    </aside>
  );
}
