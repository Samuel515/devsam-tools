import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { Icon, icons, Segmented, Spinner } from "@devsam/ui/react/ui";
import { baseName, downloadBlob, formatBytes, uid, zipBlobs } from "@devsam/ui/lib/files";
import { decodeImage, IMAGE_ACCEPT, resizeCanvas, type Decoded } from "@devsam/ui/lib/image";
import { findPreset, PRESETS } from "../lib/presets";

type Fit = "crop" | "fit";
type Fmt = "jpeg" | "png" | "webp";
const EXT: Record<Fmt, string> = { jpeg: "jpg", png: "png", webp: "webp" };

/** Where the image sits inside the frame: zoom >= 1 fills the frame; x/y are offsets in frame fractions. */
type View = { zoom: number; x: number; y: number };

type Item = { id: string; file: File; decoded?: Decoded; thumb?: string; view: View; error?: string };

const CENTER: View = { zoom: 1, x: 0, y: 0 };

/** Draws one image into a w×h canvas using the crop view or contain-fit. */
function render(d: Decoded, w: number, h: number, fit: Fit, view: View, bg: string): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  if (fit === "fit") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const s = Math.min(w / d.width, h / d.height);
    const dw = Math.round(d.width * s);
    const dh = Math.round(d.height * s);
    // Pre-shrink big images for sharper results.
    const src = s < 0.5 ? resizeCanvas(d.canvas, dw, dh) : d.canvas;
    ctx.drawImage(src, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
    return out;
  }
  const cover = Math.max(w / d.width, h / d.height) * view.zoom;
  const dw = d.width * cover;
  const dh = d.height * cover;
  const maxX = (dw - w) / 2;
  const maxY = (dh - h) / 2;
  const cx = (w - dw) / 2 + Math.max(-maxX, Math.min(maxX, view.x * w));
  const cy = (h - dh) / 2 + Math.max(-maxY, Math.min(maxY, view.y * h));
  const src = cover < 0.5 ? resizeCanvas(d.canvas, Math.round(dw), Math.round(dh)) : d.canvas;
  ctx.drawImage(src, cx, cy, dw, dh);
  return out;
}

const toBlob = (c: HTMLCanvasElement, f: Fmt, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed."))), `image/${f}`, f === "png" ? undefined : q));

export default function Resizer({ defaultPreset = "ig-post" }: { defaultPreset?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [presetId, setPresetId] = useState(defaultPreset);
  const [custom, setCustom] = useState({ w: 1200, h: 800, lock: true });
  const [fit, setFit] = useState<Fit>("crop");
  const [bg, setBg] = useState("#ffffff");
  const [fmt, setFmt] = useState<Fmt>("jpeg");
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<string>("");

  const preset = findPreset(presetId);
  const W = preset ? preset.w : Math.max(1, Math.min(10000, custom.w));
  const H = preset ? preset.h : Math.max(1, Math.min(10000, custom.h));

  const add = useCallback(async (files: File[]) => {
    const fresh = files.map((file) => ({ id: uid(), file, view: CENTER }));
    setItems((l) => [...l, ...fresh]);
    setSelected((s) => s ?? fresh[0]?.id ?? null);
    for (const it of fresh) {
      try {
        const decoded = await decodeImage(it.file);
        const t = resizeCanvas(decoded.canvas, Math.max(1, Math.round(decoded.width * Math.min(1, 1600 / Math.max(decoded.width, decoded.height)))), Math.max(1, Math.round(decoded.height * Math.min(1, 1600 / Math.max(decoded.width, decoded.height)))));
        const thumb = await new Promise<string>((r) => t.toBlob((b) => r(b ? URL.createObjectURL(b) : ""), "image/jpeg", 0.85));
        setItems((l) => l.map((x) => (x.id === it.id ? { ...x, decoded, thumb } : x)));
        // Custom size starts from the first image's own size.
        setCustom((c) => (c.w === 1200 && c.h === 800 ? { ...c, w: decoded.width, h: decoded.height } : c));
      } catch (e) {
        setItems((l) => l.map((x) => (x.id === it.id ? { ...x, error: (e as Error).message } : x)));
      }
    }
  }, []);

  const current = items.find((i) => i.id === selected) ?? items[0];
  const setView = (v: View) => current && setItems((l) => l.map((x) => (x.id === current.id ? { ...x, view: v } : x)));

  // Live size estimate for the selected image.
  useEffect(() => {
    if (!current?.decoded) return;
    const t = setTimeout(async () => {
      const { blob: b } = await exportOne(current);
      setEstimate(formatBytes(b.size) + (preset?.maxKB ? ` (limit ${preset.maxKB} KB)` : ""));
    }, 300);
    return () => clearTimeout(t);
  }, [current, W, H, fit, bg, fmt]);

  const exportOne = async (it: Item) => {
    const canvas = render(it.decoded!, W, H, fit, it.view, bg);
    // Presets with a size limit lower the quality until the file fits (PNG becomes JPG).
    const limit = preset?.maxKB ? preset.maxKB * 1000 : 0;
    const f: Fmt = limit && fmt === "png" ? "jpeg" : fmt;
    let blob = await toBlob(canvas, f, 0.92);
    for (let q = 0.85; limit && blob.size > limit && q >= 0.3; q -= 0.05) blob = await toBlob(canvas, f, q);
    return { blob, name: `${baseName(it.file.name)}-${W}x${H}.${EXT[f]}` };
  };

  const ready = items.filter((i) => i.decoded);
  const download = async () => {
    setBusy(true);
    try {
      if (ready.length === 1) {
        const f = await exportOne(ready[0]!);
        downloadBlob(f.blob, f.name);
      } else {
        const files = [];
        for (const it of ready) files.push(await exportOne(it));
        downloadBlob(await zipBlobs(files), `resized-${W}x${H}.zip`);
      }
    } finally {
      setBusy(false);
    }
  };

  const groups = useMemo(() => [...new Set(PRESETS.map((p) => p.group))], []);
  const ratio = W / H;

  if (!items.length) {
    return (
      <div>
        <PresetPicker groups={groups} presetId={presetId} setPresetId={setPresetId} />
        <div className="mt-4">
          <Dropzone onFiles={add} accept={IMAGE_ACCEPT} title="Drop images to resize" hint="JPG · PNG · WebP · HEIC · resize one or many" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        {/* Frame editor */}
        <div className="grid min-h-[360px] place-items-center rounded-xl border border-line bg-sunken p-4 sm:p-6">
          {current?.decoded && current.thumb ? (
            <Frame
              key={current.id}
              src={current.thumb}
              imgW={current.decoded.width}
              imgH={current.decoded.height}
              ratio={ratio}
              fit={fit}
              bg={bg}
              view={current.view}
              onChange={setView}
            />
          ) : current?.error ? (
            <p className="text-sm text-danger">{current.error}</p>
          ) : (
            <Spinner className="size-6 text-accent" />
          )}
        </div>
        {fit === "crop" && current?.decoded && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex flex-1 items-center gap-3 text-sm text-muted">
              Zoom
              <input type="range" min={1} max={4} step={0.01} value={current.view.zoom} onChange={(e) => setView({ ...current.view, zoom: Number(e.target.value) })} className="max-w-60" />
            </label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView(CENTER)}>
              Reset
            </button>
            <span className="text-xs text-subtle">Drag the photo to choose what's in frame.</span>
          </div>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setSelected(it.id)}
              className={`relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border-2 bg-sunken ${it.id === current?.id ? "border-accent" : "border-line"}`}
              aria-label={it.file.name}
            >
              {it.thumb ? <img src={it.thumb} alt="" className="h-full w-full object-cover" /> : <Spinner className="size-4" />}
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${it.file.name}`}
                className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setItems((l) => l.filter((x) => x.id !== it.id));
                  if (selected === it.id) setSelected(null);
                }}
              >
                <Icon d={icons.close} className="size-3" />
              </span>
            </button>
          ))}
          <label className="grid size-16 shrink-0 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line-strong text-subtle hover:border-accent hover:text-accent" aria-label="Add images">
            <Icon d={icons.plus} />
            <input type="file" multiple accept={IMAGE_ACCEPT} className="sr-only" onChange={(e) => { void add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      <aside className="space-y-5">
        <div>
          <p className="field-label">Size</p>
          <select className="select" value={presetId} onChange={(e) => setPresetId(e.target.value)} aria-label="Size preset">
            <option value="custom">Custom size</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {PRESETS.filter((p) => p.group === g).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} · {p.w}×{p.h}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!preset && (
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <label>
                <span className="field-label">Width</span>
                <input
                  className="input font-mono"
                  type="number"
                  min={1}
                  max={10000}
                  value={custom.w}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    const d = current?.decoded;
                    setCustom((c) => ({ ...c, w, h: c.lock && d ? Math.round((w * d.height) / d.width) : c.h }));
                  }}
                />
              </label>
              <button
                type="button"
                className={`btn btn-icon btn-sm mb-1 ${custom.lock ? "text-accent" : "text-subtle"}`}
                onClick={() => setCustom((c) => ({ ...c, lock: !c.lock }))}
                aria-pressed={custom.lock}
                aria-label="Keep proportions"
                title="Keep proportions"
              >
                <Icon d={custom.lock ? "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" : "M7 11V7a5 5 0 0 1 9.9-1M5 11h14v10H5z"} />
              </button>
              <label>
                <span className="field-label">Height</span>
                <input
                  className="input font-mono"
                  type="number"
                  min={1}
                  max={10000}
                  value={custom.h}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    const d = current?.decoded;
                    setCustom((c) => ({ ...c, h, w: c.lock && d ? Math.round((h * d.width) / d.height) : c.w }));
                  }}
                />
              </label>
            </div>
          )}
          {preset?.note && <p className="mt-1 text-xs text-subtle">{preset.note}</p>}
        </div>

        <div>
          <p className="field-label">When the shape is different</p>
          <Segmented<Fit> label="Fit" value={fit} onChange={setFit} options={[{ value: "crop", label: "Crop to fill" }, { value: "fit", label: "Fit with border" }]} />
          {fit === "fit" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} aria-label="Border colour" /> Border colour
            </label>
          )}
        </div>

        <div>
          <p className="field-label">Format</p>
          <Segmented<Fmt> label="Format" value={fmt} onChange={setFmt} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" }]} />
        </div>

        <div className="space-y-2 border-t border-line pt-5">
          <button type="button" className="btn btn-primary w-full" disabled={!ready.length || busy} onClick={() => void download()}>
            {busy ? <Spinner /> : <Icon d={icons.download} />}
            {ready.length > 1 ? `Download all (${ready.length})` : "Download"} · {W}×{H}
          </button>
          {estimate && ready.length === 1 && <p className="text-center text-xs text-subtle">About {estimate}</p>}
          <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => { setItems([]); setSelected(null); }}>
            Start over
          </button>
        </div>
      </aside>
    </div>
  );
}

function PresetPicker({ groups, presetId, setPresetId }: { groups: string[]; presetId: string; setPresetId: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-muted">Resize for</span>
      <select className="select w-auto min-w-64" value={presetId} onChange={(e) => setPresetId(e.target.value)} aria-label="Size preset">
        <option value="custom">Custom size</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {PRESETS.filter((p) => p.group === g).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} · {p.w}×{p.h}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

/** The frame preview: drag to pan, wheel to zoom. Mirrors render() so what you see is what you get. */
function Frame({ src, imgW, imgH, ratio, fit, bg, view, onChange }: { src: string; imgW: number; imgH: number; ratio: number; fit: Fit; bg: string; view: View; onChange: (v: View) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const maxW = el.clientWidth - 8;
      const maxH = Math.min(520, window.innerHeight * 0.6);
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  const { w, h } = size;
  let style: React.CSSProperties = {};
  if (w && h) {
    if (fit === "fit") {
      const s = Math.min(w / imgW, h / imgH);
      style = { width: imgW * s, height: imgH * s, left: (w - imgW * s) / 2, top: (h - imgH * s) / 2 };
    } else {
      const s = Math.max(w / imgW, h / imgH) * view.zoom;
      const dw = imgW * s;
      const dh = imgH * s;
      const maxX = (dw - w) / 2;
      const maxY = (dh - h) / 2;
      style = {
        width: dw,
        height: dh,
        left: (w - dw) / 2 + Math.max(-maxX, Math.min(maxX, view.x * w)),
        top: (h - dh) / 2 + Math.max(-maxY, Math.min(maxY, view.y * h)),
      };
    }
  }

  return (
    <div
      ref={box}
      className={`relative overflow-hidden rounded-md shadow-lg ring-1 ring-line-strong ${fit === "crop" ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      style={{ width: w, height: h, background: fit === "fit" ? bg : undefined }}
      onPointerDown={(e) => {
        if (fit !== "crop") return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      }}
      onPointerMove={(e) => {
        if (!drag.current || !w) return;
        // Clamp so the image always covers the frame.
        const s = Math.max(w / imgW, h / imgH) * view.zoom;
        const lx = (imgW * s - w) / 2 / w;
        const ly = (imgH * s - h) / 2 / h;
        const x = Math.max(-lx, Math.min(lx, drag.current.vx + (e.clientX - drag.current.x) / w));
        const y = Math.max(-ly, Math.min(ly, drag.current.vy + (e.clientY - drag.current.y) / h));
        onChange({ ...view, x, y });
      }}
      onPointerUp={() => (drag.current = null)}
      onWheel={(e) => {
        if (fit !== "crop") return;
        onChange({ ...view, zoom: Math.max(1, Math.min(4, view.zoom - e.deltaY * 0.0015)) });
      }}
    >
      <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={style} />
      {fit === "crop" && (
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, rgb(255 255 255 / .25) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / .25) 1px, transparent 1px)", backgroundSize: `${w / 3}px ${h / 3}px`, backgroundPosition: "-1px -1px" }} />
      )}
    </div>
  );
}
