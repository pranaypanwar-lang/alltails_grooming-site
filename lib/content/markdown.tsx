import type { ReactNode } from "react";

type ParsedSection = {
  title: string;
  blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
  >;
};

export function parseSimpleContent(body: string): ParsedSection[] {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const rawSections = normalized.split(/\n(?=## )/g);

  return rawSections.map((sectionText, index) => {
    const lines = sectionText.split("\n");
    const firstLine = lines[0] || "";
    const title = firstLine.startsWith("## ")
      ? firstLine.replace(/^##\s+/, "").trim()
      : index === 0
        ? "Overview"
        : `Section ${index + 1}`;

    const contentLines = firstLine.startsWith("## ") ? lines.slice(1) : lines;
    const paragraphs = contentLines.join("\n").split(/\n\s*\n/g);
    const blocks: ParsedSection["blocks"] = [];

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      const linesInBlock = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
      const isList = linesInBlock.every((line) => line.startsWith("- "));

      if (isList) {
        blocks.push({
          type: "list",
          items: linesInBlock.map((line) => line.replace(/^- /, "").trim()),
        });
      } else {
        blocks.push({
          type: "paragraph",
          text: linesInBlock.join(" "),
        });
      }
    }

    return { title, blocks };
  });
}

export function renderSimpleContentBlocks(
  body: string
): Array<{ title: string; content: ReactNode }> {
  return parseSimpleContent(body).map((section) => ({
    title: section.title,
    content: (
      <div className="space-y-4">
        {section.blocks.map((block, index) =>
          block.type === "paragraph" ? (
            <p key={`${section.title}-${index}`}>{block.text}</p>
          ) : (
            <ul
              key={`${section.title}-${index}`}
              className="list-disc space-y-2 pl-5"
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )
        )}
      </div>
    ),
  }));
}
