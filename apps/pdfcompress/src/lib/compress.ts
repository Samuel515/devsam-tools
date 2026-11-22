// PDF compression in the browser.
//  - "basic": rewrites the file with pdf-lib (object streams, no duplicate data). Text stays selectable.
//  - "strong" / "extreme": re-renders every page as a JPEG at a lower resolution. Great for scans
//    and image-heavy PDFs; text becomes part of the image.
import { PDFDocument } from "pdf-lib";
import { canvasToBlob, openPdf, renderPage } from "@devsam/ui/lib/pdf";

export type Level = "basic" | "strong" | "extreme";

export const LEVELS: Record<Level, { label: string; dpi: number; quality: number; note: string }> = {
  basic: { label: "Light", dpi: 0, quality: 0, note: "Keeps text selectable. Smaller savings." },
  strong: { label: "Recommended", dpi: 150, quality: 0.72, note: "Great for scans and photos. Text becomes part of the page image." },
  extreme: { label: "Smallest", dpi: 96, quality: 0.55, note: "Smallest file, fine for reading on screen. Text becomes part of the page image." },
};

function grayscale(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
}

/** Settings tried in order, gentlest first, when fitting a PDF under a size limit. */
const LADDER: { dpi: number; quality: number; gray: boolean }[] = [
  { dpi: 150, quality: 0.75, gray: false },
  { dpi: 130, quality: 0.65, gray: false },
  { dpi: 110, quality: 0.55, gray: false },
  { dpi: 96, quality: 0.45, gray: false },
  { dpi: 96, quality: 0.45, gray: true },
  { dpi: 80, quality: 0.38, gray: true },
  { dpi: 72, quality: 0.3, gray: true },
];

/**
 * Compresses until the PDF fits under maxBytes, trying gentler settings first.
 * Returns the first result that fits, or the smallest one if none do.
 */
export async function compressToSize(
  buf: ArrayBuffer,
  maxBytes: number,
  opts: { password?: string },
  onProgress?: (step: number, steps: number) => void,
): Promise<{ bytes: Uint8Array; fits: boolean; dpi: number; gray: boolean }> {
  // A light rewrite first: text-heavy PDFs often fit without turning pages into images.
  try {
    const light = await compressPdf(buf, "basic", { grayscale: false, password: opts.password });
    if (light.length <= maxBytes) return { bytes: light, fits: true, dpi: 0, gray: false };
  } catch (e) {
    if ((e as Error).message.includes("password")) {
      /* fall through: rendering below handles the password */
    } else throw e;
  }
  let best: { bytes: Uint8Array; dpi: number; gray: boolean } | null = null;
  for (let i = 0; i < LADDER.length; i++) {
    onProgress?.(i + 1, LADDER.length);
    const s = LADDER[i]!;
    const bytes = await renderPdf(buf, s.dpi, s.quality, s.gray, opts.password);
    if (!best || bytes.length < best.bytes.length) best = { bytes, dpi: s.dpi, gray: s.gray };
    if (bytes.length <= maxBytes) return { bytes, fits: true, dpi: s.dpi, gray: s.gray };
  }
  return { ...best!, fits: false };
}

export async function compressPdf(
  buf: ArrayBuffer,
  level: Level,
  opts: { grayscale: boolean; password?: string },
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  if (level === "basic") {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false });
    if (doc.isEncrypted) throw new Error("This PDF is password protected. Remove the password first.");
    onProgress?.(1, 1);
    return doc.save({ useObjectStreams: true, addDefaultPage: false });
  }

  const { dpi, quality } = LEVELS[level];
  return renderPdf(buf, dpi, quality, opts.grayscale, opts.password, onProgress);
}

/** Re-renders every page as a JPEG at the given resolution and quality. */
async function renderPdf(
  buf: ArrayBuffer,
  dpi: number,
  quality: number,
  gray: boolean,
  password?: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const src = await openPdf(buf, password);
  const out = await PDFDocument.create();
  const total = src.numPages;
  try {
    for (let n = 1; n <= total; n++) {
      const page = await src.getPage(n);
      const vp = page.getViewport({ scale: 1 }); // in PDF points
      const canvas = await renderPage(page, dpi / 72);
      if (gray) grayscale(canvas);
      const jpg = await canvasToBlob(canvas, "image/jpeg", quality);
      canvas.width = canvas.height = 0;
      page.cleanup();
      const img = await out.embedJpg(await jpg.arrayBuffer());
      const p = out.addPage([vp.width, vp.height]);
      p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      onProgress?.(n, total);
    }
  } finally {
    void src.loadingTask.destroy();
  }
  out.setProducer("devsam PDF Compressor");
  return out.save({ useObjectStreams: true });
}
