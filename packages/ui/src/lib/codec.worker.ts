/// <reference path="../types/shims.d.ts" />
// Runs the heavy WebAssembly encoders off the main thread so the page stays responsive.
type Job = { id: number; kind: "avif" | "webp" | "jpeg" | "png"; data: ImageData; quality: number };

self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, kind, data, quality } = e.data;
  try {
    let buf: ArrayBuffer;
    if (kind === "avif") {
      const { encode } = await import("@jsquash/avif");
      buf = await encode(data, { quality, speed: 7 });
    } else if (kind === "png") {
      // quality = palette size: 0 is lossless, 2–256 reduces colours.
      const mod = await import("upng-js");
      const UPNG = (mod as { default?: typeof mod }).default ?? mod;
      buf = UPNG.encode([data.data.buffer as ArrayBuffer], data.width, data.height, quality);
    } else if (kind === "jpeg") {
      // mozjpeg: typically 10–15% smaller than the browser JPEG encoder at the same quality.
      const { encode } = await import("@jsquash/jpeg");
      buf = await encode(data, { quality, progressive: true });
    } else {
      const { encode } = await import("@jsquash/webp");
      buf = await encode(data, { quality });
    }
    (self as unknown as Worker).postMessage({ id, buf }, [buf]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: (err as Error).message || "Encoding failed." });
  }
};
