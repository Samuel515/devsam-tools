/// <reference path="../types/shims.d.ts" />
// Image decoding and encoding in the browser.
// Heavy codecs (HEIC, AVIF, TIFF, GIF) load only when a file needs them.
import { extOf } from "./files";

export type OutFormat = "png" | "jpeg" | "webp" | "avif" | "gif" | "bmp" | "ico";

export const OUT_FORMATS: { value: OutFormat; label: string; ext: string; mime: string; lossy: boolean; alpha: boolean }[] = [
  { value: "jpeg", label: "JPG", ext: "jpg", mime: "image/jpeg", lossy: true, alpha: false },
  { value: "png", label: "PNG", ext: "png", mime: "image/png", lossy: false, alpha: true },
  { value: "webp", label: "WebP", ext: "webp", mime: "image/webp", lossy: true, alpha: true },
  { value: "avif", label: "AVIF", ext: "avif", mime: "image/avif", lossy: true, alpha: true },
  { value: "gif", label: "GIF", ext: "gif", mime: "image/gif", lossy: false, alpha: true },
  { value: "bmp", label: "BMP", ext: "bmp", mime: "image/bmp", lossy: false, alpha: false },
  { value: "ico", label: "ICO", ext: "ico", mime: "image/x-icon", lossy: false, alpha: true },
];

export const formatInfo = (f: OutFormat) => OUT_FORMATS.find((x) => x.value === f)!;

/** Everything the decoder accepts, for file inputs. */
export const IMAGE_ACCEPT =
  "image/*,.heic,.heif,.avif,.webp,.tif,.tiff,.bmp,.ico,.svg,.gif,.jpg,.jpeg,.jfif,.png";

export type Decoded = { canvas: HTMLCanvasElement; width: number; height: number };

function canvasFrom(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function ctx2d(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Your browser couldn't create a drawing surface.");
  return ctx;
}

function fromImageData(data: ImageData): Decoded {
  const c = canvasFrom(data.width, data.height);
  ctx2d(c).putImageData(data, 0, 0);
  return { canvas: c, width: c.width, height: c.height };
}

function fromSource(src: CanvasImageSource, w: number, h: number): Decoded {
  const c = canvasFrom(w, h);
  ctx2d(c).drawImage(src, 0, 0, c.width, c.height);
  return { canvas: c, width: c.width, height: c.height };
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image couldn't be read. It may be damaged or in an unsupported format."));
    };
    img.src = url;
  });
}

/** SVGs without width/height report 0x0, so size them from the viewBox. */
async function decodeSvg(file: Blob): Promise<Decoded> {
  const text = await file.text();
  const img = await loadImageElement(new Blob([text], { type: "image/svg+xml" }));
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (!w || !h) {
    const vb = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    const vw = vb ? parseFloat(vb[1]!) : 0;
    const vh = vb ? parseFloat(vb[2]!) : 0;
    if (vw && vh) {
      w = 1024;
      h = Math.round((1024 * vh) / vw);
    } else {
      w = h = 1024;
    }
  }
  // Rasterise small SVGs at a crisp size.
  const scale = Math.max(1, 1024 / Math.max(w, h));
  return fromSource(img, w * scale, h * scale);
}

async function decodeHeic(file: Blob): Promise<Decoded> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/png" });
  const png = Array.isArray(out) ? out[0]! : out;
  return decodeNative(png);
}

async function decodeTiff(file: Blob): Promise<Decoded> {
  const UTIF = await import("utif");
  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf);
  const first = ifds[0];
  if (!first) throw new Error("This TIFF file has no images in it.");
  UTIF.decodeImage(buf, first);
  const rgba = UTIF.toRGBA8(first);
  return fromImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), first.width, first.height));
}

async function decodeNative(file: Blob): Promise<Decoded> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const d = fromSource(bmp, bmp.width, bmp.height);
    bmp.close();
    return d;
  } catch {
    const img = await loadImageElement(file);
    return fromSource(img, img.naturalWidth, img.naturalHeight);
  }
}

export function sniffKind(file: File): string {
  const ext = extOf(file.name);
  const t = file.type.toLowerCase();
  if (ext === "heic" || ext === "heif" || t.includes("heic") || t.includes("heif")) return "heic";
  if (ext === "tif" || ext === "tiff" || t === "image/tiff") return "tiff";
  if (ext === "svg" || t === "image/svg+xml") return "svg";
  if (ext === "avif" || t === "image/avif") return "avif";
  if (ext === "webp" || t === "image/webp") return "webp";
  return ext || t.split("/")[1] || "image";
}

export async function decodeImage(file: File): Promise<Decoded> {
  const kind = sniffKind(file);
  if (kind === "heic") return decodeHeic(file);
  if (kind === "tiff") return decodeTiff(file);
  if (kind === "svg") return decodeSvg(file);
  try {
    return await decodeNative(file);
  } catch (err) {
    // Older browsers can't decode AVIF or WebP natively: use WebAssembly decoders.
    if (kind === "avif") {
      const { decode } = await import("@jsquash/avif");
      const data = await decode(await file.arrayBuffer());
      if (data) return fromImageData(data);
    }
    if (kind === "webp") {
      const { decode } = await import("@jsquash/webp");
      return fromImageData(await decode(await file.arrayBuffer()));
    }
    throw err;
  }
}

// ---------- Encoding ----------

export type EncodeOptions = {
  /** 0–1, for JPG, WebP and AVIF. */
  quality?: number;
  /** Fill colour behind transparent pixels for formats without transparency. */
  background?: string;
  /** Icon sizes for ICO output. */
  icoSizes?: number[];
};

function toBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Your browser couldn't encode this image."))), type, quality),
  );
}

function flatten(src: HTMLCanvasElement, background: string) {
  const c = canvasFrom(src.width, src.height);
  const ctx = ctx2d(c);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0);
  return c;
}

const imageData = (c: HTMLCanvasElement) => ctx2d(c).getImageData(0, 0, c.width, c.height);

// One shared worker for WebAssembly encoders.
let worker: Worker | null = null;
let jobId = 0;
const pending = new Map<number, { resolve: (b: ArrayBuffer) => void; reject: (e: Error) => void }>();

function wasmEncode(kind: "avif" | "webp", data: ImageData, quality: number): Promise<ArrayBuffer> {
  if (!worker) {
    worker = new Worker(new URL("./codec.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; buf?: ArrayBuffer; error?: string }>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.buf) job.resolve(e.data.buf);
      else job.reject(new Error(e.data.error ?? "Encoding failed."));
    };
  }
  const id = ++jobId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ id, kind, data, quality }, [data.data.buffer]);
  });
}

async function encodeWebp(c: HTMLCanvasElement, q: number) {
  const native = await toBlob(c, "image/webp", q);
  if (native.type === "image/webp") return native;
  // Safari can't encode WebP from a canvas.
  const buf = await wasmEncode("webp", imageData(c), Math.round(q * 100));
  return new Blob([buf], { type: "image/webp" });
}

async function encodeAvif(c: HTMLCanvasElement, q: number) {
  // AVIF quality runs lower than JPG for the same look, so map 90% to about 72.
  const buf = await wasmEncode("avif", imageData(c), Math.round(q * 80));
  return new Blob([buf], { type: "image/avif" });
}

async function encodeGif(c: HTMLCanvasElement) {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const { data, width, height } = imageData(c);
  const palette = quantize(data, 256, { format: "rgba4444", oneBitAlpha: true });
  const index = applyPalette(data, palette, "rgba4444");
  const transparentIndex = palette.findIndex((p) => p[3] === 0);
  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, {
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex),
  });
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}

/** 24-bit BMP, bottom-up, rows padded to 4 bytes. */
function encodeBmp(c: HTMLCanvasElement) {
  const { data, width, height } = imageData(c);
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const size = 54 + rowSize * height;
  const buf = new ArrayBuffer(size);
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  v.setUint8(0, 0x42);
  v.setUint8(1, 0x4d);
  v.setUint32(2, size, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, rowSize * height, true);
  v.setInt32(38, 2835, true);
  v.setInt32(42, 2835, true);
  for (let y = 0; y < height; y++) {
    const row = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const o = row + x * 3;
      bytes[o] = data[i + 2]!;
      bytes[o + 1] = data[i + 1]!;
      bytes[o + 2] = data[i]!;
    }
  }
  return new Blob([buf], { type: "image/bmp" });
}

/** ICO with one PNG image per size, each centred on a transparent square. */
async function encodeIco(c: HTMLCanvasElement, sizes: number[]) {
  const list = [...new Set(sizes)].filter((s) => s > 0 && s <= 256).sort((a, b) => a - b);
  if (!list.length) list.push(32);
  const pngs: Uint8Array[] = [];
  for (const s of list) {
    const sq = canvasFrom(s, s);
    const ctx = ctx2d(sq);
    ctx.imageSmoothingQuality = "high";
    const scale = Math.min(s / c.width, s / c.height);
    const w = c.width * scale;
    const h = c.height * scale;
    ctx.drawImage(c, (s - w) / 2, (s - h) / 2, w, h);
    pngs.push(new Uint8Array(await (await toBlob(sq, "image/png")).arrayBuffer()));
  }
  const headerSize = 6 + 16 * list.length;
  const total = headerSize + pngs.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true);
  v.setUint16(2, 1, true);
  v.setUint16(4, list.length, true);
  let offset = headerSize;
  list.forEach((s, i) => {
    const e = 6 + i * 16;
    v.setUint8(e, s >= 256 ? 0 : s);
    v.setUint8(e + 1, s >= 256 ? 0 : s);
    v.setUint8(e + 2, 0);
    v.setUint8(e + 3, 0);
    v.setUint16(e + 4, 1, true);
    v.setUint16(e + 6, 32, true);
    v.setUint32(e + 8, pngs[i]!.length, true);
    v.setUint32(e + 12, offset, true);
    out.set(pngs[i]!, offset);
    offset += pngs[i]!.length;
  });
  return new Blob([out], { type: "image/x-icon" });
}

export async function encodeImage(src: HTMLCanvasElement, format: OutFormat, opts: EncodeOptions = {}): Promise<Blob> {
  const q = Math.min(1, Math.max(0.01, opts.quality ?? 0.9));
  const bg = opts.background ?? "#ffffff";
  switch (format) {
    case "png":
      return toBlob(src, "image/png");
    case "jpeg":
      return toBlob(flatten(src, bg), "image/jpeg", q);
    case "webp":
      return encodeWebp(src, q);
    case "avif":
      return encodeAvif(src, q);
    case "gif":
      return encodeGif(src);
    case "bmp":
      return encodeBmp(flatten(src, bg));
    case "ico":
      return encodeIco(src, opts.icoSizes ?? [16, 32, 48, 256]);
  }
}

/** Scales a canvas down (never up) to fit within maxW x maxH, with high-quality smoothing. */
export function resizeCanvas(src: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (width === src.width && height === src.height) return src;
  // Halve repeatedly for big reductions: much sharper than one large step.
  let cur = src;
  while (cur.width / 2 >= width && cur.height / 2 >= height) {
    const half = canvasFrom(cur.width / 2, cur.height / 2);
    const ctx = ctx2d(half);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
  }
  const out = canvasFrom(width, height);
  const ctx = ctx2d(out);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}

/** Small preview image as an object URL. */
export async function thumbnail(d: Decoded, max = 160): Promise<string> {
  const scale = Math.min(1, max / Math.max(d.width, d.height));
  const c = resizeCanvas(d.canvas, Math.max(1, Math.round(d.width * scale)), Math.max(1, Math.round(d.height * scale)));
  return URL.createObjectURL(await toBlob(c, "image/png"));
}
