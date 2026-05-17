import type { BlogBlock, BlogFaq } from "./blogFormat";

function stripDividerLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !/^---+$/.test(line.trim()))
    .join("\n")
    .trim();
}

export function stripInlineMarkdown(value: string) {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+---+\s*$/g, "")
    .trim();
}

function parseInlineBulletItems(chunk: string) {
  if (!chunk.trim().startsWith("* ")) return null;
  const normalized = chunk.trim().replace(/^\*\s+/, "");
  const items = normalized
    .split(/\s+\*\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length >= 2 ? items : null;
}

function parseInlineOrderedItems(chunk: string) {
  if (!/^\d+\.\s+/.test(chunk.trim())) return null;
  const matches = [...chunk.trim().matchAll(/\d+\.\s+(.+?)(?=(?:\s+\d+\.\s+)|$)/g)];
  if (matches.length < 2) return null;
  const items = matches.map((match) => match[1].trim()).filter(Boolean);
  return items.length >= 2 ? items : null;
}

export function blockToDraft(block: BlogBlock) {
  if (block.type === "heading") return `${block.level === 3 ? "###" : "##"} ${block.text}`;
  if (block.type === "paragraph") return stripDividerLines(block.text);
  if (block.type === "list") {
    return block.items
      .map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`))
      .join("\n");
  }
  if (block.type === "callout") return `> ${block.title ? `${block.title}: ` : ""}${block.text}`;
  if (block.type === "image") return `![${block.alt}](${block.src})${block.caption ? `\n_${block.caption}_` : ""}`;
  if (block.type === "table") {
    const rows = [block.table.headers, ...block.table.rows];
    return rows.map((row) => row.join(" | ")).join("\n");
  }
  return "";
}

export function parseDraftBlocks(draft: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  const chunks = draft
    .split(/\n\s*\n/g)
    .map((chunk) => stripDividerLines(chunk))
    .filter(Boolean);

  for (const chunk of chunks) {
    if (/^---+$/.test(chunk)) continue;

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
      blocks.push({
        type: "callout",
        title: title || undefined,
        text: rest.join(": ").trim() || text,
      });
      continue;
    }
    if (/^!\[[^\]]*\]\([^)]+\)/.test(chunk)) {
      const match = chunk.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\n_([^_]+)_)?/);
      if (match) {
        blocks.push({
          type: "image",
          alt: match[1] || "Blog image",
          src: match[2],
          caption: match[3]?.trim() || undefined,
        });
        continue;
      }
    }
    if (chunk.split("\n").every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "))) {
      const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length === 1) {
        const inlineItems = parseInlineBulletItems(lines[0]);
        if (inlineItems) {
          blocks.push({ type: "list", items: inlineItems });
          continue;
        }
      }
      blocks.push({
        type: "list",
        items: chunk
          .split("\n")
          .map((line) => line.replace(/^[-*]\s+/, "").trim())
          .filter(Boolean),
      });
      continue;
    }
    if (chunk.split("\n").every((line) => /^\d+\.\s+/.test(line.trim()))) {
      const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length === 1) {
        const inlineItems = parseInlineOrderedItems(lines[0]);
        if (inlineItems) {
          blocks.push({ type: "list", ordered: true, items: inlineItems });
          continue;
        }
      }
      blocks.push({
        type: "list",
        ordered: true,
        items: chunk
          .split("\n")
          .map((line) => line.replace(/^\d+\.\s+/, "").trim())
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
        const bodyRows = rows
          .slice(1)
          .filter((row) => !row.every((cell) => /^[-: ]+$/.test(cell)));
        blocks.push({ type: "table", table: { headers: rows[0], rows: bodyRows } });
        continue;
      }
    }
    const inlineBulletItems = parseInlineBulletItems(chunk);
    if (inlineBulletItems) {
      blocks.push({ type: "list", items: inlineBulletItems });
      continue;
    }
    const inlineOrderedItems = parseInlineOrderedItems(chunk);
    if (inlineOrderedItems) {
      blocks.push({ type: "list", ordered: true, items: inlineOrderedItems });
      continue;
    }
    blocks.push({ type: "paragraph", text: chunk.replace(/\n+/g, " ").trim() });
  }

  return blocks;
}

export function parseFaqDraft(draft: string): BlogFaq[] {
  return draft
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      const question = stripInlineMarkdown(lines[0]?.replace(/^Q:\s*/i, "").trim() || "");
      const answer = stripInlineMarkdown(lines.slice(1).join(" ").replace(/^A:\s*/i, "").trim());
      return { question, answer };
    })
    .filter((faq) => faq.question && faq.answer);
}
