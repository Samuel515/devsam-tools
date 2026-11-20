// Text statistics. Word rules work for any script that separates words with spaces.

// Letters/numbers plus combining marks (tone marks in Yoruba, Vietnamese, etc.).
const WORD = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’\-][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu;

export function analyse(text: string) {
  const words = text.match(WORD) ?? [];
  const chars = [...text].length; // counts emoji as one character
  const noSpaces = [...text.replace(/\s/g, "")].length;
  const sentences = text.trim() ? (text.match(/[^.!?…]+(?:[.!?…]+|$)/g) ?? []).filter((s) => /[\p{L}\p{N}]/u.test(s)).length : 0;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text ? text.split("\n").length : 0;
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), "");
  const avgWord = words.length ? words.reduce((n, w) => n + w.length, 0) / words.length : 0;
  return {
    words: words.length,
    chars,
    noSpaces,
    sentences,
    paragraphs,
    lines,
    longest,
    avgWord,
    avgSentence: sentences ? words.length / sentences : 0,
    readMin: words.length / 238, // average adult silent reading speed
    speakMin: words.length / 150, // typical presentation pace
  };
}

const STOP = new Set(
  "a an and are as at be but by for from has have he her his i if in into is it its me my no not of on or our she so than that the their them then there these they this to too us was we were what when which who will with you your".split(
    " ",
  ),
);

export function keywords(text: string, skipCommon: boolean, limit = 12) {
  const counts = new Map<string, number>();
  const words = (text.toLowerCase().match(WORD) ?? []).filter((w) => w.length > 1 && !(skipCommon && STOP.has(w)));
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const total = words.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count, pct: (count / total) * 100 }));
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return "0 sec";
  const s = Math.round(minutes * 60);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} sec` : `${m} min`;
}

export const LIMITS = [
  { label: "X (Twitter) post", max: 280, unit: "chars" as const },
  { label: "SMS message", max: 160, unit: "chars" as const },
  { label: "Meta description", max: 160, unit: "chars" as const },
  { label: "Page title", max: 60, unit: "chars" as const },
  { label: "Instagram caption", max: 2200, unit: "chars" as const },
  { label: "LinkedIn post", max: 3000, unit: "chars" as const },
];

export type Case = "upper" | "lower" | "title" | "sentence";

export function changeCase(text: string, c: Case) {
  if (c === "upper") return text.toUpperCase();
  if (c === "lower") return text.toLowerCase();
  if (c === "title") return text.toLowerCase().replace(/(^|[\s\-"(“‘])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
  return text.toLowerCase().replace(/(^\s*|[.!?…]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}
