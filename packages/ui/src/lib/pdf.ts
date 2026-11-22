// PDF rendering with Mozilla's pdf.js, loaded on demand.
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

let lib: typeof import("pdfjs-dist") | null = null;

export async function pdfjs() {
  if (lib) return lib;
  lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return lib;
}

export class PdfPasswordError extends Error {
  constructor(public wrong: boolean) {
    super(wrong ? "That password is incorrect." : "This PDF is password protected.");
  }
}

/** Opens a PDF. Throws PdfPasswordError when a (correct) password is needed. */
export async function openPdf(data: ArrayBuffer, password?: string): Promise<PDFDocumentProxy> {
  const p = await pdfjs();
  // pdf.js takes ownership of the buffer, so give it a copy.
  const task = p.getDocument({ data: new Uint8Array(data.slice(0)), password, isEvalSupported: false });
  try {
    return await task.promise;
  } catch (e) {
    const err = e as { name?: string; code?: number; message?: string };
    if (err.name === "PasswordException") {
      throw new PdfPasswordError(err.code === p.PasswordResponses.INCORRECT_PASSWORD);
    }
    if (err.name === "InvalidPDFException") throw new Error("This file isn't a valid PDF, or it's damaged.");
    throw new Error(err.message || "This PDF couldn't be opened.");
  }
}

// Browsers refuse canvases beyond roughly 16k px per side or ~268M px in total.
const MAX_SIDE = 12_000;
const MAX_AREA = 120_000_000;

/** Renders a page to a canvas at the given scale (1 = 72 DPI), clamped to safe canvas limits. */
export async function renderPage(page: PDFPageProxy, scale: number, background = "#ffffff"): Promise<HTMLCanvasElement> {
  let viewport = page.getViewport({ scale });
  const shrink = Math.min(1, MAX_SIDE / viewport.width, MAX_SIDE / viewport.height, Math.sqrt(MAX_AREA / (viewport.width * viewport.height)));
  if (shrink < 1) viewport = page.getViewport({ scale: scale * shrink });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't create a drawing surface.");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport, background }).promise;
  return canvas;
}

/** Renders a page so its width is about `width` CSS pixels, for thumbnails. */
export async function renderThumb(page: PDFPageProxy, width: number): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  return renderPage(page, (width * dpr) / base.width);
}

export function canvasToBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image."))), type, quality),
  );
}

export type { PDFDocumentProxy, PDFPageProxy };
