// File helpers shared by the tools. Everything runs in the browser.
import { zipSync } from "fflate";

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "–";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** "photo.final.png" -> "photo.final" */
export const baseName = (name: string) => name.replace(/\.[^./\\]+$/, "") || name;
export const extOf = (name: string) => (name.match(/\.([^./\\]+)$/)?.[1] ?? "").toLowerCase();

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Makes names unique inside one ZIP: a.png, a (2).png, ... */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const count = seen.get(n) ?? 0;
    seen.set(n, count + 1);
    if (count === 0) return n;
    const ext = extOf(n);
    return `${baseName(n)} (${count + 1})${ext ? "." + ext : ""}`;
  });
}

export async function zipBlobs(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const names = uniqueNames(files.map((f) => f.name));
  const entries: Record<string, Uint8Array> = {};
  await Promise.all(
    files.map(async (f, i) => {
      // Already-compressed formats gain nothing from deflate, so store them.
      entries[names[i]!] = new Uint8Array(await f.blob.arrayBuffer());
    }),
  );
  const zipped = zipSync(
    Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v, { level: 0 }]])) as never,
  );
  return new Blob([zipped as BlobPart], { type: "application/zip" });
}

export function readAsText(file: Blob): Promise<string> {
  return file.text();
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Percent change from `before` to `after`, e.g. -42. */
export const pctChange = (before: number, after: number) =>
  before > 0 ? Math.round(((after - before) / before) * 100) : 0;
