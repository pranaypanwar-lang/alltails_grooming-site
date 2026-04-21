import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { renderSimpleContentBlocks } from "@/lib/content/markdown";
import { getLegalDocumentBySlug } from "@/lib/content/server";

export const metadata: Metadata = {
  title: "Refund Policy | All Tails",
  description: "How All Tails handles refunds and payment reversals.",
};

export default async function RefundPolicyPage() {
  const document = await getLegalDocumentBySlug("refund-policy");
  if (!document) return null;

  return (
    <LegalPageShell
      title={document.title}
      summary={document.summary}
      effectiveDate={document.effectiveDate}
      sections={renderSimpleContentBlocks(document.body)}
    />
  );
}
