// PDF operations with pdf-lib. Everything runs in the browser.
import { degrees, PDFDocument, PageSizes } from "pdf-lib";
import { decodeImage, resizeCanvas } from "@devsam/ui/lib/image";
import { sniffKind } from "@devsam/ui/lib/image";

export async function load(buf: ArrayBuffer): Promise<PDFDocument> {
  try {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false });
    if (doc.isEncrypted) {
      throw new Error("This PDF is password protected. Remove the password first, then try again.");
    }
    return doc;
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("password")) throw e;
    throw new Error("This file isn't a valid PDF, or it's damaged.");
  }
}

const finish = (doc: PDFDocument) => {
  doc.setProducer("devsam PDF Toolkit");
  doc.setCreator("pdf.devsamc.xyz");
  return doc.save({ useObjectStreams: true });
};

export const toBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: "application/pdf" });

/** Merges whole documents in order. */
export async function merge(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await load(buf);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return finish(out);
}

export type PagePlan = { index: number; rotation: number };

/** Builds a new PDF from a list of source pages, each with an extra rotation. */
export async function build(buf: ArrayBuffer, plan: PagePlan[]): Promise<Uint8Array> {
  const src = await load(buf);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, plan.map((p) => p.index));
  pages.forEach((page, i) => {
    const extra = plan[i]!.rotation;
    if (extra) page.setRotation(degrees((page.getRotation().angle + extra + 360) % 360));
    out.addPage(page);
  });
  return finish(out);
}

/** Splits into one PDF per group of 0-based page indices. */
export async function split(buf: ArrayBuffer, groups: number[][]): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for (const g of groups) out.push(await build(buf, g.map((index) => ({ index, rotation: 0 }))));
  return out;
}

/**
 * Parses "1-3, 5, 8-" into groups of 0-based indices (one group per comma part).
 * Throws a readable error for bad input.
 */
export function parseRanges(input: string, pageCount: number): number[][] {
  const parts = input.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error("Enter at least one page or range, like 1-3, 5.");
  return parts.map((part) => {
    const m = part.match(/^(\d*)\s*[-–]\s*(\d*)$/);
    let a: number, b: number;
    if (m) {
      a = m[1] ? Number(m[1]) : 1;
      b = m[2] ? Number(m[2]) : pageCount;
    } else if (/^\d+$/.test(part)) {
      a = b = Number(part);
    } else {
      throw new Error(`"${part}" isn't a page number or range.`);
    }
    if (a < 1 || b < 1 || a > pageCount || b > pageCount) throw new Error(`"${part}" is outside 1–${pageCount}.`);
    if (a > b) [a, b] = [b, a];
    return Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i);
  });
}

// ---------- Images to PDF ----------

export type PageSize = "fit" | "a4" | "letter";
export type Margin = 0 | 18 | 36;

const MM = 72 / 25.4;

/** Builds a PDF with one image per page. */
export async function imagesToPdf(
  files: File[],
  opts: { size: PageSize; margin: Margin },
  onProgress?: (done: number) => void,
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  let i = 0;
  for (const file of files) {
    const kind = sniffKind(file);
    let embedded;
    if (kind === "png") {
      embedded = await out.embedPng(await file.arrayBuffer());
    } else {
      // Re-encode everything else as JPEG; this also applies the photo's EXIF rotation.
      const d = await decodeImage(file);
      // Keep pages reasonable: 300 DPI on A4 is about 3500 px on the long side.
      const max = 3600;
      const s = Math.min(1, max / Math.max(d.width, d.height));
      const c = s < 1 ? resizeCanvas(d.canvas, Math.round(d.width * s), Math.round(d.height * s)) : d.canvas;
      const blob = await new Promise<Blob>((res, rej) => {
        const flat = document.createElement("canvas");
        flat.width = c.width;
        flat.height = c.height;
        const ctx = flat.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, flat.width, flat.height);
        ctx.drawImage(c, 0, 0);
        flat.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't prepare this image."))), "image/jpeg", 0.92);
      });
      embedded = await out.embedJpg(await blob.arrayBuffer());
    }

    const iw = embedded.width;
    const ih = embedded.height;
    let pw: number, ph: number;
    if (opts.size === "fit") {
      // 1 image pixel = 1 point would make phone photos enormous; scale to a 96 DPI page.
      const scale = 72 / 96;
      pw = iw * scale + opts.margin * 2;
      ph = ih * scale + opts.margin * 2;
    } else {
      const base = opts.size === "a4" ? PageSizes.A4 : PageSizes.Letter;
      const landscape = iw > ih;
      pw = landscape ? base[1] : base[0];
      ph = landscape ? base[0] : base[1];
    }
    const page = out.addPage([pw, ph]);
    const boxW = pw - opts.margin * 2;
    const boxH = ph - opts.margin * 2;
    const fit = Math.min(boxW / iw, boxH / ih);
    const w = iw * fit;
    const h = ih * fit;
    page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    onProgress?.(++i);
  }
  return finish(out);
}

export const MARGINS: { value: Margin; label: string }[] = [
  { value: 0, label: "None" },
  { value: 18, label: "Small" },
  { value: 36, label: "Large" },
];

export { MM };
