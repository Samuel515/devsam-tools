import { useCallback, useEffect, useRef, useState } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { Icon, icons, Segmented, Spinner } from "@devsam/ui/react/ui";
import { baseName, downloadBlob, formatBytes, pctChange, uid, zipBlobs } from "@devsam/ui/lib/files";
import {
  decodeImage,
  encodeImage,
  encodeMozJpeg,
  encodePngQuant,
  IMAGE_ACCEPT,
  resizeCanvas,
  sniffKind,
  thumbnail,
  type Decoded,
} from "@devsam/ui/lib/image";

type Level = "small" | "balanced" | "high";
type Target = "keep" | "jpeg" | "webp" | "avif" | "png";

const LEVELS: Record<Level, { q: number; avif: number; colors: number; label: string }> = {
  small: { q: 0.6, avif: 0.55, colors: 128, label: "Smallest" },
  balanced: { q: 0.75, avif: 0.68, colors: 256, label: "Balanced" },
  high: { q: 0.88, avif: 0.82, colors: 0, label: "Best quality" },
};

const SIZES = [0, 3840, 2560, 1920, 1280, 1024, 800, 640];
const TARGET_KB = [0, 20, 50, 100, 200, 500, 1000];

/**
 * Finds the highest quality that fits under maxBytes, searching JPEG/WebP quality first and
 * shrinking the dimensions only if even low quality is too big.
 */
async function fitToSize(src: HTMLCanvasElement, maxBytes: number, fmt: "jpeg" | "webp") {
  const enc = (c: HTMLCanvasElement, q: number) => (fmt === "jpeg" ? encodeMozJpeg(c, q) : encodeImage(c, "webp", { quality: q }));
  let c = src;
  let smallest: Blob | null = null;
  for (let round = 0; round < 6; round++) {
    const top = await enc(c, 0.92);
    if (top.size <= maxBytes) return { blob: top, w: c.width, h: c.height, fits: true };
    const floor = await enc(c, 0.3);
    if (!smallest || floor.size < smallest.size) smallest = floor;
    if (floor.size <= maxBytes) {
      let lo = 0.3, hi = 0.92, best = floor;
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2;
        const b = await enc(c, mid);
        if (b.size <= maxBytes) { best = b; lo = mid; } else hi = mid;
      }
      return { blob: best, w: c.width, h: c.height, fits: true };
    }
    // Too big even at low quality: shrink the image and try again.
    const k = Math.max(0.3, Math.min(0.9, Math.sqrt(maxBytes / floor.size) * 0.95));
    const w = Math.max(16, Math.round(c.width * k));
    const h = Math.max(16, Math.round(c.height * k));
    c = resizeCanvas(c, w, h);
  }
  return { blob: smallest!, w: c.width, h: c.height, fits: smallest!.size <= maxBytes };
}

const TARGETS: { value: Target; label: string }[] = [
  { value: "keep", label: "Same as original" },
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "png", label: "PNG" },
];

const EXT: Record<Exclude<Target, "keep">, string> = { jpeg: "jpg", webp: "webp", avif: "avif", png: "png" };

type Item = {
  id: string;
  file: File;
  thumb?: string;
  width?: number;
  height?: number;
  status: "working" | "done" | "error";
  out?: Blob;
  outName?: string;
  outW?: number;
  outH?: number;
  /** True when re-encoding didn't help, so the original is kept. */
  kept?: boolean;
  /** In max-size mode: whether the result fits under the limit. */
  fits?: boolean;
  key?: string;
  error?: string;
};

/** Formats without a sensible "same format" output get a close equivalent. */
function resolveTarget(file: File, target: Target): Exclude<Target, "keep"> {
  if (target !== "keep") return target;
  const k = sniffKind(file);
  if (k === "jpg" || k === "jpeg" || k === "jfif") return "jpeg";
  if (k === "png") return "png";
  if (k === "webp") return "webp";
  if (k === "avif") return "avif";
  if (k === "gif" || k === "svg" || k === "ico") return "png";
  return "jpeg"; // heic, bmp, tiff
}

export default function Compressor({ defaultMaxSide = 0, defaultTargetKB = 0 }: { defaultMaxSide?: number; defaultTargetKB?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [level, setLevel] = useState<Level>("balanced");
  const [maxSide, setMaxSide] = useState(defaultMaxSide);
  const [targetKB, setTargetKB] = useState(defaultTargetKB);
  const [target, setTarget] = useState<Target>("keep");
  const [zipping, setZipping] = useState(false);
  const [compare, setCompare] = useState<Item | null>(null);
  const decoded = useRef(new Map<string, Decoded>());
  const run = useRef(0);

  const key = `${level}|${maxSide}|${target}|${targetKB}`;

  const addFiles = useCallback((files: File[]) => {
    setItems((list) => [...list, ...files.map((file) => ({ id: uid(), file, status: "working" as const }))]);
  }, []);

  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  useEffect(() => {
    const myRun = ++run.current;
    const t = setTimeout(async () => {
      for (const it of items) {
        if (run.current !== myRun) return;
        if (it.status === "done" && it.key === key) continue;
        try {
          let d = decoded.current.get(it.id);
          if (!d) {
            d = await decodeImage(it.file);
            decoded.current.set(it.id, d);
            update(it.id, { thumb: await thumbnail(d), width: d.width, height: d.height });
          }
          if (run.current !== myRun) return;
          update(it.id, { status: "working" });

          const scale = maxSide && Math.max(d.width, d.height) > maxSide ? maxSide / Math.max(d.width, d.height) : 1;
          const w = Math.round(d.width * scale);
          const h = Math.round(d.height * scale);
          const canvas = scale < 1 ? resizeCanvas(d.canvas, w, h) : d.canvas;
          const L = LEVELS[level];
          let fmt = resolveTarget(it.file, target);
          let out: Blob;
          let outW = w;
          let outH = h;
          let fits: boolean | undefined;
          let kept = false;
          if (targetKB > 0) {
            // Exact size targets need an adjustable-quality format: WebP if chosen, otherwise JPG.
            fmt = fmt === "webp" ? "webp" : "jpeg";
            // Use 1000 bytes per KB: the stricter reading, which every upload form accepts.
            const limit = targetKB * 1000;
            const isSameJpeg = fmt === "jpeg" && resolveTarget(it.file, "keep") === "jpeg";
            if (isSameJpeg && scale === 1 && it.file.size <= limit) {
              out = it.file;
              kept = true;
              fits = true;
            } else {
              const r = await fitToSize(canvas, limit, fmt);
              out = r.blob;
              outW = r.w;
              outH = r.h;
              fits = r.fits;
            }
          } else {
            if (fmt === "jpeg") out = await encodeMozJpeg(canvas, L.q);
            else if (fmt === "png") out = await encodePngQuant(canvas, L.colors);
            else if (fmt === "avif") out = await encodeImage(canvas, "avif", { quality: L.avif });
            else out = await encodeImage(canvas, "webp", { quality: L.q });
            // Never hand back a bigger file in the same format at the same size.
            const sameFormat = target === "keep" && resolveTarget(it.file, "keep") === fmt && sniffKind(it.file) !== "heic";
            kept = sameFormat && scale === 1 && out.size >= it.file.size;
          }
          if (run.current !== myRun) return;
          setItems((list) =>
            list.map((x) =>
              x.id === it.id
                ? {
                    ...x,
                    status: "done",
                    key,
                    kept,
                    out: kept ? it.file : out,
                    outName: kept ? it.file.name : `${baseName(it.file.name)}.${EXT[fmt]}`,
                    outW,
                    outH,
                    fits,
                  }
                : x,
            ),
          );
        } catch (e) {
          update(it.id, { status: "error", error: (e as Error).message || "Couldn't compress this image." });
        }
        await new Promise((r) => setTimeout(r, 0));
      }
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, key]);

  const isFresh = (i: Item) => i.status === "done" && i.key === key && !!i.out;
  const done = items.filter(isFresh);
  const busy = items.some((i) => i.status !== "error" && !isFresh(i));
  const before = done.reduce((n, i) => n + i.file.size, 0);
  const after = done.reduce((n, i) => n + (i.out?.size ?? 0), 0);

  const remove = (id: string) => {
    setItems((list) => {
      const it = list.find((x) => x.id === id);
      if (it?.thumb) URL.revokeObjectURL(it.thumb);
      return list.filter((x) => x.id !== id);
    });
    decoded.current.delete(id);
  };

  const clearAll = () => {
    items.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    decoded.current.clear();
    setItems([]);
  };

  const downloadAll = async () => {
    if (done.length === 1) return downloadBlob(done[0]!.out!, done[0]!.outName!);
    setZipping(true);
    try {
      downloadBlob(await zipBlobs(done.map((d) => ({ name: d.outName!, blob: d.out! }))), "compressed-images.zip");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div>
      {/* Settings: three simple choices with good defaults. */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="w-40">
          <label className="field-label" htmlFor="maxkb">Max file size</label>
          <select id="maxkb" className="select" value={targetKB} onChange={(e) => setTargetKB(Number(e.target.value))}>
            {TARGET_KB.map((k) => (
              <option key={k} value={k}>
                {k === 0 ? "No limit" : k >= 1000 ? `Under ${k / 1000} MB` : `Under ${k} KB`}
              </option>
            ))}
          </select>
        </div>
        <div className={targetKB ? "pointer-events-none opacity-40" : ""} aria-disabled={targetKB > 0}>
          <p className="field-label">{targetKB ? "Quality: automatic" : "Compression"}</p>
          <Segmented<Level>
            label="Compression level"
            value={level}
            onChange={setLevel}
            options={(Object.keys(LEVELS) as Level[]).map((l) => ({ value: l, label: LEVELS[l].label }))}
          />
        </div>
        <div className="w-40">
          <label className="field-label" htmlFor="resize">Resize</label>
          <select id="resize" className="select" value={maxSide} onChange={(e) => setMaxSide(Number(e.target.value))}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s ? `Max ${s}px` : "Keep size"}
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="field-label" htmlFor="target">Format</label>
          <select id="target" className="select" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {items.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
              Clear
            </button>
            <button type="button" className="btn btn-primary" disabled={!done.length || busy || zipping} onClick={() => void downloadAll()}>
              {busy || zipping ? <Spinner /> : <Icon d={icons.download} />}
              {done.length > 1 ? `Download all (${done.length})` : "Download"}
            </button>
          </div>
        )}
      </div>

      {done.length > 0 && !busy && (
        <div className="fade-up mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-line bg-accent-soft px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">
              {after < before ? `Saved ${formatBytes(before - after)}` : "No savings"}
            </span>{" "}
            <span className="text-muted">
              {formatBytes(before)} → {formatBytes(after)}
            </span>
          </p>
          {after < before && <p className="text-2xl font-semibold tracking-tight text-accent">−{Math.abs(pctChange(before, after))}%</p>}
        </div>
      )}

      <div className="mt-4">
        {items.length === 0 ? (
          <Dropzone onFiles={addFiles} accept={IMAGE_ACCEPT} title="Drop images to compress" hint="JPG · PNG · WebP · AVIF · HEIC · GIF · BMP · TIFF" />
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {items.map((it) => {
                const fresh = isFresh(it);
                const change = fresh ? pctChange(it.file.size, it.out!.size) : 0;
                return (
                  <li key={it.id} className="fade-up flex items-center gap-3 bg-bg px-3 py-2.5 sm:gap-4">
                    <button
                      type="button"
                      className="checker grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line disabled:cursor-default"
                      onClick={() => fresh && !it.kept && setCompare(it)}
                      disabled={!fresh || it.kept}
                      aria-label={`Compare before and after for ${it.file.name}`}
                      title={fresh && !it.kept ? "Compare before and after" : undefined}
                    >
                      {it.thumb ? <img src={it.thumb} alt="" className="max-h-full max-w-full object-contain" /> : <Spinner className="text-subtle" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.file.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-xs text-subtle">
                        <span>{formatBytes(it.file.size)}</span>
                        {fresh && (
                          <>
                            <span>→</span>
                            <span className="text-fg">{formatBytes(it.out!.size)}</span>
                            {it.kept ? (
                              <span>{targetKB ? "already under the limit" : "already optimised"}</span>
                            ) : (
                              <span className={change < 0 ? "text-success" : ""}>{change}%</span>
                            )}
                            {targetKB > 0 && it.fits === true && !it.kept && <span className="text-success">✓ fits</span>}
                            {targetKB > 0 && it.fits === false && <span className="text-danger">couldn't fit the limit</span>}
                            {it.outW && it.width && it.outW !== it.width && (
                              <span>
                                {it.outW}×{it.outH}
                              </span>
                            )}
                          </>
                        )}
                      </p>
                      {it.status === "error" && <p className="mt-1 text-xs text-danger">{it.error}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {it.status !== "error" && !fresh && (
                        <span className="flex items-center gap-2 px-2 text-xs text-subtle">
                          <Spinner />
                        </span>
                      )}
                      {fresh && !it.kept && (
                        <button type="button" className="btn btn-ghost btn-sm hidden sm:inline-flex" onClick={() => setCompare(it)}>
                          Compare
                        </button>
                      )}
                      {fresh && (
                        <button type="button" className="btn btn-sm" onClick={() => downloadBlob(it.out!, it.outName!)} aria-label={`Download ${it.outName}`}>
                          <Icon d={icons.download} />
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(it.id)} aria-label={`Remove ${it.file.name}`}>
                        <Icon d={icons.close} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3">
              <Dropzone onFiles={addFiles} accept={IMAGE_ACCEPT} title="Add more images" compact />
            </div>
          </>
        )}
      </div>

      {compare && <CompareDialog item={compare} decoded={decoded.current.get(compare.id)} onClose={() => setCompare(null)} />}
    </div>
  );
}

/** Before/after slider over the full image. */
function CompareDialog({ item, decoded, onClose }: { item: Item; decoded?: Decoded; onClose: () => void }) {
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl] = useState(() => URL.createObjectURL(item.out!));
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let url: string | null = null;
    decoded?.canvas.toBlob((b) => {
      if (!b) return;
      url = URL.createObjectURL(b);
      setBeforeUrl(url);
    }, "image/png");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (url) URL.revokeObjectURL(url);
      URL.revokeObjectURL(afterUrl);
    };
  }, [decoded, afterUrl, onClose]);

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg/95 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Compare before and after">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 pb-3">
        <p className="truncate text-sm">
          <span className="font-medium">{item.file.name}</span>{" "}
          <span className="font-mono text-xs text-subtle">
            {formatBytes(item.file.size)} → {formatBytes(item.out!.size)}
          </span>
        </p>
        <button type="button" className="btn btn-sm" onClick={onClose} autoFocus>
          <Icon d={icons.close} /> Close
        </button>
      </div>
      <div className="relative mx-auto min-h-0 w-full max-w-6xl flex-1">
        {beforeUrl ? (
          <div
            ref={box}
            className="checker relative mx-auto h-full w-full touch-none select-none overflow-hidden rounded-xl border border-line"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              move(e.clientX);
            }}
            onPointerMove={(e) => e.buttons && move(e.clientX)}
          >
            <img src={afterUrl} alt="Compressed" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
            <img
              src={beforeUrl}
              alt="Original"
              className="absolute inset-0 h-full w-full object-contain"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" style={{ left: `${pos}%` }}>
              <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg">
                <Icon d="m9 18-6-6 6-6M15 6l6 6-6 6" />
              </span>
            </div>
            <span className="absolute top-3 left-3 rounded-md bg-black/65 px-2 py-1 font-mono text-[11px] tracking-wider text-white uppercase">Original</span>
            <span className="absolute top-3 right-3 rounded-md bg-black/65 px-2 py-1 font-mono text-[11px] tracking-wider text-white uppercase">Compressed</span>
          </div>
        ) : (
          <div className="grid h-full place-items-center">
            <Spinner />
          </div>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="mx-auto mt-3 max-w-md"
        aria-label="Comparison position"
      />
    </div>
  );
}
