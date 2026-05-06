import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { renderSimpleContentBlocks } from "@/lib/content/markdown";
import { getLegalDocumentBySlug } from "@/lib/content/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms & Conditions | All Tails",
  description: "General terms governing All Tails bookings and service usage.",
  alternates: { canonical: "/terms-and-conditions" },
};

export default async function TermsPage() {
  const document = await getLegalDocumentBySlug("terms-and-conditions");
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
