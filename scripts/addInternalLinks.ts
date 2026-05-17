/**
 * Injects targeted internal links into blog post bodies stored in the DB.
 *
 * Strategy:
 * - Breed guides → link to /blogs/dog-grooming-at-home-cost-... and /packages
 * - City guides  → link to /packages and /blogs/dog-grooming-at-home-cost-...
 * - SEO guides   → link to /glossary terms and related guides
 * - Story blogs  → link to relevant breed guide or FAQ
 *
 * Only the FIRST occurrence of a keyword phrase gets a link (no stuffing).
 * Links are injected into paragraph blocks only, never headings or lists.
 * Usage: npx tsx scripts/addInternalLinks.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";
import { parseBlogDocument, stringifyBlogDocument } from "../lib/content/blogFormat";
import type { BlogBlock } from "../lib/content/blogFormat";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type LinkRule = {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
};

function applyLinksToText(text: string, rules: LinkRule[]): string {
  let result = text;
  for (const rule of rules) {
    if (rule.pattern.test(result)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = result.replace(rule.pattern, rule.replacement as any);
    }
  }
  return result;
}

function applyLinksToParagraphBlocks(blocks: BlogBlock[], rules: LinkRule[]): BlogBlock[] {
  const applied = new Set<number>(); // track which rules have been used (once per rule)
  return blocks.map((block) => {
    if (block.type !== "paragraph") return block;
    let text = block.text;
    for (let i = 0; i < rules.length; i++) {
      if (applied.has(i)) continue;
      const rule = rules[i];
      if (rule.pattern.test(text)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        text = text.replace(rule.pattern, rule.replacement as any);
        applied.add(i);
      }
    }
    return text !== block.text ? { ...block, text } : block;
  });
}

const LINK_RULESETS: Record<string, LinkRule[]> = {
  breed: [
    {
      pattern: /\bat-home grooming\b(?! session at|\.in)/i,
      replacement: "[at-home grooming](/blogs/dog-grooming-at-home-cost-process-packages-booking)",
    },
    {
      pattern: /\bgrooming packages?\b(?! page|s start)/i,
      replacement: "[grooming packages](/packages)",
    },
    {
      pattern: /\b(Essential Care|Signature Care|Complete Pampering)\b/,
      replacement: (m: string) => `[${m}](/packages#${m.toLowerCase().replace(/\s+/g, "-")})`,
    },
  ],
  city: [
    {
      pattern: /\bat-home grooming\b(?! session at|\.in)/i,
      replacement: "[at-home grooming](/blogs/dog-grooming-at-home-cost-process-packages-booking)",
    },
    {
      pattern: /\bpackages?\b(?! page|\.)/i,
      replacement: "[packages](/packages)",
    },
  ],
  seo: [
    {
      pattern: /\bhygiene (?:trim|haircut|trimming)\b/i,
      replacement: "[hygiene haircut](/glossary/hygiene-haircut)",
    },
    {
      pattern: /\bde-?shedding\b/i,
      replacement: "[de-shedding](/glossary/de-shedding)",
    },
    {
      pattern: /\banxious pets?\b/i,
      replacement: "[anxious pets](/blogs/how-to-reduce-grooming-anxiety-in-dogs-and-cats)",
    },
    {
      pattern: /\bgrooming frequency\b/i,
      replacement: "[grooming frequency](/blogs/how-often-should-you-groom-your-dog-or-cat)",
    },
  ],
  story: [
    {
      pattern: /\bgrooming\b(?! session at|\.in|er\b)/i,
      replacement: "[grooming](/blogs/dog-grooming-at-home-cost-process-packages-booking)",
    },
    {
      pattern: /\bfrequently asked questions\b|FAQs?\b/i,
      replacement: "[FAQs](/faq)",
    },
  ],
};

// Map slug patterns to link ruleset category
function getRulesetForSlug(slug: string): LinkRule[] | null {
  if (/(shih-tzu|persian-cat|golden-retriever|lhasa-apso|pomeranian|labrador|beagle|indie-dog|cocker-spaniel|pug)-grooming/.test(slug)) {
    return LINK_RULESETS.breed;
  }
  if (/(delhi|gurgaon|noida|chandigarh|ludhiana|patiala|ghaziabad|faridabad|greater-noida|mohali|panchkula)/.test(slug)) {
    return LINK_RULESETS.city;
  }
  if (/(african-grey|cat-anxiety|dog-neutering|goldfish|dog-itching)/.test(slug)) {
    return LINK_RULESETS.story;
  }
  // Remaining SEO/AEO guides
  if (/(grooming-at-home|pet-grooming|professional-vs|how-to|how-often|how-much|which-grooming|what-happens|reduce-grooming|cat-grooming|mobile-grooming)/.test(slug)) {
    return LINK_RULESETS.seo;
  }
  return null;
}

async function main() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: { id: true, slug: true, body: true },
  });

  console.log(`Processing ${posts.length} posts...`);

  for (const post of posts) {
    const rules = getRulesetForSlug(post.slug);
    if (!rules) { console.log(`  skip  ${post.slug}`); continue; }

    const doc = parseBlogDocument(post.body);
    const newBlocks = applyLinksToParagraphBlocks(doc.blocks, rules);
    const changed = JSON.stringify(newBlocks) !== JSON.stringify(doc.blocks);

    if (!changed) { console.log(`  none  ${post.slug}`); continue; }

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { body: stringifyBlogDocument({ ...doc, blocks: newBlocks }) },
    });
    console.log(`  ✓     ${post.slug}`);
  }

  console.log("\nDone.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
