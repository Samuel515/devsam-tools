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
  const src = await openPdf(buf, opts.password);
  const out = await PDFDocument.create();
  const total = src.numPages;
  try {
    for (let n = 1; n <= total; n++) {
      const page = await src.getPage(n);
      const vp = page.getViewport({ scale: 1 }); // in PDF points
      const canvas = await renderPage(page, dpi / 72);
      if (opts.grayscale) grayscale(canvas);
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
