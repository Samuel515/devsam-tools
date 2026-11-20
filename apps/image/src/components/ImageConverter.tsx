import { useCallback, useEffect, useRef, useState } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { Icon, icons, Spinner } from "@devsam/ui/react/ui";
import { baseName, downloadBlob, formatBytes, uid, zipBlobs, pctChange } from "@devsam/ui/lib/files";
import {
  decodeImage,
  encodeImage,
  formatInfo,
  IMAGE_ACCEPT,
  OUT_FORMATS,
  sniffKind,
  thumbnail,
  type Decoded,
  type OutFormat,
} from "@devsam/ui/lib/image";

type Item = {
  id: string;
  file: File;
  thumb?: string;
  width?: number;
  height?: number;
  status: "decoding" | "converting" | "done" | "error";
  out?: Blob;
  outName?: string;
  error?: string;
  /** Settings that produced `out`; a mismatch means the result is stale. */
  key?: string;
};

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const FORMAT_KEY = "image:format";

export default function ImageConverter({ defaultTo }: { defaultTo?: OutFormat }) {
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<OutFormat>(defaultTo ?? "jpeg");
  const [quality, setQuality] = useState(0.9);
  const [background, setBackground] = useState("#ffffff");
  const [icoSizes, setIcoSizes] = useState<number[]>([16, 32, 48, 256]);
  const [showOptions, setShowOptions] = useState(false);
  const [zipping, setZipping] = useState(false);
  const decoded = useRef(new Map<string, Decoded>());
  const run = useRef(0);

  // Remember the last format, unless this page is for a specific conversion.
  useEffect(() => {
    if (defaultTo) return;
    const saved = localStorage.getItem(FORMAT_KEY) as OutFormat | null;
    if (saved && OUT_FORMATS.some((f) => f.value === saved)) setFormat(saved);
  }, [defaultTo]);
  useEffect(() => {
    if (!defaultTo) localStorage.setItem(FORMAT_KEY, format);
  }, [format, defaultTo]);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const addFiles = useCallback((files: File[]) => {
    const fresh: Item[] = files.map((file) => ({ id: uid(), file, status: "decoding" }));
    setItems((list) => [...list, ...fresh]);
  }, []);

  // Decode new files (once), then convert whatever needs converting.
  const settingsKey = `${format}|${quality}|${background}|${icoSizes.join(",")}`;
  useEffect(() => {
    const myRun = ++run.current;
    const timer = setTimeout(async () => {
      for (const it of items) {
        if (run.current !== myRun) return;
        try {
          let d = decoded.current.get(it.id);
          if (!d) {
            d = await decodeImage(it.file);
            decoded.current.set(it.id, d);
            const thumb = await thumbnail(d);
            update(it.id, { thumb, width: d.width, height: d.height });
          }
          if (run.current !== myRun) return;
          if (it.status === "done" && it.out && it.key === settingsKey) continue;
          update(it.id, { status: "converting", error: undefined });
          const out = await encodeImage(d.canvas, format, { quality, background, icoSizes });
          if (run.current !== myRun) return;
          setItems((list) =>
            list.map((x) =>
              x.id === it.id
                ? { ...x, status: "done" as const, out, outName: `${baseName(it.file.name)}.${formatInfo(format).ext}`, key: settingsKey }
                : x,
            ),
          );
        } catch (e) {
          update(it.id, { status: "error", error: (e as Error).message || "Couldn't convert this image." });
        }
        // Let the page breathe between images.
        await new Promise((r) => setTimeout(r, 0));
      }
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, settingsKey]);

  const remove = (id: string) => {
    setItems((list) => {
      const it = list.find((x) => x.id === id);
      if (it?.thumb) URL.revokeObjectURL(it.thumb);
      return list.filter((x) => x.id !== id);
    });
    decoded.current.delete(id);
  };

  const clearAll = () => {
    items.forEach((it) => it.thumb && URL.revokeObjectURL(it.thumb));
    decoded.current.clear();
    setItems([]);
  };

  // A result counts only if it was made with the current settings.
  const isFresh = (i: Item) => i.status === "done" && !!i.out && i.key === settingsKey;
  const done = items.filter(isFresh);
  const busy = items.some((i) => i.status !== "error" && !isFresh(i));
  const info = formatInfo(format);

  const downloadAll = async () => {
    if (done.length === 1) return downloadBlob(done[0]!.out!, done[0]!.outName!);
    setZipping(true);
    try {
      const zip = await zipBlobs(done.map((d) => ({ name: d.outName!, blob: d.out! })));
      downloadBlob(zip, `converted-${info.ext}.zip`);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div>
      {/* Format picker: always visible so people can choose before dropping files. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted">Convert to</span>
        <div className="seg max-w-full overflow-x-auto" role="radiogroup" aria-label="Output format">
          {OUT_FORMATS.map((f) => (
            <button key={f.value} type="button" role="radio" aria-checked={format === f.value} aria-pressed={format === f.value} onClick={() => setFormat(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowOptions((o) => !o)} aria-expanded={showOptions}>
          Options
          <Icon d="m6 9 6 6 6-6" className={`size-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`} />
        </button>
        {items.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
              Clear
            </button>
            <button type="button" className="btn btn-primary" disabled={!done.length || busy || zipping} onClick={downloadAll}>
              {zipping || busy ? <Spinner /> : <Icon d={icons.download} />}
              {done.length > 1 ? `Download all (${done.length})` : "Download"}
            </button>
          </div>
        )}
      </div>

      {showOptions && (
        <div className="fade-up mt-4 grid gap-5 rounded-xl border border-line bg-sunken p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={info.lossy ? "" : "opacity-40"}>
            <label className="field-label" htmlFor="quality">
              Quality <span className="font-mono text-subtle">{Math.round(quality * 100)}%</span>
            </label>
            <input id="quality" type="range" min={0.4} max={1} step={0.01} value={quality} disabled={!info.lossy} onChange={(e) => setQuality(Number(e.target.value))} />
            <p className="mt-1 text-xs text-subtle">{info.lossy ? "Lower means smaller files." : `${info.label} is lossless.`}</p>
          </div>
          <div className={info.alpha ? "opacity-40" : ""}>
            <label className="field-label" htmlFor="bg">Background for transparent areas</label>
            <div className="flex items-center gap-2">
              <input id="bg" type="color" value={background} disabled={info.alpha} onChange={(e) => setBackground(e.target.value)} />
              <span className="font-mono text-xs text-subtle">{info.alpha ? `${info.label} keeps transparency` : background}</span>
            </div>
          </div>
          {format === "ico" && (
            <fieldset>
              <legend className="field-label">Icon sizes</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ICO_SIZES.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={icoSizes.includes(s)}
                      onChange={(e) => setIcoSizes((list) => (e.target.checked ? [...list, s] : list.filter((x) => x !== s)))}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      <div className="mt-4">
        {items.length === 0 ? (
          <Dropzone onFiles={addFiles} accept={IMAGE_ACCEPT} title="Drop images here" hint="HEIC · JPG · PNG · WebP · AVIF · GIF · BMP · TIFF · SVG · ICO" />
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {items.map((it) => (
                <li key={it.id} className="fade-up flex items-center gap-3 bg-bg px-3 py-2.5 sm:gap-4">
                  <div className="checker grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line">
                    {it.thumb ? <img src={it.thumb} alt="" className="max-h-full max-w-full object-contain" /> : <Spinner className="text-subtle" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.file.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-xs text-subtle">
                      <span className="uppercase">{sniffKind(it.file)}</span>
                      <span>{formatBytes(it.file.size)}</span>
                      {it.width && <span>{it.width}×{it.height}</span>}
                      {isFresh(it) && it.out && (
                        <span className="text-fg">
                          → {info.label} · {formatBytes(it.out.size)}{" "}
                          <span className={it.out.size <= it.file.size ? "text-success" : "text-subtle"}>
                            ({pctChange(it.file.size, it.out.size) > 0 ? "+" : ""}
                            {pctChange(it.file.size, it.out.size)}%)
                          </span>
                        </span>
                      )}
                    </p>
                    {it.status === "error" && <p className="mt-1 text-xs text-danger">{it.error}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {it.status !== "error" && !isFresh(it) && (
                      <span className="flex items-center gap-2 px-2 text-xs text-subtle">
                        <Spinner /> <span className="hidden sm:inline">{it.status === "decoding" ? "Reading" : "Converting"}</span>
                      </span>
                    )}
                    {isFresh(it) && it.out && (
                      <button type="button" className="btn btn-sm" onClick={() => downloadBlob(it.out!, it.outName!)} aria-label={`Download ${it.outName}`}>
                        <Icon d={icons.download} />
                        <span className="hidden sm:inline">{info.label}</span>
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(it.id)} aria-label={`Remove ${it.file.name}`}>
                      <Icon d={icons.close} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Dropzone onFiles={addFiles} accept={IMAGE_ACCEPT} title="Add more images" compact />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
