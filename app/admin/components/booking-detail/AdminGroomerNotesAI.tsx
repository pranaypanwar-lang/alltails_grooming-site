"use client";

import { useState } from "react";
import { saveGroomerStepNote } from "../../lib/api";
import { useAdminToast } from "../common/AdminToastProvider";
import type { AdminBookingSopStep } from "../../types";

type Props = {
  bookingId: string;
  serviceName: string;
  petName: string;
  breed: string;
  groomingNotes: string;
  stylingNotes: string;
  temperament?: string;
  steps: AdminBookingSopStep[];
  onApplied: () => Promise<void> | void;
};

type ParsedNote = { key: string; note: string };

// Structured output format the AI is instructed to return:
//   [step_key]
//   Note text here
//
//   [next_step_key]
//   Note text here (or "NO_NOTE" to skip)
function parseStructuredResponse(raw: string, validKeys: Set<string>): ParsedNote[] {
  const results: ParsedNote[] = [];
  // Match [key] followed by the text until next [key] or end
  const regex = /\[([a-z_]+)\]\s*\n([\s\S]*?)(?=\n\[[a-z_]+\]|$)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const key = match[1].trim();
    const note = match[2].trim();
    if (validKeys.has(key) && note && note !== "NO_NOTE") {
      results.push({ key, note });
    }
  }
  return results;
}

function buildPrompt(params: {
  serviceName: string;
  petName: string;
  breed: string;
  groomingNotes: string;
  stylingNotes: string;
  temperament: string;
  steps: AdminBookingSopStep[];
}): string {
  const { serviceName, petName, breed, groomingNotes, stylingNotes, temperament, steps } = params;
  const nonPaymentSteps = steps.filter((s) => s.key !== "payment_proof" && s.key !== "review_proof");

  const stepList = nonPaymentSteps
    .map((s) => `  [${s.key}] — ${s.label}`)
    .join("\n");

  const temperamentNote = temperament
    ? `- Temperament: ${temperament}`
    : "- Temperament: Not specified";

  return `You are a senior pet grooming operations expert at All Tails, a premium in-home dog grooming service in India.

Your task: Generate precise, actionable per-step groomer notes for an upcoming grooming session. These notes will appear directly on the groomer's phone during the session — keep them short, specific, and direct.

─────────────────────────────
PET & SESSION DETAILS
─────────────────────────────
- Pet name: ${petName || "Not specified"}
- Breed: ${breed || "Not specified"}
- Service: ${serviceName}
${temperamentNote}
- Pet parent's grooming notes: ${groomingNotes || "None provided"}
- Pet parent's styling notes: ${stylingNotes || "None provided"}

─────────────────────────────
SOP STEPS FOR THIS SESSION
─────────────────────────────
${stepList}

─────────────────────────────
INSTRUCTIONS
─────────────────────────────
For each step key, write a groomer note that:
1. Is specific to THAT step only — do not repeat the same advice across multiple steps
2. Combines the pet parent's wishes with professional grooming best practices
3. Is written directly to the groomer ("Use...", "Be careful...", "Check for...")
4. Is 1–3 sentences maximum — the groomer reads this on a phone mid-session
5. Addresses breed-specific grooming considerations where relevant
6. Flags any safety concerns clearly (biting tendency, skin sensitivity, anxiety triggers)
7. If no relevant instruction applies to a step, write exactly: NO_NOTE

─────────────────────────────
REQUIRED OUTPUT FORMAT
─────────────────────────────
Return ONLY the following format — no headers, no explanation, no markdown, nothing else:

[step_key]
Note text or NO_NOTE

[step_key]
Note text or NO_NOTE

...one block per step, in the same order as listed above.

─────────────────────────────
EXAMPLE OUTPUT (for reference only — do not copy)
─────────────────────────────
[pet_settled]
Bruno is a wiggle worrier — sit on the floor with him for 2–3 minutes before touching. Let him sniff your hands first.

[oil_massage_proof]
NO_NOTE

[bath_dry_proof]
Use oatmeal shampoo only — owner confirmed regular shampoo caused a rash last time. Rinse thoroughly around belly and groin where mats tend to form.
─────────────────────────────

Now generate notes for the session above.`;
}

export function AdminGroomerNotesAI({
  bookingId,
  serviceName,
  petName,
  breed,
  groomingNotes,
  stylingNotes,
  temperament,
  steps,
  onApplied,
}: Props) {
  const { showToast } = useAdminToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pastedResponse, setPastedResponse] = useState("");
  const [parsed, setParsed] = useState<ParsedNote[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);

  const nonPaymentSteps = steps.filter((s) => s.key !== "payment_proof" && s.key !== "review_proof");
  const validKeys = new Set(nonPaymentSteps.map((s) => s.key));

  const prompt = buildPrompt({ serviceName, petName, breed, groomingNotes, stylingNotes, temperament: temperament ?? "", steps });

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Copy failed — select the text manually.", false);
    }
  };

  const handleParse = () => {
    if (!pastedResponse.trim()) {
      showToast("Paste the AI response first.", false);
      return;
    }
    const results = parseStructuredResponse(pastedResponse, validKeys);
    if (!results.length) {
      showToast("Could not parse any step notes. Make sure the AI followed the format.", false);
      return;
    }
    setParsed(results);
    const initialDrafts: Record<string, string> = {};
    for (const n of results) {
      initialDrafts[n.key] = n.note;
    }
    setDrafts(initialDrafts);
  };

  const handleApplyAll = async () => {
    const toSave = Object.entries(drafts).filter(([, note]) => note.trim() !== "");
    if (!toSave.length) {
      showToast("No notes to apply.", false);
      return;
    }
    setApplying(true);
    let saved = 0;
    let failed = 0;
    for (const [key, note] of toSave) {
      try {
        await saveGroomerStepNote(bookingId, key, note.trim());
        saved++;
      } catch {
        failed++;
      }
    }
    setApplying(false);
    showToast(
      failed > 0 ? `${saved} saved, ${failed} failed.` : `${saved} groomer note${saved > 1 ? "s" : ""} saved.`,
      failed === 0
    );
    await onApplied();
    setOpen(false);
    setPastedResponse("");
    setParsed(null);
    setDrafts({});
  };

  return (
    <div className="mb-4 rounded-[18px] border border-[#c4b5fd] bg-[#faf8ff]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6d5bd0] text-[13px] font-black text-white">
            ✦
          </div>
          <div className="text-left">
            <div className="text-[13px] font-bold text-[#2a2346]">AI Groomer Notes</div>
            <div className="text-[11px] text-[#8a90a6]">Copy prompt → paste into ChatGPT/Claude → paste response back</div>
          </div>
        </div>
        <span className="text-[12px] font-semibold text-[#6d5bd0]">{open ? "Close ↑" : "Open ↓"}</span>
      </button>

      {open ? (
        <div className="border-t border-[#ece5ff] px-4 pb-5 pt-4 space-y-4">

          {/* Step 1: Context chips + copy prompt */}
          <div>
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#6d5bd0]">
              Step 1 — Copy this prompt into ChatGPT or Claude
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {petName ? (
                <span className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-[11px] font-semibold text-[#5b21b6]">{petName} · {breed}</span>
              ) : null}
              <span className="rounded-full bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">{serviceName}</span>
              {groomingNotes ? <span className="rounded-full bg-[#fffbeb] px-2.5 py-1 text-[11px] font-semibold text-[#92400e]">Grooming notes ✓</span> : null}
              {stylingNotes ? <span className="rounded-full bg-[#fffbeb] px-2.5 py-1 text-[11px] font-semibold text-[#92400e]">Styling notes ✓</span> : null}
              <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#374151]">{nonPaymentSteps.length} steps</span>
            </div>

            {/* Collapsible prompt preview */}
            <details className="rounded-[12px] border border-[#ddd1fb] bg-white">
              <summary className="cursor-pointer px-3 py-2.5 text-[12px] font-semibold text-[#6d5bd0]">
                Preview prompt ↓
              </summary>
              <pre className="max-h-[200px] overflow-y-auto border-t border-[#ece5ff] px-3 py-2.5 text-[11px] leading-[1.65] text-[#4b5563] whitespace-pre-wrap">
                {prompt}
              </pre>
            </details>

            <button
              type="button"
              onClick={() => void handleCopyPrompt()}
              className={`mt-3 flex h-[40px] w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-bold transition-colors ${
                copied
                  ? "bg-[#16a34a] text-white"
                  : "bg-[#6d5bd0] text-white hover:bg-[#5b4ab5]"
              }`}
            >
              {copied ? "✓ Prompt copied!" : "Copy prompt to clipboard"}
            </button>
          </div>

          {/* Step 2: Paste AI response */}
          <div>
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#6d5bd0]">
              Step 2 — Paste the AI response here
            </div>
            <textarea
              value={pastedResponse}
              onChange={(e) => { setPastedResponse(e.target.value); setParsed(null); }}
              rows={8}
              placeholder={`Paste the AI output here. It should look like:\n\n[pet_settled]\nBruno is a wiggle worrier — sit on the floor with him for 2–3 min before touching.\n\n[bath_dry_proof]\nUse oatmeal shampoo — sensitive belly. Low heat on dryer.`}
              className="w-full resize-none rounded-[12px] border border-[#ddd1fb] px-3 py-2.5 text-[12px] leading-[1.6] text-[#2a2346] outline-none focus:border-[#6d5bd0] placeholder:text-[#c4b5fd]"
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={!pastedResponse.trim()}
              className="mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#6d5bd0] text-[13px] font-bold text-[#6d5bd0] disabled:opacity-40 hover:bg-[#f5f3ff]"
            >
              Parse response
            </button>
          </div>

          {/* Step 3: Review & apply */}
          {parsed ? (
            <div>
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#6d5bd0]">
                Step 3 — Review & apply ({parsed.length} notes parsed)
              </div>
              <div className="space-y-2">
                {parsed.map((n) => {
                  const step = nonPaymentSteps.find((s) => s.key === n.key);
                  if (!step) return null;
                  return (
                    <div key={n.key} className="rounded-[12px] border border-[#ece5ff] bg-white p-3">
                      <div className="mb-1.5 text-[12px] font-semibold text-[#2a2346]">{step.label}</div>
                      <textarea
                        value={drafts[n.key] ?? n.note}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [n.key]: e.target.value }))}
                        rows={2}
                        className="w-full resize-none rounded-[8px] border border-[#e5e7eb] px-2.5 py-2 text-[12px] leading-[1.55] text-[#374151] outline-none focus:border-[#6d5bd0]"
                      />
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => void handleApplyAll()}
                disabled={applying}
                className="mt-3 flex h-[44px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#16a34a] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(22,163,74,0.25)] disabled:opacity-50"
              >
                {applying ? "Saving…" : `Apply ${parsed.length} notes to steps`}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
