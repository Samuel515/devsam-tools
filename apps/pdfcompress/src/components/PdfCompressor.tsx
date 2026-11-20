import { useState } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { Icon, icons, Spinner } from "@devsam/ui/react/ui";
import { baseName, downloadBlob, formatBytes } from "@devsam/ui/lib/files";
import { PdfPasswordError } from "@devsam/ui/lib/pdf";
import { compressPdf, LEVELS, type Level } from "../lib/compress";

type Result = { level: Level; gray: boolean; blob: Blob };

export default function PdfCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [buf, setBuf] = useState<ArrayBuffer | null>(null);
  const [level, setLevel] = useState<Level>("strong");
  const [gray, setGray] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);

  const reset = () => {
    setFile(null);
    setBuf(null);
    setResult(null);
    setError("");
    setNeedPassword(false);
    setPassword("");
  };

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    reset();
    setFile(f);
    setBuf(await f.arrayBuffer());
  };

  const run = async () => {
    if (!buf) return;
    setError("");
    setResult(null);
    setProgress({ done: 0, total: 1 });
    try {
      const bytes = await compressPdf(buf, level, { grayscale: gray, password: password || undefined }, (done, total) => setProgress({ done, total }));
      setResult({ level, gray, blob: new Blob([bytes as BlobPart], { type: "application/pdf" }) });
      setNeedPassword(false);
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        setNeedPassword(true);
        setError(e.wrong ? "That password is incorrect." : "");
      } else setError((e as Error).message || "This PDF couldn't be compressed.");
    } finally {
      setProgress(null);
    }
  };

  if (!file) {
    return <Dropzone onFiles={onFiles} accept="application/pdf,.pdf" multiple={false} title="Drop a PDF to compress" hint="Make it small enough for email and upload limits" />;
  }

  const fresh = result && result.level === level && result.gray === gray;
  const saved = fresh ? 1 - result!.blob.size / file.size : 0;
  const bigger = fresh && result!.blob.size >= file.size;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-sunken px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon d={icons.file} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="font-mono text-xs text-subtle">{formatBytes(file.size)}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
          Choose another
        </button>
      </div>

      <fieldset className="mt-5">
        <legend className="field-label">Compression</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(LEVELS) as Level[]).map((l) => (
            <label
              key={l}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${level === l ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong"}`}
            >
              <input type="radio" name="level" value={l} checked={level === l} onChange={() => setLevel(l)} className="sr-only" />
              <span className="flex items-center justify-between">
                <span className="font-medium">{LEVELS[l].label}</span>
                {l !== "basic" && <span className="font-mono text-[11px] text-subtle">{LEVELS[l].dpi} DPI</span>}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">{LEVELS[l].note}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className={`flex items-center gap-2 text-sm ${level === "basic" ? "text-subtle opacity-50" : "text-muted"}`}>
          <input type="checkbox" checked={gray} disabled={level === "basic"} onChange={(e) => setGray(e.target.checked)} />
          Black and white (even smaller)
        </label>
        {needPassword && (
          <input className="input w-56" type="password" placeholder="PDF password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="PDF password" autoFocus />
        )}
        <button type="button" className="btn btn-primary ml-auto" disabled={!!progress} onClick={() => void run()}>
          {progress ? <Spinner /> : <Icon d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />}
          {progress ? `Compressing ${progress.done} / ${progress.total}` : "Compress PDF"}
        </button>
      </div>

      {progress && progress.total > 1 && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-hover">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {needPassword && !error && <p className="mt-3 text-sm text-muted">This PDF is protected. Enter its password, then click Compress again.</p>}

      {fresh && (
        <div className="fade-up mt-6 rounded-xl border border-line bg-accent-soft p-5">
          {bigger ? (
            <p className="text-sm">
              <span className="font-medium">This PDF is already well compressed.</span>{" "}
              <span className="text-muted">
                That setting made it {formatBytes(result!.blob.size)}. Try {level === "basic" ? "Recommended" : level === "strong" ? "Smallest" : "Black and white"} for a smaller file.
              </span>
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <p className="label">Before</p>
                <p className="text-xl font-semibold tracking-tight">{formatBytes(file.size)}</p>
              </div>
              <Icon d={icons.right} className="size-5 text-subtle" />
              <div>
                <p className="label">After</p>
                <p className="text-xl font-semibold tracking-tight">{formatBytes(result!.blob.size)}</p>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-accent">−{Math.round(saved * 100)}%</p>
              <button type="button" className="btn btn-primary ml-auto" onClick={() => downloadBlob(result!.blob, `${baseName(file.name)}-compressed.pdf`)}>
                <Icon d={icons.download} /> Download
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
