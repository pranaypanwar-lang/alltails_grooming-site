/**
 * Bilingual note convention: "English text || हिंदी टेक्स्ट"
 * If no || delimiter, the same text is shown in both modes.
 */

export function resolveNote(raw: string | null | undefined, mode: "simple" | "hindi"): string | null {
  if (!raw?.trim()) return null;
  const idx = raw.indexOf("||");
  if (idx === -1) return raw.trim();
  const en = raw.slice(0, idx).trim();
  const hi = raw.slice(idx + 2).trim();
  if (mode === "hindi") return hi || en; // fall back to English if Hindi side is empty
  return en;
}

/** Splits a stored bilingual note into its two parts for editing. */
export function splitBilingualNote(raw: string | null | undefined): { en: string; hi: string } {
  if (!raw) return { en: "", hi: "" };
  const idx = raw.indexOf("||");
  if (idx === -1) return { en: raw.trim(), hi: "" };
  return { en: raw.slice(0, idx).trim(), hi: raw.slice(idx + 2).trim() };
}

/** Joins English + Hindi into the stored format. Returns just the English if Hindi is empty. */
export function joinBilingualNote(en: string, hi: string): string {
  const e = en.trim();
  const h = hi.trim();
  if (!e && !h) return "";
  if (!h) return e;
  return `${e} || ${h}`;
}
