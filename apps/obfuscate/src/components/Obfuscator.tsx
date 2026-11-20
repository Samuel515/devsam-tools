import { useRef, useState } from "react";
import { Icon, icons, Segmented, Spinner, useCopy } from "@devsam/ui/react/ui";
import { downloadBlob, formatBytes } from "@devsam/ui/lib/files";
import type { Job, Level, Options, Result } from "../lib/obfuscate.worker";

const SAMPLE = `// Paste the JavaScript you want to protect
function checkLicense(key) {
  const valid = ["DEVSAM-2026-PRO", "DEVSAM-2026-TEAM"];
  return valid.includes(key.trim().toUpperCase());
}

if (checkLicense("devsam-2026-pro")) {
  console.log("Thanks for buying a license!");
}
`;

const LEVELS: { value: Level; label: string; note: string }[] = [
  { value: "low", label: "Low", note: "Renames variables and functions. Strings stay readable. Fast, with almost no effect on speed." },
  { value: "medium", label: "Medium", note: "Also hides strings and scrambles the logic. Good protection, about 1.5× slower." },
  { value: "high", label: "High", note: "Maximum protection with encrypted strings. Output is much larger and can be 2–3× slower." },
];

let worker: Worker | null = null;
let seq = 0;
function run(code: string, options: Options): Promise<Result> {
  if (!worker) worker = new Worker(new URL("../lib/obfuscate.worker.ts", import.meta.url), { type: "module" });
  const id = ++seq;
  return new Promise((resolve) => {
    const onMsg = (e: MessageEvent<Result>) => {
      if (e.data.id !== id) return;
      worker!.removeEventListener("message", onMsg);
      resolve(e.data);
    };
    worker!.addEventListener("message", onMsg);
    worker!.postMessage({ id, code, options } satisfies Job);
  });
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex gap-3 rounded-lg p-2 hover:bg-hover">
      <input type="checkbox" className="mt-0.5 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-subtle">{hint}</span>
      </span>
    </label>
  );
}

export default function Obfuscator() {
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [opts, setOpts] = useState<Options>({
    level: "medium",
    selfDefending: false,
    disableConsole: false,
    debugProtection: false,
    domainLock: "",
    renameGlobals: false,
  });
  const [showMore, setShowMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ output: string; error: string; ms?: number }>({ output: "", error: "" });
  const stale = useRef(false);
  const { copied, copy } = useCopy();

  const set = <K extends keyof Options>(k: K, v: Options[K]) => {
    stale.current = true;
    setOpts((o) => ({ ...o, [k]: v }));
  };

  const go = async () => {
    if (!code.trim()) return;
    setBusy(true);
    stale.current = false;
    const r = await run(code, opts);
    setOut({ output: r.output ?? "", error: r.error ?? "", ms: r.ms });
    setBusy(false);
  };

  const openFile = async (f?: File) => {
    if (!f) return;
    setFileName(f.name);
    setCode(await f.text());
    setOut({ output: "", error: "" });
  };

  const before = new Blob([code]).size;
  const after = new Blob([out.output]).size;
  const outName = fileName ? fileName.replace(/(\.[^.]+)?$/, ".obfuscated.js") : "obfuscated.js";

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void openFile(e.dataTransfer.files[0]);
      }}
    >
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div>
          <p className="field-label">Protection</p>
          <Segmented<Level> label="Protection level" value={opts.level} onChange={(v) => set("level", v)} options={LEVELS.map((l) => ({ value: l.value, label: l.label }))} />
        </div>
        <p className="max-w-sm pb-1 text-xs text-subtle">{LEVELS.find((l) => l.value === opts.level)!.note}</p>
        <div className="ml-auto flex items-center gap-2">
          <label className="btn btn-sm cursor-pointer">
            <Icon d={icons.file} /> Open .js
            <input type="file" accept=".js,.mjs,.cjs,text/javascript" className="sr-only" onChange={(e) => void openFile(e.target.files?.[0])} />
          </label>
          <button type="button" className="btn btn-primary" disabled={!code.trim() || busy} onClick={() => void go()}>
            {busy ? <Spinner /> : <Icon d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />}
            {busy ? "Obfuscating…" : "Obfuscate"}
          </button>
        </div>
      </div>

      <button type="button" className="btn btn-ghost btn-sm mt-3 -ml-2" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
        More protection
        <Icon d="m6 9 6 6 6-6" className={`size-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
      </button>
      {showMore && (
        <div className="fade-up mt-2 grid gap-1 rounded-xl border border-line bg-sunken p-2 sm:grid-cols-2">
          <Toggle label="Self-defending" hint="The code stops working if someone reformats it to read it." checked={opts.selfDefending} onChange={(v) => set("selfDefending", v)} />
          <Toggle label="Disable console" hint="Blocks console.log and friends, so the code reveals less while running." checked={opts.disableConsole} onChange={(v) => set("disableConsole", v)} />
          <Toggle label="Debugger protection" hint="Makes the browser's developer tools freeze while stepping through the code." checked={opts.debugProtection} onChange={(v) => set("debugProtection", v)} />
          <Toggle label="Rename globals" hint="Also renames top-level names. Don't use this if other scripts call your functions by name." checked={opts.renameGlobals} onChange={(v) => set("renameGlobals", v)} />
          <div className="p-2 sm:col-span-2">
            <label className="field-label" htmlFor="domains">Only run on these domains (optional)</label>
            <input
              id="domains"
              className="input font-mono"
              placeholder="example.com, .example.org"
              value={opts.domainLock}
              onChange={(e) => set("domainLock", e.target.value)}
            />
            <p className="mt-1 text-xs text-subtle">Copied to another site, the code won't run. Start with a dot to include subdomains.</p>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <div className="mb-2 flex min-h-8 items-center justify-between">
            <p className="text-sm font-medium text-muted">{fileName || "Your JavaScript"}</p>
            <div className="flex gap-1">
              {!code && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCode(SAMPLE)}>
                  Try an example
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" disabled={!code} onClick={() => { setCode(""); setFileName(""); setOut({ output: "", error: "" }); }}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            className="textarea h-[52vh] min-h-72 resize-none font-mono text-[13px] leading-relaxed"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              stale.current = true;
            }}
            placeholder="Paste JavaScript here, or drop a .js file"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="JavaScript input"
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="mb-2 flex min-h-8 items-center justify-between">
            <p className="text-sm font-medium text-muted">Obfuscated</p>
            <div className="flex gap-1">
              <button type="button" className="btn btn-ghost btn-sm" disabled={!out.output} onClick={() => void copy(out.output)}>
                <Icon d={copied ? icons.check : icons.copy} /> {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="btn btn-sm" disabled={!out.output} onClick={() => downloadBlob(new Blob([out.output], { type: "text/javascript" }), outName)}>
                <Icon d={icons.download} /> Download
              </button>
            </div>
          </div>
          <textarea
            className={`textarea h-[52vh] min-h-72 resize-none font-mono text-[12px] leading-relaxed break-all ${out.error ? "text-danger" : ""}`}
            value={out.error || out.output}
            placeholder="Click Obfuscate to protect your code"
            readOnly
            aria-label="Obfuscated output"
          />
        </div>
      </div>

      {out.output && !out.error && (
        <p className="fade-up mt-3 font-mono text-xs text-subtle">
          {formatBytes(before)} → {formatBytes(after)} · done in {out.ms} ms
          {stale.current && " · settings or code changed, click Obfuscate again"}
        </p>
      )}
      {out.error && (
        <p className="mt-3 text-sm text-danger" role="status">
          Couldn't obfuscate: check your JavaScript for syntax errors.
        </p>
      )}
    </div>
  );
}
