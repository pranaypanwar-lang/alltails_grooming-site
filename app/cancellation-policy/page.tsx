import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { renderSimpleContentBlocks } from "@/lib/content/markdown";
import { getLegalDocumentBySlug } from "@/lib/content/server";

export const metadata: Metadata = {
  title: "Cancellation Policy | All Tails",
  description: "All Tails cancellation and rescheduling expectations for customers.",
};

export default async function CancellationPolicyPage() {
  const document = await getLegalDocumentBySlug("cancellation-policy");
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
