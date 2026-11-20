import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { PdfThumb } from "@devsam/ui/react/PdfThumb";
import { Icon, icons, Segmented, Spinner } from "@devsam/ui/react/ui";
import { baseName, downloadBlob, formatBytes, zipBlobs } from "@devsam/ui/lib/files";
import { canvasToBlob, openPdf, PdfPasswordError, renderPage, type PDFDocumentProxy } from "@devsam/ui/lib/pdf";

type Fmt = "png" | "jpeg" | "webp";
type Dpi = "72" | "150" | "300";

const FORMATS: { value: Fmt; label: string; ext: string; mime: string }[] = [
  { value: "png", label: "PNG", ext: "png", mime: "image/png" },
  { value: "jpeg", label: "JPG", ext: "jpg", mime: "image/jpeg" },
  { value: "webp", label: "WebP", ext: "webp", mime: "image/webp" },
];

type Result = { page: number; name: string; blob: Blob; url: string };

export default function PdfToImage({ defaultFormat = "png" }: { defaultFormat?: Fmt }) {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [needPassword, setNeedPassword] = useState<false | "ask" | "wrong">(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [format, setFormat] = useState<Fmt>(defaultFormat);
  const [dpi, setDpi] = useState<Dpi>("150");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const cancel = useRef(false);

  const pages = doc?.numPages ?? 0;

  useEffect(() => () => results.forEach((r) => URL.revokeObjectURL(r.url)), [results]);

  // Settings changed: earlier results no longer match.
  useEffect(() => {
    setResults([]);
  }, [format, dpi, selected]);

  const reset = () => {
    cancel.current = true;
    void doc?.loadingTask.destroy();
    setDoc(null);
    setFile(null);
    setBuffer(null);
    setNeedPassword(false);
    setPassword("");
    setError("");
    setResults([]);
    setProgress(null);
  };

  async function load(buf: ArrayBuffer, pw?: string) {
    setLoading(true);
    setError("");
    try {
      const d = await openPdf(buf, pw);
      setDoc(d);
      setNeedPassword(false);
      setSelected(new Set(Array.from({ length: d.numPages }, (_, i) => i + 1)));
    } catch (e) {
      if (e instanceof PdfPasswordError) setNeedPassword(e.wrong ? "wrong" : "ask");
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    reset();
    cancel.current = false;
    setFile(f);
    const buf = await f.arrayBuffer();
    setBuffer(buf);
    await load(buf);
  };

  const toggle = (n: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const info = FORMATS.find((f) => f.value === format)!;
  const list = [...selected].sort((a, b) => a - b);

  async function convert() {
    if (!doc || !file || !list.length) return;
    cancel.current = false;
    setResults([]);
    setProgress({ done: 0, total: list.length });
    const out: Result[] = [];
    const scale = Number(dpi) / 72;
    const pad = String(pages).length;
    try {
      for (const n of list) {
        if (cancel.current) break;
        const page = await doc.getPage(n);
        const canvas = await renderPage(page, scale);
        const blob = await canvasToBlob(canvas, info.mime, format === "png" ? undefined : 0.92);
        canvas.width = canvas.height = 0; // free memory early
        page.cleanup();
        out.push({
          page: n,
          name: `${baseName(file.name)}-page-${String(n).padStart(pad, "0")}.${info.ext}`,
          blob,
          url: URL.createObjectURL(blob),
        });
        setProgress({ done: out.length, total: list.length });
      }
      if (!cancel.current) {
        setResults(out);
        // One click from drop to file: download straight away.
        await downloadResults(out);
      }
    } catch (e) {
      setError((e as Error).message || "Something went wrong while rendering.");
    } finally {
      setProgress(null);
    }
  }

  async function downloadResults(rs: Result[]) {
    if (!rs.length || !file) return;
    if (rs.length === 1) return downloadBlob(rs[0]!.blob, rs[0]!.name);
    const zip = await zipBlobs(rs.map((r) => ({ name: r.name, blob: r.blob })));
    downloadBlob(zip, `${baseName(file.name)}-images.zip`);
  }

  if (!file) {
    return <Dropzone onFiles={onFiles} accept="application/pdf,.pdf" multiple={false} title="Drop a PDF here" hint="Every page becomes an image" />;
  }

  return (
    <div>
      {/* File bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-sunken px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon d={icons.file} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="font-mono text-xs text-subtle">
            {formatBytes(file.size)}
            {pages > 0 && ` · ${pages} ${pages === 1 ? "page" : "pages"}`}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
          Choose another
        </button>
      </div>

      {loading && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
          <Spinner /> Opening PDF…
        </p>
      )}

      {needPassword && buffer && (
        <form
          className="fade-up mx-auto mt-6 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void load(buffer, password);
          }}
        >
          <label className="field-label" htmlFor="pdf-pw">
            {needPassword === "wrong" ? "That password didn't work. Try again:" : "This PDF is protected. Enter its password:"}
          </label>
          <div className="flex gap-2">
            <input id="pdf-pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <button className="btn btn-primary" type="submit">Unlock</button>
          </div>
          <p className="mt-2 text-xs text-subtle">The password is used only in your browser.</p>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {doc && (
        <>
          {/* Settings + action */}
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="field-label">Format</p>
              <Segmented<Fmt> label="Image format" value={format} onChange={setFormat} options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} />
            </div>
            <div>
              <p className="field-label">Resolution</p>
              <Segmented<Dpi>
                label="Resolution"
                value={dpi}
                onChange={setDpi}
                options={[
                  { value: "72", label: "Screen" },
                  { value: "150", label: "Standard" },
                  { value: "300", label: "Print" },
                ]}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              {progress ? (
                <button type="button" className="btn" onClick={() => (cancel.current = true)}>
                  Cancel
                </button>
              ) : null}
              {results.length > 0 && !progress ? (
                <button type="button" className="btn btn-primary" onClick={() => void downloadResults(results)}>
                  <Icon d={icons.download} />
                  Download again
                </button>
              ) : (
                <button type="button" className="btn btn-primary" disabled={!list.length || !!progress} onClick={() => void convert()}>
                  {progress ? <Spinner /> : <Icon d={icons.download} />}
                  {progress
                    ? `Converting ${progress.done} / ${progress.total}`
                    : `Convert ${list.length === pages ? "all " : ""}${list.length} ${list.length === 1 ? "page" : "pages"}`}
                </button>
              )}
            </div>
          </div>

          {progress && (
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-hover" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
              <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          )}

          {/* Page selection */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {selected.size} of {pages} selected
              <span className="hidden sm:inline"> · click a page to include or skip it</span>
            </p>
            <div className="flex gap-1">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(Array.from({ length: pages }, (_, i) => i + 1)))}>
                All
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
                None
              </button>
            </div>
          </div>

          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => {
              const on = selected.has(n);
              const r = results.find((x) => x.page === n);
              return (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => toggle(n)}
                    aria-pressed={on}
                    aria-label={`Page ${n}${on ? ", selected" : ""}`}
                    className={`group relative block w-full rounded-xl border p-2 text-left transition-all ${
                      on ? "border-accent bg-accent-soft" : "border-line bg-sunken opacity-60 hover:opacity-100"
                    }`}
                  >
                    <PdfThumb doc={doc} pageNumber={n} width={150} />
                    <span className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-subtle">
                      <span>{n}</span>
                      <span
                        className={`grid size-4 place-items-center rounded border ${on ? "border-accent bg-accent text-accent-fg" : "border-line-strong"}`}
                        aria-hidden="true"
                      >
                        {on && <Icon d={icons.check} className="size-3" />}
                      </span>
                    </span>
                  </button>
                  {r && (
                    <button type="button" className="mt-1 w-full text-center text-xs text-accent hover:underline" onClick={() => downloadBlob(r.blob, r.name)}>
                      Save page {n}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
