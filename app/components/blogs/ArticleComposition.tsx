import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { normalizeBlogImageUrl, type BlogBlock, type BlogFaq, type BlogTable } from "@/lib/content/blogFormat";

export type ArticleHeadingItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

type ArticleSection = {
  id: string;
  title: string;
  level: 2 | 3;
  blocks: BlogBlock[];
};

export function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const [fullMatch, , boldText, linkLabel, linkHref] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));

    if (boldText) {
      nodes.push(
        <strong key={`bold-${index}`} className="font-semibold text-[#2a2346]">
          {boldText}
        </strong>
      );
    } else if (linkLabel && linkHref) {
      const isInternal = linkHref.startsWith("/");
      if (isInternal) {
        nodes.push(
          <Link
            key={`link-${index}`}
            href={linkHref}
            className="font-semibold text-[#6d5bd0] underline decoration-[#d7ccff] underline-offset-4"
          >
            {linkLabel}
          </Link>
        );
      } else {
        nodes.push(
          <a
            key={`link-${index}`}
            href={linkHref}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#6d5bd0] underline decoration-[#d7ccff] underline-offset-4"
          >
            {linkLabel}
          </a>
        );
      }
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function buildSectionsFromBlocks(blocks: BlogBlock[]) {
  const introBlocks: BlogBlock[] = [];
  const sections: ArticleSection[] = [];
  let currentSection: ArticleSection | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: block.text
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        title: block.text,
        level: block.level ?? 2,
        blocks: [],
      };
      continue;
    }

    if (!currentSection) introBlocks.push(block);
    else currentSection.blocks.push(block);
  }

  if (currentSection) sections.push(currentSection);
  return { introBlocks, sections };
}

function BlogTableView({ table }: { table: BlogTable }) {
  return (
    <div className="my-7 overflow-hidden rounded-[24px] border border-[#e7ddff] bg-white shadow-[0_16px_36px_rgba(73,44,120,0.05)]">
      {/* Mobile: stacked card layout */}
      <div className="divide-y divide-[#efe8ff] sm:hidden">
        {table.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3 space-y-1.5">
            {row.map((cell, cellIndex) => {
              const header = table.headers[cellIndex];
              if (!cell.trim()) return null;
              return (
                <div key={cellIndex} className="flex gap-2 text-[13px] leading-[1.6]">
                  {header ? (
                    <span className="shrink-0 font-black text-[#2a2346] w-[38%]">
                      {renderInlineMarkdown(header)}
                    </span>
                  ) : null}
                  <span className="text-[#5f6474]">{renderInlineMarkdown(cell)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Desktop: standard table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-max w-full text-left text-[14px]">
          <thead className="bg-[#f7f1ff] text-[#2a2346]">
            <tr>
              {table.headers.map((header) => (
                <th key={header} className="whitespace-nowrap px-4 py-3 font-black">
                  {renderInlineMarkdown(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efe8ff] text-[#5f6474]">
            {table.rows.map((row, index) => (
              <tr key={`${row.join("-")}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="whitespace-nowrap px-4 py-3 align-top">
                    {renderInlineMarkdown(cell)}
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

function imageVariantClass(sectionIndex: number, imageIndex: number) {
  const variant = (sectionIndex + imageIndex) % 3;
  if (variant === 0) {
    return {
      frame: "rounded-[26px] border border-[#ebe3ff] bg-[#f7f1ff] p-2 shadow-[0_24px_60px_rgba(73,44,120,0.08)]",
      media: "aspect-[16/10] rounded-[22px]",
      caption: "mt-3 text-center text-[13px] leading-[1.65] text-[#7a728d]",
    };
  }
  if (variant === 1) {
    return {
      frame: "rounded-[30px] bg-[linear-gradient(135deg,#efe5ff_0%,#fff6ef_100%)] p-3 shadow-[0_24px_60px_rgba(73,44,120,0.09)]",
      media: "aspect-[4/5] rounded-[24px] sm:aspect-[16/10]",
      caption: "mt-3 px-1 text-center text-[13px] leading-[1.65] text-[#746d88]",
    };
  }
  return {
    frame: "rounded-[26px] border border-[#f0e8ff] bg-white p-2 shadow-[0_20px_44px_rgba(73,44,120,0.06)]",
    media: "aspect-[3/4] rounded-[22px] sm:aspect-[16/9]",
    caption: "mt-3 text-left text-[13px] leading-[1.65] text-[#7a728d]",
  };
}

function BlogImageFigure({
  block,
  sectionIndex,
  imageIndex,
  showcase = false,
}: {
  block: Extract<BlogBlock, { type: "image" }>;
  sectionIndex: number;
  imageIndex: number;
  showcase?: boolean;
}) {
  const variant = imageVariantClass(sectionIndex, imageIndex);

  if (showcase) {
    return (
      <figure className="relative">
        <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[32px] bg-[linear-gradient(135deg,rgba(109,91,208,0.12),rgba(247,201,109,0.10))] blur-[2px]" />
        <div className="relative rounded-[30px] border border-[#ece2ff] bg-[linear-gradient(135deg,#f4ecff_0%,#fff6ef_100%)] p-3 shadow-[0_28px_70px_rgba(73,44,120,0.10)]">
          <div className="overflow-hidden rounded-[24px] bg-[#efe8ff]">
            <Image
              src={normalizeBlogImageUrl(block.src) || "/images/Banner.jpg"}
              alt={block.alt}
              width={800}
              height={600}
              className="h-auto w-full"
            />
          </div>
        </div>
        {block.caption ? (
          <figcaption className="mt-3 px-2 text-center text-[13px] leading-[1.65] text-[#776f89]">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="my-8">
      <div className={variant.frame}>
        <div className="overflow-hidden rounded-[inherit] bg-[#efe8ff]">
          <Image
            src={normalizeBlogImageUrl(block.src) || "/images/Banner.jpg"}
            alt={block.alt}
            width={800}
            height={600}
            className="h-auto w-full"
          />
        </div>
      </div>
      {block.caption ? <figcaption className={variant.caption}>{block.caption}</figcaption> : null}
    </figure>
  );
}

function BlogBodyBlock({
  block,
  sectionIndex,
  imageIndex,
}: {
  block: BlogBlock;
  sectionIndex: number;
  imageIndex: number;
}) {
  if (block.type === "paragraph") {
    return (
      <p className="mt-4 text-[15px] leading-[1.88] text-[#4d5568] sm:text-[16px]">
        {renderInlineMarkdown(block.text)}
      </p>
    );
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag
        className={`mt-5 grid gap-2 text-[15px] leading-[1.78] text-[#545a6c] ${
          block.ordered ? "list-decimal pl-5" : "sm:grid-cols-2"
        }`}
      >
        {block.items.map((item) => (
          <li
            key={item}
            className={`rounded-[16px] border border-[#eee7ff] px-4 py-3 ${
              block.ordered ? "bg-[#fcfbff]" : "bg-white"
            }`}
          >
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "table") {
    return <BlogTableView table={block.table} />;
  }

  if (block.type === "image") {
    return <BlogImageFigure block={block} sectionIndex={sectionIndex} imageIndex={imageIndex} />;
  }

  if (block.type === "callout") {
    return (
      <div className="my-7 rounded-[24px] border border-[#eadfff] bg-[#f8f2ff] px-5 py-5 text-[#4d426f] shadow-[0_12px_30px_rgba(73,44,120,0.04)]">
        {block.title ? (
          <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6d5bd0]">
            {block.title}
          </div>
        ) : null}
        <p className={block.title ? "mt-2 text-[16px] leading-[1.8]" : "text-[16px] leading-[1.8]"}>
          {block.text}
        </p>
      </div>
    );
  }

  return null;
}

function renderBlockStream(blocks: BlogBlock[], sectionIndex: number, startingImageIndex = 0) {
  let currentImageIndex = startingImageIndex;
  return blocks.map((block, index) => {
    const imageIndex = currentImageIndex;
    if (block.type === "image") currentImageIndex += 1;
    return (
      <BlogBodyBlock
        key={`${block.type}-${sectionIndex}-${index}`}
        block={block}
        sectionIndex={sectionIndex}
        imageIndex={imageIndex}
      />
    );
  });
}

function ArticleIntro({
  introBlocks,
  headings,
}: {
  introBlocks: BlogBlock[];
  headings: ArticleHeadingItem[];
}) {
  if (!introBlocks.length && !headings.length) return null;

  const introParagraphs = introBlocks.filter(
    (block): block is Extract<BlogBlock, { type: "paragraph" }> => block.type === "paragraph"
  );

  // On mobile: show intro text then a compact horizontal-scroll chip row of jump links
  // On desktop: intro text on left, jump links panel on right
  return (
    <section className="rounded-[30px] border border-[#eee7ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] px-5 py-6 shadow-[0_18px_50px_rgba(73,44,120,0.05)] sm:px-8 sm:py-8">
      {introParagraphs.length ? (
        <div className="lg:hidden">
          {renderBlockStream(introParagraphs, -1)}
        </div>
      ) : null}

      {headings.length ? (
        <div className="mt-5 lg:hidden">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a84a3]">
            Jump to a section
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {headings.filter((h) => h.level === 2).slice(0, 8).map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                className="shrink-0 rounded-full border border-[#e6defd] bg-white px-3 py-2 text-[12px] font-semibold text-[#4b4370] transition active:bg-[#f3efff]"
              >
                {heading.text}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="hidden lg:grid lg:mt-5 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>{introParagraphs.length ? renderBlockStream(introParagraphs, -1) : null}</div>
        {headings.length ? (
          <div className="rounded-[24px] border border-[#ede5ff] bg-[#fbf9ff] p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a84a3]">
              Jump through the guide
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {headings.slice(0, 8).map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className="rounded-full border border-[#e6defd] bg-white px-3 py-2 text-[12px] font-semibold text-[#4b4370] transition hover:border-[#d3c3ff] hover:text-[#241c3f]"
                >
                  {heading.text}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ArticleSectionView({
  section,
  index,
}: {
  section: ArticleSection;
  index: number;
}) {
  const leadParagraphIndex = section.blocks.findIndex((block) => block.type === "paragraph");
  const showcaseImageIndex = section.blocks.findIndex((block) => block.type === "image");

  const leadParagraph =
    leadParagraphIndex >= 0
      ? (section.blocks[leadParagraphIndex] as Extract<BlogBlock, { type: "paragraph" }>)
      : null;
  const showcaseImage =
    showcaseImageIndex >= 0
      ? (section.blocks[showcaseImageIndex] as Extract<BlogBlock, { type: "image" }>)
      : null;

  const bodyBlocks = section.blocks.filter((_, blockIndex) => {
    if (leadParagraph && blockIndex === leadParagraphIndex) return false;
    if (showcaseImage && blockIndex === showcaseImageIndex) return false;
    return true;
  });

  const imageStarts = showcaseImage ? 1 : 0;
  const isEven = index % 2 === 0;

  return (
    <section className="relative mt-7 border-t border-[#efe8ff] pt-7 first:mt-0 first:border-t-0 first:pt-0 sm:mt-10 sm:pt-10">
      <div className="mb-5 flex items-center gap-3">
        <div className="hidden rounded-full bg-[#f3efff] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#6d5bd0] sm:block">
          Section {String(index + 1).padStart(2, "0")}
        </div>
        <div className="h-px flex-1 bg-[linear-gradient(90deg,#dccdff_0%,rgba(220,205,255,0.1)_100%)]" />
      </div>

      <div className={`grid gap-7 ${showcaseImage ? "xl:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
        <div className={showcaseImage && !isEven ? "xl:order-2" : ""}>
          <h2
            id={section.id}
            className={`scroll-mt-24 font-black tracking-[-0.035em] text-[#2a2346] ${
              section.level === 3 ? "text-[20px] sm:text-[24px]" : "text-[24px] sm:text-[30px] lg:text-[34px]"
            }`}
          >
            {section.title}
          </h2>

          {leadParagraph ? (
            <p className="mt-4 max-w-[720px] text-[16px] leading-[1.85] text-[#50586b] sm:text-[18px]">
              {renderInlineMarkdown(leadParagraph.text)}
            </p>
          ) : null}

          {bodyBlocks.length ? <div className="mt-5">{renderBlockStream(bodyBlocks, index, imageStarts)}</div> : null}
        </div>

        {showcaseImage ? (
          <div className={showcaseImage && !isEven ? "xl:order-1" : ""}>
            <BlogImageFigure block={showcaseImage} sectionIndex={index} imageIndex={0} showcase />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ArticleBodyComposition({
  blocks,
  faqs,
  headings,
}: {
  blocks: BlogBlock[];
  faqs: BlogFaq[];
  headings: ArticleHeadingItem[];
}) {
  const { introBlocks, sections } = buildSectionsFromBlocks(blocks);

  return (
    <div className="space-y-8">
      <ArticleIntro introBlocks={introBlocks} headings={headings} />

      <div className="rounded-[30px] border border-[#eee7ff] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(73,44,120,0.05)] sm:px-8 sm:py-8">
        {sections.length ? sections.map((section, index) => <ArticleSectionView key={section.id} section={section} index={index} />) : renderBlockStream(blocks, 0)}

        {faqs.length ? (
          <section className="mt-12 border-t border-[#efe8ff] pt-10">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#f3efff] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#6d5bd0]">
                FAQs
              </div>
              <div className="h-px flex-1 bg-[linear-gradient(90deg,#dccdff_0%,rgba(220,205,255,0.1)_100%)]" />
            </div>
            <h2 className="mt-5 text-[22px] font-black tracking-[-0.03em] text-[#2a2346] sm:text-[28px]">
              Quick answers before you book
            </h2>
            <div className="mt-5 space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-[20px] border border-[#eadfff] bg-[#fcfaff] px-4 py-4"
                >
                  <summary className="cursor-pointer text-[15px] font-black text-[#2a2346]">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-[14px] leading-[1.8] text-[#5f6474]">
                    {renderInlineMarkdown(faq.answer)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
