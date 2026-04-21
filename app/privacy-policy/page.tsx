import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { renderSimpleContentBlocks } from "@/lib/content/markdown";
import { getLegalDocumentBySlug } from "@/lib/content/server";

export const metadata: Metadata = {
  title: "Privacy Policy | All Tails",
  description: "How All Tails collects, uses, stores, and protects customer information.",
};

export default async function PrivacyPolicyPage() {
  const document = await getLegalDocumentBySlug("privacy-policy");
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
