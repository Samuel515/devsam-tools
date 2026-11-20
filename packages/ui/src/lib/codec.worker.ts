// Runs the heavy WebAssembly encoders off the main thread so the page stays responsive.
type Job = { id: number; kind: "avif" | "webp"; data: ImageData; quality: number };

self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, kind, data, quality } = e.data;
  try {
    let buf: ArrayBuffer;
    if (kind === "avif") {
      const { encode } = await import("@jsquash/avif");
      buf = await encode(data, { quality, speed: 7 });
    } else {
      const { encode } = await import("@jsquash/webp");
      buf = await encode(data, { quality });
    }
    (self as unknown as Worker).postMessage({ id, buf }, [buf]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: (err as Error).message || "Encoding failed." });
  }
};
