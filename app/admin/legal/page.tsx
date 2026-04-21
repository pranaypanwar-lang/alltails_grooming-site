"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPageHeader } from "../components/common/AdminPageHeader";

type LegalDocumentRow = {
  slug: string;
  title: string;
  summary: string;
  effectiveDate: string;
  body: string;
};

export default function AdminLegalPage() {
  const [documents, setDocuments] = useState<LegalDocumentRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [form, setForm] = useState<LegalDocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/legal-documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load legal documents.");
      const docs = data.documents || [];
      setDocuments(docs);
      if (!selectedSlug && docs[0]) {
        setSelectedSlug(docs[0].slug);
        setForm(docs[0]);
      } else if (selectedSlug) {
        const current = docs.find((doc: LegalDocumentRow) => doc.slug === selectedSlug);
        if (current) setForm(current);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load legal documents.");
    } finally {
      setLoading(false);
    }
  }, [selectedSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/legal-documents/${form.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save legal document.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save legal document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Legal"
        subtitle="Edit public legal and policy pages without changing code."
        onRefresh={() => void load()}
        isRefreshing={loading}
      />

      {error ? (
        <div className="rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          <div className="text-[18px] font-bold text-[#2a2346]">Documents</div>
          <div className="mt-4 space-y-3">
            {documents.map((document) => (
              <button
                key={document.slug}
                type="button"
                onClick={() => {
                  setSelectedSlug(document.slug);
                  setForm(document);
                }}
                className={`w-full rounded-[16px] border px-4 py-3 text-left ${selectedSlug === document.slug ? "border-[#6d5bd0] bg-[#faf8ff]" : "border-[#eee8ff] bg-white"}`}
              >
                <div className="text-[14px] font-semibold text-[#2a2346]">{document.title}</div>
                <div className="mt-1 text-[11px] text-[#8a90a6]">{document.slug}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#ece5ff] bg-white p-5 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
          {!form ? (
            <div className="text-[13px] text-[#8a90a6]">Select a legal document to edit.</div>
          ) : (
            <div className="grid gap-4">
              <input value={form.title} onChange={(e) => setForm((prev) => prev ? { ...prev, title: e.target.value } : prev)} placeholder="Title" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
              <input value={form.summary} onChange={(e) => setForm((prev) => prev ? { ...prev, summary: e.target.value } : prev)} placeholder="Summary" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
              <input value={form.effectiveDate} onChange={(e) => setForm((prev) => prev ? { ...prev, effectiveDate: e.target.value } : prev)} placeholder="Effective date" className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none" />
              <textarea value={form.body} onChange={(e) => setForm((prev) => prev ? { ...prev, body: e.target.value } : prev)} placeholder="Body" className="min-h-[420px] rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[13px] outline-none" />
              <p className="text-[12px] leading-[1.7] text-[#8a90a6]">
                Use <span className="font-semibold">## Section title</span> for headings and start list lines with <span className="font-semibold">- </span>.
              </p>
              <button onClick={() => void save()} disabled={saving} className="inline-flex h-[42px] w-fit items-center rounded-[14px] bg-[#6d5bd0] px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                {saving ? "Saving…" : "Save legal document"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
