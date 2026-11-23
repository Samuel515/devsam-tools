import { useCallback, useEffect, useRef, useState } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { Icon, icons, Segmented, Spinner } from "@devsam/ui/react/ui";
import { baseName, downloadBlob, formatBytes, uid, zipBlobs } from "@devsam/ui/lib/files";
import { decodeImage, IMAGE_ACCEPT, resizeCanvas } from "@devsam/ui/lib/image";
import type { Device, In, Out } from "../lib/bg.worker";
import { looksLikeInk, removePaper } from "../lib/ink";

/** "photo": AI cutout of the main subject. "ink": clear the paper around and inside strokes. */
type Mode = "photo" | "ink";

type Bg = { kind: "transparent" } | { kind: "color"; color: string } | { kind: "blur" };

type Item = {
  id: string;
  file: File;
  mode: Mode;
  /** Photo mode result for an image that looks like a signature or drawing. */
  inkHint?: boolean;
  status: "queued" | "working" | "done" | "error";
  /** Source pixels (orientation applied, capped in size). */
  source?: HTMLCanvasElement;
  /** Source with the background cut out. */
  cutout?: HTMLCanvasElement;
  preview?: string;
  /** Preview of the source, for "hold to see original" (works for HEIC too). */
  original?: string;
  error?: string;
  ms?: number;
};

const MAX_SIDE = 4096;
const SWATCHES = ["#ffffff", "#000000", "#f3f4f6", "#fde68a", "#bfdbfe", "#fbcfe8", "#bbf7d0"];

let worker: Worker | null = null;
let seq = 0;
/** Set after a GPU failure (or with ?cpu in the URL): use the CPU for the rest of the visit. */
let forceCpu = typeof location !== "undefined" && new URLSearchParams(location.search).has("cpu");
const device = (): Device | undefined => (forceCpu ? "wasm" : undefined);
const waiting = new Map<number, { resolve: (m: Extract<Out, { type: "result" }>) => void; reject: (e: Error) => void }>();
const listeners = new Set<(m: Out) => void>();
/** Images in flight, kept so they can be retried after a GPU failure. */
const retry = new Map<number, Blob>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("../lib/bg.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<Out>) => {
    const m = e.data;
    listeners.forEach((l) => l(m));
    if (m.type === "result") {
      waiting.get(m.id)?.resolve(m);
      waiting.delete(m.id);
      retry.delete(m.id);
    } else if (m.type === "error" && m.gpuFailed) {
      // Start over in a fresh worker on the CPU and retry anything in flight.
      forceCpu = true;
      worker?.terminate();
      worker = null;
      const w = getWorker();
      w.postMessage({ type: "load", device: "wasm" } satisfies In);
      for (const [id, job] of retry) w.postMessage({ type: "run", id, image: job, device: "wasm" } satisfies In);
    } else if (m.type === "error" && m.id !== undefined) {
      waiting.get(m.id)?.reject(new Error(m.message));
      waiting.delete(m.id);
      retry.delete(m.id);
    }
  };
  return worker;
}

function segment(image: Blob) {
  const id = ++seq;
  return new Promise<Extract<Out, { type: "result" }>>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    retry.set(id, image);
    getWorker().postMessage({ type: "run", id, image, device: device() } satisfies In);
  });
}

const toBlob = (c: HTMLCanvasElement, type = "image/png", q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed."))), type, q));

/** Applies the mask as the alpha channel. */
function applyMask(src: HTMLCanvasElement, mask: Uint8Array, w: number, h: number) {
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < mask.length; i++) img.data[i * 4 + 3] = mask[i]!;
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Draws the cutout on the chosen background. */
function compose(item: Item, bg: Bg): HTMLCanvasElement {
  const cut = item.cutout!;
  if (bg.kind === "transparent") return cut;
  const out = document.createElement("canvas");
  out.width = cut.width;
  out.height = cut.height;
  const ctx = out.getContext("2d")!;
  if (bg.kind === "color") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, out.width, out.height);
  } else {
    const blur = Math.max(8, Math.round(Math.max(out.width, out.height) / 60));
    ctx.filter = `blur(${blur}px)`;
    // Draw slightly larger so blurred edges don't fade to transparent.
    ctx.drawImage(item.source!, -blur * 2, -blur * 2, out.width + blur * 4, out.height + blur * 4);
    ctx.filter = "none";
  }
  ctx.drawImage(cut, 0, 0);
  return out;
}

const MODES: { value: Mode; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "ink", label: "Signature or logo" },
];

export default function BgRemover({ defaultBg }: { defaultBg?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>("photo");
  const [strength, setStrength] = useState(0.6);
  const [selected, setSelected] = useState<string | null>(null);
  const [bg, setBg] = useState<Bg>(defaultBg ? { kind: "color", color: defaultBg } : { kind: "transparent" });
  const [model, setModel] = useState<{ state: "idle" | "loading" | "ready" | "error"; pct: number; mb: string; device?: string; error?: string }>({
    state: "idle",
    pct: 0,
    mb: "",
  });
  const [showOriginal, setShowOriginal] = useState(false);
  const [zipping, setZipping] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    const onMsg = (m: Out) => {
      if (m.type === "progress") {
        setModel((s) => ({ ...s, state: "loading", pct: Math.round((m.loaded / m.total) * 100), mb: `${formatBytes(m.loaded)} of ${formatBytes(m.total)}` }));
      } else if (m.type === "ready") {
        setModel({ state: "ready", pct: 100, mb: "", device: m.device });
      } else if (m.type === "error" && m.id === undefined && !m.gpuFailed) {
        setModel((s) => ({ ...s, state: "error", error: m.message }));
      }
    };
    listeners.add(onMsg);
    return () => {
      listeners.delete(onMsg);
    };
  }, []);

  const update = (id: string, patch: Partial<Item>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const loadModel = () => {
    setModel((m) => (m.state === "idle" ? { ...m, state: "loading" } : m));
    getWorker().postMessage({ type: "load", device: device() } satisfies In);
  };

  const add = useCallback(
    (files: File[]) => {
      const fresh = files.map((file) => ({ id: uid(), file, mode, status: "queued" as const }));
      setItems((l) => [...l, ...fresh]);
      setSelected((s) => s ?? fresh[0]?.id ?? null);
      if (mode === "photo") loadModel();
    },
    [mode],
  );

  // Process the queue one image at a time.
  useEffect(() => {
    if (running.current) return;
    const next = items.find((i) => i.status === "queued");
    if (!next) return;
    running.current = true;
    (async () => {
      update(next.id, { status: "working" });
      try {
        const d = await decodeImage(next.file);
        const s = Math.min(1, MAX_SIDE / Math.max(d.width, d.height));
        const source = s < 1 ? resizeCanvas(d.canvas, Math.round(d.width * s), Math.round(d.height * s)) : d.canvas;
        const original = next.original ?? URL.createObjectURL(await toBlob(source, "image/jpeg", 0.9));
        if (next.mode === "ink") {
          const t = performance.now();
          const cutout = removePaper(source, strength);
          update(next.id, { status: "done", source, cutout, original, ms: performance.now() - t, inkHint: false });
        } else {
          const r = await segment(await toBlob(source, "image/png"));
          const cutout = applyMask(source, r.mask, r.width, r.height);
          update(next.id, { status: "done", source, cutout, original, ms: r.ms, inkHint: looksLikeInk(source) });
        }
      } catch (e) {
        update(next.id, { status: "error", error: (e as Error).message });
      } finally {
        running.current = false;
        setItems((l) => [...l]); // re-run the effect for the next image
      }
    })();
  }, [items]);

  const current = items.find((i) => i.id === selected) ?? items[0];

  /** Switches the mode for new images and redoes the current one. */
  const changeMode = (m: Mode) => {
    setMode(m);
    if (m === "photo") loadModel();
    if (current && current.mode !== m) update(current.id, { mode: m, status: "queued", inkHint: false });
  };

  // Re-run the current signature/logo image when the clean-up strength changes.
  const strengthTimer = useRef<number | undefined>(undefined);
  const changeStrength = (v: number) => {
    setStrength(v);
    window.clearTimeout(strengthTimer.current);
    strengthTimer.current = window.setTimeout(() => {
      if (current?.mode === "ink" && current.status === "done") update(current.id, { status: "queued" });
    }, 250);
  };

  // Preview of the current image with the current background.
  useEffect(() => {
    if (!current || current.status !== "done") return;
    let url = "";
    let cancelled = false;
    toBlob(compose(current, bg), "image/png").then((b) => {
      if (cancelled) return;
      url = URL.createObjectURL(b);
      setItems((l) => l.map((x) => (x.id === current.id ? { ...x, preview: url } : x)));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.status, bg]);

  const exportItem = async (it: Item, format: "png" | "jpeg") => {
    let canvas = compose(it, bg);
    if (format === "jpeg" && bg.kind === "transparent") canvas = compose(it, { kind: "color", color: "#ffffff" });
    const blob = await toBlob(canvas, format === "png" ? "image/png" : "image/jpeg", 0.92);
    return { blob, name: `${baseName(it.file.name)}-no-bg.${format === "png" ? "png" : "jpg"}` };
  };

  const done = items.filter((i) => i.status === "done");

  const downloadAll = async () => {
    setZipping(true);
    try {
      const files = await Promise.all(done.map((i) => exportItem(i, "png")));
      downloadBlob(await zipBlobs(files), "backgrounds-removed.zip");
    } finally {
      setZipping(false);
    }
  };

  if (!items.length) {
    return (
      <div>
        <div className="mb-3 flex justify-center">
          <Segmented<Mode> label="Image type" value={mode} onChange={setMode} options={MODES} />
        </div>
        {mode === "photo" ? (
          <Dropzone onFiles={add} accept={IMAGE_ACCEPT} title="Drop a photo to remove its background" hint="JPG · PNG · WebP · HEIC · works best with a clear subject" />
        ) : (
          <Dropzone onFiles={add} accept={IMAGE_ACCEPT} title="Drop a signature, logo or drawing" hint="Photo or scan on paper or a plain background · JPG · PNG · HEIC" />
        )}
        <p className="mt-3 text-center text-xs text-subtle">
          {mode === "photo"
            ? "The AI model downloads once the first time (115–175 MB, depending on your device), then works offline. Your photos are never uploaded."
            : "Removes the paper around and inside every stroke, even in shadows. Instant, and nothing is uploaded."}
        </p>
      </div>
    );
  }

  const busy = items.some((i) => i.status === "queued" || i.status === "working");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      {/* Preview */}
      <div className="min-w-0">
        <div className="checker relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-line">
          {current?.status === "done" && current.preview ? (
            <img
              src={showOriginal && current.original ? current.original : current.preview}
              alt={showOriginal ? "Original" : "Background removed"}
              className="max-h-full max-w-full object-contain"
            />
          ) : current?.status === "error" ? (
            <p className="max-w-sm px-4 text-center text-sm text-danger">{current.error}</p>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <Spinner className="size-6 text-accent" />
              {model.state === "loading" && model.pct < 100 ? (
                <>
                  <p className="text-sm font-medium">Downloading the AI model… {model.pct}%</p>
                  <div className="h-1.5 w-56 overflow-hidden rounded-full bg-hover">
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${model.pct}%` }} />
                  </div>
                  <p className="text-xs text-subtle">{model.mb} · first time only</p>
                </>
              ) : (
                <p className="text-sm text-muted">Removing the background…</p>
              )}
            </div>
          )}
          {current?.status === "done" && (
            <button
              type="button"
              className="btn btn-sm absolute bottom-3 left-3 bg-elev/90 backdrop-blur"
              onPointerDown={() => setShowOriginal(true)}
              onPointerUp={() => setShowOriginal(false)}
              onPointerLeave={() => setShowOriginal(false)}
              onKeyDown={(e) => e.key === " " && setShowOriginal(true)}
              onKeyUp={() => setShowOriginal(false)}
            >
              <Icon d={icons.eye} /> Hold to see original
            </button>
          )}
        </div>
        {model.state === "error" && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {model.error} Check your connection and reload the page to try again.
          </p>
        )}

        {/* Thumbnails */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setSelected(it.id)}
              className={`checker relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border-2 ${it.id === current?.id ? "border-accent" : "border-line"}`}
              aria-label={it.file.name}
            >
              {it.status === "done" && it.preview && it.id === current?.id ? (
                <img src={it.preview} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                it.original ? <img src={it.original} alt="" className="h-full w-full object-cover" /> : <ThumbFromFile file={it.file} dim={it.status !== "done"} />
              )}
              {(it.status === "queued" || it.status === "working") && <Spinner className="absolute size-4 text-accent" />}
            </button>
          ))}
          <label className="grid size-16 shrink-0 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line-strong text-subtle hover:border-accent hover:text-accent" aria-label="Add images">
            <Icon d={icons.plus} />
            <input type="file" multiple accept={IMAGE_ACCEPT} className="sr-only" onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      {/* Controls */}
      <aside className="space-y-5">
        <div>
          <p className="field-label">Image type</p>
          <Segmented<Mode> label="Image type" value={current?.mode ?? mode} onChange={changeMode} options={MODES} />
          {current?.status === "done" && current.mode === "photo" && current.inkHint && (
            <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-xs leading-relaxed">
              This looks like a signature or drawing.{" "}
              <button type="button" className="font-medium text-accent underline underline-offset-2" onClick={() => changeMode("ink")}>
                Switch to Signature or logo
              </button>{" "}
              to clear the paper inside loops and letters too.
            </p>
          )}
        </div>

        {(current?.mode ?? mode) === "ink" && (
          <div>
            <label htmlFor="strength" className="field-label">
              Clean-up
            </label>
            <input
              id="strength"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={strength}
              onChange={(e) => changeStrength(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-xs text-subtle">
              <span>Keep faint marks</span>
              <span>Remove more</span>
            </div>
          </div>
        )}

        <div>
          <p className="field-label">Background</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`checker size-9 rounded-lg border-2 ${bg.kind === "transparent" ? "border-accent" : "border-line"}`}
              onClick={() => setBg({ kind: "transparent" })}
              aria-label="Transparent"
              title="Transparent"
            />
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className={`size-9 rounded-lg border-2 ${bg.kind === "color" && bg.color === c ? "border-accent" : "border-line"}`}
                style={{ background: c }}
                onClick={() => setBg({ kind: "color", color: c })}
                aria-label={`Colour ${c}`}
                title={c}
              />
            ))}
            <label className={`relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-lg border-2 ${bg.kind === "color" && !SWATCHES.includes(bg.color) ? "border-accent" : "border-line"}`} title="Custom colour" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}>
              <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => setBg({ kind: "color", color: e.target.value })} aria-label="Custom colour" />
            </label>
            <button
              type="button"
              className={`btn btn-sm h-9 ${bg.kind === "blur" ? "border-accent" : ""}`}
              onClick={() => setBg({ kind: "blur" })}
            >
              Blur
            </button>
          </div>
        </div>

        {current?.status === "done" && (
          <div className="grid gap-2">
            <button type="button" className="btn btn-primary" onClick={async () => { const f = await exportItem(current, "png"); downloadBlob(f.blob, f.name); }}>
              <Icon d={icons.download} /> Download PNG
            </button>
            <button type="button" className="btn" onClick={async () => { const f = await exportItem(current, "jpeg"); downloadBlob(f.blob, f.name); }}>
              <Icon d={icons.download} /> Download JPG
            </button>
            <p className="text-xs text-subtle">
              {current.cutout!.width}×{current.cutout!.height}
              {current.ms ? ` · done in ${(current.ms / 1000).toFixed(1)} s` : ""}
              {current.mode === "photo" && model.device ? ` · ${model.device === "webgpu" ? "GPU" : "CPU"}` : ""}
            </p>
          </div>
        )}

        {done.length > 1 && (
          <button type="button" className="btn w-full" disabled={busy || zipping} onClick={() => void downloadAll()}>
            {zipping ? <Spinner /> : <Icon d={icons.download} />} Download all ({done.length}) as PNG
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-sm w-full"
          onClick={() => {
            setItems([]);
            setSelected(null);
          }}
        >
          Start over
        </button>

        <p className="text-xs leading-relaxed text-subtle">
          {(current?.mode ?? mode) === "ink"
            ? "Tip: a flat, evenly lit photo of the paper works best. Raise Clean-up if specks of paper texture remain."
            : "Tip: photos with a clear subject and good lighting give the cleanest edges. Hair and fur work too."}
        </p>
      </aside>
    </div>
  );
}

function ThumbFromFile({ file, dim }: { file: File; dim: boolean }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt="" className={`h-full w-full object-cover ${dim ? "opacity-50" : ""}`} onError={(e) => (e.currentTarget.style.visibility = "hidden")} /> : null;
}
