import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Icon, icons, Spinner, useCopy } from "@devsam/ui/react/ui";
import { Dropzone } from "@devsam/ui/react/Dropzone";

type Mode = "camera" | "image";

type ScanResult = {
  text: string;
  at: number;
  source: "camera" | "image";
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

const cameraIcon = "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";
const imageIcon = "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21";

const urlLike = (text: string) => /^https?:\/\/[^\s]+$/i.test(text.trim());
const emailLike = (text: string) => /^mailto:/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
const phoneLike = (text: string) => /^tel:/i.test(text) || /^\+?[\d\s().-]{7,}$/.test(text.trim());
const wifiLike = (text: string) => /^WIFI:/i.test(text.trim());

function labelFor(text: string) {
  if (urlLike(text)) return "Link";
  if (emailLike(text)) return "Email";
  if (phoneLike(text)) return "Phone";
  if (wifiLike(text)) return "Wi-Fi";
  return "Text";
}

function hrefFor(text: string) {
  const t = text.trim();
  if (urlLike(t)) return t;
  if (/^mailto:/i.test(t)) return t;
  if (emailLike(t)) return `mailto:${t}`;
  if (/^tel:/i.test(t)) return t;
  if (phoneLike(t)) return `tel:${t.replace(/[^\d+]/g, "")}`;
  return null;
}

async function makeDetector(): Promise<BarcodeDetectorLike | null> {
  if (!("BarcodeDetector" in window) || !window.BarcodeDetector) return null;
  try {
    if ("getSupportedFormats" in window.BarcodeDetector) {
      const formats = await (window.BarcodeDetector as any).getSupportedFormats();
      if (Array.isArray(formats) && !formats.includes("qr_code")) return null;
    }
    return new window.BarcodeDetector({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

async function scanCanvas(canvas: HTMLCanvasElement, detector: BarcodeDetectorLike | null): Promise<string | null> {
  if (detector) {
    try {
      const found = await detector.detect(canvas);
      const value = found.find((f) => f.rawValue)?.rawValue?.trim();
      if (value) return value;
    } catch {
      // fall through to jsQR
    }
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return code?.data?.trim() || null;
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

export default function QrScanTool() {
  const [mode, setMode] = useState<Mode>("camera");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const lastTextRef = useRef<string>("");
  const lastAtRef = useRef<number>(0);

  const pushResult = useCallback((text: string, source: "camera" | "image") => {
    const clean = text.trim();
    if (!clean) return;
    const now = Date.now();
    if (clean === lastTextRef.current && now - lastAtRef.current < 2500) return;
    lastTextRef.current = clean;
    lastAtRef.current = now;
    const next: ScanResult = { text: clean, at: now, source };
    setResult(next);
    setHistory((prev) => [next, ...prev.filter((p) => p.text !== clean)].slice(0, 8));
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setStarting(false);
  }, []);

  const scanVideoFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
      const canvas = drawToCanvas(video, Math.round(video.videoWidth * scale), Math.round(video.videoHeight * scale));
      if (canvas) {
        const text = await scanCanvas(canvas, detectorRef.current);
        if (text) pushResult(text, "camera");
      }
    }
    rafRef.current = requestAnimationFrame(() => { void scanVideoFrame(); });
  }, [pushResult]);

  const startCamera = useCallback(async (nextFacing: "environment" | "user" = facing) => {
    setCameraError(null);
    setStarting(true);
    stopCamera();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported in this browser.");
      }
      detectorRef.current = await makeDetector();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element not ready.");
      video.srcObject = stream;
      await video.play();
      setFacing(nextFacing);
      setCameraActive(true);
      setStarting(false);
      rafRef.current = requestAnimationFrame(() => { void scanVideoFrame(); });
    } catch (err) {
      stopCamera();
      const msg = err instanceof Error ? err.message : "Could not start the camera.";
      setCameraError(msg);
    }
  }, [facing, scanVideoFrame, stopCamera]);

  useEffect(() => {
    if (mode !== "camera") stopCamera();
  }, [mode, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const scanImageFile = useCallback(async (file: File) => {
    setImageError(null);
    setImageBusy(true);
    setImageName(file.name);
    try {
      detectorRef.current = detectorRef.current ?? await makeDetector();
      const url = URL.createObjectURL(file);
      setImagePreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = drawToCanvas(img, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
      if (!canvas) throw new Error("Could not read the image.");
      const text = await scanCanvas(canvas, detectorRef.current);
      if (text) pushResult(text, "image");
      else setImageError("No QR code found in that image. Try a clearer image or crop closer to the code.");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not scan that image.");
    } finally {
      setImageBusy(false);
    }
  }, [pushResult]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith("image/"));
      const file = imageItem?.getAsFile();
      if (!file) return;
      e.preventDefault();
      setMode("image");
      void scanImageFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [scanImageFile]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const resultHref = result ? hrefFor(result.text) : null;
  const resultLabel = result ? labelFor(result.text) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "camera" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("camera")}
        >
          <Icon d={cameraIcon} className="size-4" />
          Camera
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "image" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("image")}
        >
          <Icon d={imageIcon} className="size-4" />
          Image
        </button>
        {mode === "camera" && (
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void startCamera(facing === "environment" ? "user" : "environment")}
              disabled={starting}
            >
              Switch camera
            </button>
            {cameraActive ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={stopCamera}>Stop</button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void startCamera(facing)} disabled={starting}>Start</button>
            )}
          </div>
        )}
      </div>

      {mode === "camera" ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-black/90">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline autoPlay />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-52 rounded-3xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)] sm:size-64" />
            </div>
            {!cameraActive && !starting && !cameraError && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/80">
                Camera is off. Start it to scan a QR code.
              </div>
            )}
            {starting && (
              <div className="absolute inset-0 grid place-items-center gap-3 bg-black/30 text-sm text-white">
                <Spinner />
                Starting camera...
              </div>
            )}
          </div>
          {cameraError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="font-medium">Camera unavailable</p>
              <p className="mt-1 text-red-200/90">{cameraError}</p>
              <p className="mt-2 text-red-200/80">You can still scan by switching to Image and uploading or pasting a QR code.</p>
            </div>
          )}
          <p className="text-xs text-subtle">Tip: hold the code steady inside the frame. You can also paste a screenshot anywhere on this page.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Dropzone
            accept="image/*"
            multiple={false}
            listenPaste={false}
            onFiles={(files) => { const f = files[0]; if (f) void scanImageFile(f); }}
            title="Drop a QR code image here"
            hint="PNG, JPG, WebP, or a screenshot"
          />
          {imageBusy && (
            <div className="flex items-center gap-2 text-sm text-muted"><Spinner className="size-4" /> Scanning image...</div>
          )}
          {imageError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{imageError}</div>
          )}
          {imagePreview && (
            <div className="rounded-2xl border border-line bg-elev p-3">
              <p className="mb-2 text-xs text-subtle">{imageName ?? "Image preview"}</p>
              <img src={imagePreview} alt="Uploaded QR code preview" className="max-h-80 w-auto rounded-lg" />
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-elev p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label">Result</p>
            <p className="mt-1 text-sm text-muted">{result ? `${resultLabel} detected` : "Scan a QR code to see its content here."}</p>
          </div>
          {result && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy(result.text)}>
                <Icon d={copied ? icons.check : icons.copy} className="size-4" />
                {copied ? "Copied" : "Copy"}
              </button>
              {resultHref && (
                <a href={resultHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  Open
                </a>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-line bg-bg p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-fg">{result?.text ?? "No QR code decoded yet."}</pre>
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <p className="label mb-3">Recent scans</p>
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={`${item.at}-${item.text}`} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-elev p-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-subtle">{labelFor(item.text)} · {item.source}</p>
                  <p className="mt-1 truncate font-mono text-xs text-muted">{item.text}</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setResult(item)}>Show</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}