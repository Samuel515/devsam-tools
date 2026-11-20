import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { PdfThumb } from "@devsam/ui/react/PdfThumb";
import { Icon, icons, Segmented, Spinner } from "@devsam/ui/react/ui";
import { baseName, downloadBlob, formatBytes, uid, zipBlobs } from "@devsam/ui/lib/files";
import { IMAGE_ACCEPT } from "@devsam/ui/lib/image";
import { openPdf, PdfPasswordError, type PDFDocumentProxy } from "@devsam/ui/lib/pdf";
import { build, imagesToPdf, MARGINS, merge, parseRanges, split, toBlob, type Margin, type PageSize } from "../lib/ops";

export type Mode = "merge" | "split" | "organize" | "images";
const PDF_ACCEPT = "application/pdf,.pdf";

// ---------- Shared bits ----------

type Loaded = { file: File; buf: ArrayBuffer; doc: PDFDocumentProxy };

async function loadPdf(file: File): Promise<Loaded> {
  const buf = await file.arrayBuffer();
  try {
    const doc = await openPdf(buf);
    return { file, buf, doc };
  } catch (e) {
    if (e instanceof PdfPasswordError) throw new Error(`"${file.name}" is password protected. Remove the password first.`);
    throw new Error(`"${file.name}": ${(e as Error).message}`);
  }
}

/** Reorder by drag and drop (mouse) with arrow buttons as the touch/keyboard fallback. */
function useDragSort<T>(setList: (fn: (l: T[]) => T[]) => void) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = useCallback(
    (a: number, b: number) =>
      setList((l) => {
        if (b < 0 || b >= l.length || a === b) return l;
        const next = l.slice();
        const [x] = next.splice(a, 1);
        next.splice(b, 0, x!);
        return next;
      }),
    [setList],
  );
  const props = (i: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      setFrom(i);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(i));
    },
    onDragOver: (e: DragEvent) => {
      if (from === null) return;
      e.preventDefault();
      setOver(i);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (from !== null) move(from, i);
      setFrom(null);
      setOver(null);
    },
    onDragEnd: () => {
      setFrom(null);
      setOver(null);
    },
    "data-dragging": from === i ? "true" : undefined,
    "data-over": over === i && from !== i ? "true" : undefined,
  });
  return { props, move };
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
      {children}
    </p>
  );
}

function FileBar({ file, pages, onReset }: { file: File; pages: number; onReset: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-sunken px-3 py-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon d={icons.file} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="font-mono text-xs text-subtle">
          {formatBytes(file.size)} · {pages} {pages === 1 ? "page" : "pages"}
        </p>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
        Choose another
      </button>
    </div>
  );
}

const save = (bytes: Uint8Array, name: string) => downloadBlob(toBlob(bytes), name);

// ---------- Merge ----------

type MergeItem = Loaded & { id: string };

function MergeTool() {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(0);
  const [working, setWorking] = useState(false);
  const { props, move } = useDragSort<MergeItem>(setItems);

  const add = async (files: File[]) => {
    setError("");
    setLoading((n) => n + files.length);
    for (const f of files) {
      try {
        const l = await loadPdf(f);
        setItems((list) => [...list, { ...l, id: uid() }]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading((n) => n - 1);
      }
    }
  };

  const run = async () => {
    setWorking(true);
    setError("");
    try {
      save(await merge(items.map((i) => i.buf)), "merged.pdf");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const totalPages = items.reduce((n, i) => n + i.doc.numPages, 0);

  if (!items.length && !loading) {
    return (
      <>
        <Dropzone onFiles={add} accept={PDF_ACCEPT} title="Drop PDFs to merge" hint="Add two or more PDFs, then put them in order" />
        {error && <ErrorNote>{error}</ErrorNote>}
      </>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          {items.length} {items.length === 1 ? "file" : "files"} · {totalPages} pages
          <span className="hidden sm:inline"> · drag to reorder</span>
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems([])}>
            Clear
          </button>
          <button type="button" className="btn btn-primary" disabled={items.length < 2 || working || loading > 0} onClick={() => void run()}>
            {working ? <Spinner /> : <Icon d={icons.download} />}
            Merge {items.length > 1 ? `${items.length} PDFs` : "PDFs"}
          </button>
        </div>
      </div>
      {items.length === 1 && <p className="mt-2 text-sm text-subtle">Add at least one more PDF to merge.</p>}

      <ul className="mt-4 space-y-2">
        {items.map((it, i) => (
          <li
            key={it.id}
            {...props(i)}
            className="fade-up flex cursor-grab items-center gap-3 rounded-xl border border-line bg-bg p-2 pr-3 transition-colors active:cursor-grabbing data-[dragging=true]:opacity-40 data-[over=true]:border-accent"
          >
            <span className="w-5 text-center font-mono text-xs text-subtle">{i + 1}</span>
            <div className="w-10 shrink-0 overflow-hidden rounded border border-line">
              <PdfThumb doc={it.doc} pageNumber={1} width={40} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{it.file.name}</p>
              <p className="font-mono text-xs text-subtle">
                {it.doc.numPages} {it.doc.numPages === 1 ? "page" : "pages"} · {formatBytes(it.file.size)}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                <Icon d={icons.up} />
              </button>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                <Icon d={icons.down} />
              </button>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Remove ${it.file.name}`} onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}>
                <Icon d={icons.close} />
              </button>
            </div>
          </li>
        ))}
        {loading > 0 && (
          <li className="flex items-center gap-2 px-3 py-2 text-sm text-subtle">
            <Spinner /> Reading {loading} {loading === 1 ? "file" : "files"}…
          </li>
        )}
      </ul>
      <div className="mt-3">
        <Dropzone onFiles={add} accept={PDF_ACCEPT} title="Add more PDFs" compact />
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

// ---------- Single-PDF loader shared by Split and Organize ----------

function useSinglePdf() {
  const [pdf, setPdf] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const open = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError("");
    setLoading(true);
    try {
      setPdf(await loadPdf(f));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const reset = () => {
    void pdf?.doc.loadingTask.destroy();
    setPdf(null);
    setError("");
  };
  return { pdf, error, setError, loading, open, reset };
}

function PageTile({
  doc,
  page,
  label,
  selected,
  rotation = 0,
  onClick,
  children,
  dragProps,
}: {
  doc: PDFDocumentProxy;
  page: number;
  label?: ReactNode;
  selected?: boolean;
  rotation?: number;
  onClick?: () => void;
  children?: ReactNode;
  dragProps?: Record<string, unknown>;
}) {
  return (
    <li
      {...dragProps}
      className={`group relative rounded-xl border p-2 transition-all data-[dragging=true]:opacity-40 data-[over=true]:ring-2 data-[over=true]:ring-accent ${
        selected === undefined ? "border-line bg-sunken" : selected ? "border-accent bg-accent-soft" : "border-line bg-sunken opacity-60 hover:opacity-100"
      } ${dragProps ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <button type="button" className="block w-full" onClick={onClick} aria-pressed={selected} aria-label={`Page ${page}`} tabIndex={onClick ? 0 : -1}>
        <PdfThumb doc={doc} pageNumber={page} width={150} rotation={rotation} />
      </button>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-subtle">
        <span>{label ?? page}</span>
        {selected !== undefined && (
          <span className={`grid size-4 place-items-center rounded border ${selected ? "border-accent bg-accent text-accent-fg" : "border-line-strong"}`} aria-hidden="true">
            {selected && <Icon d={icons.check} className="size-3" />}
          </span>
        )}
      </div>
      {children}
    </li>
  );
}

// ---------- Split ----------

type SplitMode = "select" | "each" | "ranges";

function SplitTool() {
  const { pdf, error, setError, loading, open, reset } = useSinglePdf();
  const [mode, setMode] = useState<SplitMode>("select");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ranges, setRanges] = useState("");
  const [working, setWorking] = useState(false);
  const pages = pdf?.doc.numPages ?? 0;

  useEffect(() => {
    setSelected(new Set());
    setRanges(pages > 1 ? `1-${Math.ceil(pages / 2)}, ${Math.ceil(pages / 2) + 1}-${pages}` : "1");
  }, [pdf, pages]);

  if (!pdf) {
    return (
      <>
        <Dropzone onFiles={open} accept={PDF_ACCEPT} multiple={false} title="Drop a PDF to split" hint="Extract pages or split into several files" />
        {loading && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Spinner /> Opening…</p>}
        {error && <ErrorNote>{error}</ErrorNote>}
      </>
    );
  }

  const name = baseName(pdf.file.name);
  const toggle = (n: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  let rangeError = "";
  let groups: number[][] = [];
  if (mode === "ranges") {
    try {
      groups = parseRanges(ranges, pages);
    } catch (e) {
      rangeError = (e as Error).message;
    }
  }

  const run = async () => {
    setWorking(true);
    setError("");
    try {
      if (mode === "select") {
        const list = [...selected].sort((a, b) => a - b);
        save(await build(pdf.buf, list.map((n) => ({ index: n - 1, rotation: 0 }))), `${name}-pages.pdf`);
      } else {
        const g = mode === "each" ? Array.from({ length: pages }, (_, i) => [i]) : groups;
        const files = await split(pdf.buf, g);
        if (files.length === 1) return save(files[0]!, `${name}-part.pdf`);
        const pad = String(pages).length;
        const label = (grp: number[]) =>
          grp.length === 1 ? `page-${String(grp[0]! + 1).padStart(pad, "0")}` : `pages-${grp[0]! + 1}-${grp[grp.length - 1]! + 1}`;
        downloadBlob(await zipBlobs(files.map((b, i) => ({ name: `${name}-${label(g[i]!)}.pdf`, blob: toBlob(b) }))), `${name}-split.zip`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const ready = mode === "select" ? selected.size > 0 : mode === "each" ? pages > 1 : !rangeError;
  const action =
    mode === "select"
      ? `Extract ${selected.size || ""} ${selected.size === 1 ? "page" : "pages"}`
      : mode === "each"
        ? `Split into ${pages} files`
        : `Split into ${groups.length || "…"} ${groups.length === 1 ? "file" : "files"}`;

  return (
    <div>
      <FileBar file={pdf.file} pages={pages} onReset={reset} />
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="field-label">How to split</p>
          <Segmented<SplitMode>
            label="How to split"
            value={mode}
            onChange={setMode}
            options={[
              { value: "select", label: "Pick pages" },
              { value: "each", label: "Every page" },
              { value: "ranges", label: "By ranges" },
            ]}
          />
        </div>
        {mode === "ranges" && (
          <div className="min-w-[14rem] flex-1">
            <label className="field-label" htmlFor="ranges">Ranges (one file each)</label>
            <input id="ranges" className="input font-mono" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 4-6, 7-" />
          </div>
        )}
        <button type="button" className="btn btn-primary ml-auto" disabled={!ready || working} onClick={() => void run()}>
          {working ? <Spinner /> : <Icon d={icons.download} />}
          {action}
        </button>
      </div>
      {mode === "ranges" && rangeError && <p className="mt-2 text-sm text-danger">{rangeError}</p>}
      {mode === "select" && <p className="mt-4 text-sm text-muted">Click the pages to put in the new PDF. {selected.size} selected.</p>}
      {mode === "each" && <p className="mt-4 text-sm text-muted">Each page becomes its own PDF, downloaded together as a ZIP.</p>}
      {error && <ErrorNote>{error}</ErrorNote>}

      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <PageTile
            key={n}
            doc={pdf.doc}
            page={n}
            selected={mode === "select" ? selected.has(n) : undefined}
            onClick={mode === "select" ? () => toggle(n) : undefined}
          />
        ))}
      </ul>
    </div>
  );
}

// ---------- Organize: reorder, rotate, delete ----------

type Slot = { id: string; page: number; rotation: number };

function OrganizeTool() {
  const { pdf, error, setError, loading, open, reset } = useSinglePdf();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [working, setWorking] = useState(false);
  const { props, move } = useDragSort<Slot>(setSlots);
  const pages = pdf?.doc.numPages ?? 0;

  const fresh = useCallback(() => setSlots(Array.from({ length: pages }, (_, i) => ({ id: uid(), page: i + 1, rotation: 0 }))), [pages]);
  useEffect(() => {
    fresh();
  }, [pdf, fresh]);

  if (!pdf) {
    return (
      <>
        <Dropzone onFiles={open} accept={PDF_ACCEPT} multiple={false} title="Drop a PDF to organise" hint="Reorder, rotate or delete pages" />
        {loading && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Spinner /> Opening…</p>}
        {error && <ErrorNote>{error}</ErrorNote>}
      </>
    );
  }

  const rotate = (id: string, by: number) => setSlots((l) => l.map((s) => (s.id === id ? { ...s, rotation: (s.rotation + by + 360) % 360 } : s)));
  const changed = slots.length !== pages || slots.some((s, i) => s.page !== i + 1 || s.rotation !== 0);

  const run = async () => {
    setWorking(true);
    setError("");
    try {
      save(await build(pdf.buf, slots.map((s) => ({ index: s.page - 1, rotation: s.rotation }))), `${baseName(pdf.file.name)}-edited.pdf`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FileBar file={pdf.file} pages={pages} onReset={reset} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setSlots((l) => l.map((s) => ({ ...s, rotation: (s.rotation + 90) % 360 })))}>
          <Icon d={icons.rotate} /> Rotate all
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!changed} onClick={fresh}>
          Reset
        </button>
        <p className="hidden text-sm text-subtle md:block">Drag pages to reorder. Hover a page to rotate or delete it.</p>
        <button type="button" className="btn btn-primary ml-auto" disabled={!slots.length || working} onClick={() => void run()}>
          {working ? <Spinner /> : <Icon d={icons.download} />}
          Save PDF ({slots.length} {slots.length === 1 ? "page" : "pages"})
        </button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {slots.map((s, i) => (
          <PageTile key={s.id} doc={pdf.doc} page={s.page} rotation={s.rotation} label={`${i + 1}${s.page !== i + 1 ? ` (was ${s.page})` : ""}`} dragProps={props(i)}>
            <div className="absolute inset-x-2 top-2 flex justify-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {[
                { label: "Rotate left", d: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5", run: () => rotate(s.id, -90) },
                { label: "Rotate right", d: icons.rotate, run: () => rotate(s.id, 90) },
                { label: "Move earlier", d: icons.left, run: () => move(i, i - 1) },
                { label: "Move later", d: icons.right, run: () => move(i, i + 1) },
                { label: "Delete page", d: icons.trash, run: () => setSlots((l) => l.filter((x) => x.id !== s.id)) },
              ].map((a) => (
                <button key={a.label} type="button" className="grid size-7 place-items-center rounded-md border border-line bg-elev text-muted shadow-sm hover:text-fg" aria-label={`${a.label}, page ${s.page}`} title={a.label} onClick={a.run}>
                  <Icon d={a.d} className="size-3.5" />
                </button>
              ))}
            </div>
          </PageTile>
        ))}
      </ul>
      {!slots.length && (
        <p className="mt-4 text-sm text-muted">
          You've removed every page.{" "}
          <button type="button" className="text-accent underline" onClick={fresh}>
            Start over
          </button>
        </p>
      )}
    </div>
  );
}

// ---------- Images to PDF ----------

type Img = { id: string; file: File; url: string };

function ImagesTool() {
  const [imgs, setImgs] = useState<Img[]>([]);
  const [size, setSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<Margin>(18);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const { props, move } = useDragSort<Img>(setImgs);

  useEffect(() => () => imgs.forEach((i) => URL.revokeObjectURL(i.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (files: File[]) => setImgs((l) => [...l, ...files.map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) }))]);

  const run = async () => {
    setError("");
    setProgress(0);
    try {
      const bytes = await imagesToPdf(imgs.map((i) => i.file), { size, margin }, setProgress);
      save(bytes, imgs.length === 1 ? `${baseName(imgs[0]!.file.name)}.pdf` : "images.pdf");
    } catch (e) {
      setError((e as Error).message || "Couldn't create the PDF.");
    } finally {
      setProgress(null);
    }
  };

  if (!imgs.length) {
    return <Dropzone onFiles={add} accept={IMAGE_ACCEPT} title="Drop images to turn into a PDF" hint="JPG · PNG · WebP · HEIC · one image per page" />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="field-label">Page size</p>
          <Segmented<PageSize>
            label="Page size"
            value={size}
            onChange={setSize}
            options={[
              { value: "a4", label: "A4" },
              { value: "letter", label: "Letter" },
              { value: "fit", label: "Fit image" },
            ]}
          />
        </div>
        <div>
          <p className="field-label">Margin</p>
          <Segmented<string> label="Margin" value={String(margin)} onChange={(v) => setMargin(Number(v) as Margin)} options={MARGINS.map((m) => ({ value: String(m.value), label: m.label }))} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImgs([])}>
            Clear
          </button>
          <button type="button" className="btn btn-primary" disabled={progress !== null} onClick={() => void run()}>
            {progress !== null ? <Spinner /> : <Icon d={icons.download} />}
            {progress !== null ? `Adding ${progress} / ${imgs.length}` : `Create PDF (${imgs.length} ${imgs.length === 1 ? "page" : "pages"})`}
          </button>
        </div>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="mt-4 text-sm text-subtle">Each image becomes a page, in this order. Drag to reorder.</p>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {imgs.map((im, i) => (
          <li key={im.id} {...props(i)} className="group relative cursor-grab rounded-xl border border-line bg-sunken p-2 active:cursor-grabbing data-[dragging=true]:opacity-40 data-[over=true]:ring-2 data-[over=true]:ring-accent">
            <div className="grid aspect-[1/1.414] place-items-center overflow-hidden rounded bg-white p-1.5">
              <img src={im.url} alt="" className="max-h-full max-w-full object-contain" draggable={false} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1 font-mono text-[11px] text-subtle">
              <span className="truncate">{i + 1}. {im.file.name}</span>
            </div>
            <div className="absolute inset-x-2 top-2 flex justify-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {[
                { label: "Move earlier", d: icons.left, run: () => move(i, i - 1) },
                { label: "Move later", d: icons.right, run: () => move(i, i + 1) },
                {
                  label: "Remove",
                  d: icons.trash,
                  run: () => {
                    URL.revokeObjectURL(im.url);
                    setImgs((l) => l.filter((x) => x.id !== im.id));
                  },
                },
              ].map((a) => (
                <button key={a.label} type="button" className="grid size-7 place-items-center rounded-md border border-line bg-elev text-muted shadow-sm hover:text-fg" aria-label={`${a.label}: ${im.file.name}`} title={a.label} onClick={a.run}>
                  <Icon d={a.d} className="size-3.5" />
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <Dropzone onFiles={add} accept={IMAGE_ACCEPT} title="Add more images" compact />
      </div>
    </div>
  );
}

// ---------- Shell ----------

export const MODES: { value: Mode; label: string; href: string }[] = [
  { value: "merge", label: "Merge", href: "/" },
  { value: "split", label: "Split", href: "/split-pdf" },
  { value: "organize", label: "Rotate & reorder", href: "/organize-pdf" },
  { value: "images", label: "Images to PDF", href: "/images-to-pdf" },
];

export default function PdfToolkit({ mode }: { mode: Mode }) {
  return (
    <div>
      <nav className="seg mb-5 flex w-full overflow-x-auto sm:inline-flex sm:w-auto" aria-label="PDF tools">
        {MODES.map((m) => (
          <a
            key={m.value}
            href={m.href}
            aria-current={m.value === mode ? "page" : undefined}
            className={`flex h-8 flex-1 items-center justify-center rounded-[0.55rem] px-3 text-[0.8125rem] whitespace-nowrap transition-colors sm:flex-none ${
              m.value === mode ? "bg-elev text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {m.label}
          </a>
        ))}
      </nav>
      {mode === "merge" && <MergeTool />}
      {mode === "split" && <SplitTool />}
      {mode === "organize" && <OrganizeTool />}
      {mode === "images" && <ImagesTool />}
    </div>
  );
}
