import { useEffect, useRef, useState } from "react";
import { Icon, icons, Spinner, useCopy } from "@devsam/ui/react/ui";
import { downloadBlob, formatBytes } from "@devsam/ui/lib/files";
import type { CssOptions, HtmlOptions, JsOptions, Job, Lang, Result } from "../lib/minify.worker";

export const LANGS: { value: Lang; label: string; href: string; ext: string; mime: string; accept: string }[] = [
  { value: "js", label: "JavaScript", href: "/", ext: "js", mime: "text/javascript", accept: ".js,.mjs,.cjs,.jsx,text/javascript" },
  { value: "css", label: "CSS", href: "/css-minifier/", ext: "css", mime: "text/css", accept: ".css,text/css" },
  { value: "html", label: "HTML", href: "/html-minifier/", ext: "html", mime: "text/html", accept: ".html,.htm,text/html" },
  { value: "json", label: "JSON", href: "/json-minifier/", ext: "json", mime: "application/json", accept: ".json,application/json" },
];

const SAMPLES: Record<Lang, string> = {
  js: `// Paste your JavaScript here
function greet(name) {
  const message = "Hello, " + name + "!";
  console.log(message);
  return message;
}

export const total = [1, 2, 3].map((n) => n * 2).reduce((a, b) => a + b, 0);
greet("world");
`,
  css: `/* Paste your CSS here */
.button {
  display: inline-flex;
  padding: 12px 16px;
  color: #ffffff;
  background-color: #1d4ed8;
  border-radius: 8px;
}

.button:hover {
  background-color: #1e40af;
}
`,
  html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Paste your HTML here -->
    <title>Hello</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; }
    </style>
  </head>
  <body>
    <h1 class="title">Hello, world</h1>
    <button disabled="disabled">Click me</button>
  </body>
</html>
`,
  json: `{
  "name": "devsam tools",
  "free": true,
  "tools": ["minify", "obfuscate"]
}
`,
};

async function gzipSize(text: string): Promise<number | null> {
  if (typeof CompressionStream === "undefined" || !text) return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

let worker: Worker | null = null;
let seq = 0;
function runJob(job: Omit<Job, "id">): Promise<Result> {
  if (!worker) worker = new Worker(new URL("../lib/minify.worker.ts", import.meta.url), { type: "module" });
  const id = ++seq;
  return new Promise((resolve) => {
    const onMsg = (e: MessageEvent<Result>) => {
      if (e.data.id !== id) return;
      worker!.removeEventListener("message", onMsg);
      resolve(e.data);
    };
    worker!.addEventListener("message", onMsg);
    worker!.postMessage({ ...job, id });
  });
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted" title={hint}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function Minifier({ lang }: { lang: Lang }) {
  const info = LANGS.find((l) => l.value === lang)!;
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [js, setJs] = useState<JsOptions>({ mangle: true, dropConsole: false, keepLicense: true, module: true });
  const [css, setCss] = useState<CssOptions>({ restructure: true, keepLicense: true });
  const [html, setHtml] = useState<HtmlOptions>({ minifyInline: true, removeComments: true, collapseBooleans: true });
  const [out, setOut] = useState<{ output: string; error: string; line?: number; column?: number }>({ output: "", error: "" });
  const [gz, setGz] = useState<{ before: number | null; after: number | null }>({ before: null, after: null });
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);
  const { copied, copy } = useCopy();

  // Minify as you type, debounced; ignore results from older runs.
  useEffect(() => {
    if (!code.trim()) {
      setOut({ output: "", error: "" });
      setGz({ before: null, after: null });
      return;
    }
    const n = ++latest.current;
    const t = setTimeout(async () => {
      setBusy(true);
      const r = await runJob({ lang, code, js, css, html });
      if (n !== latest.current) return;
      setOut({ output: r.output ?? "", error: r.error ?? "", line: r.line, column: r.column });
      setBusy(false);
      if (r.output) setGz({ before: await gzipSize(code), after: await gzipSize(r.output) });
    }, code.length > 200_000 ? 600 : 250);
    return () => clearTimeout(t);
  }, [code, lang, js, css, html]);

  const openFile = async (f?: File) => {
    if (!f) return;
    setFileName(f.name);
    setCode(await f.text());
  };

  const before = new Blob([code]).size;
  const after = new Blob([out.output]).size;
  const saved = before > 0 && out.output ? Math.round((1 - after / before) * 100) : 0;
  const outName = fileName ? fileName.replace(/(\.[^.]+)?$/, `.min.${info.ext}`) : `minified.min.${info.ext}`;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void openFile(e.dataTransfer.files[0]);
      }}
    >
      <nav className="seg mb-5 flex w-full overflow-x-auto sm:inline-flex sm:w-auto" aria-label="Language">
        {LANGS.map((l) => (
          <a
            key={l.value}
            href={l.href}
            aria-current={l.value === lang ? "page" : undefined}
            className={`flex h-8 flex-1 items-center justify-center rounded-[0.55rem] px-3 text-[0.8125rem] whitespace-nowrap transition-colors sm:flex-none ${
              l.value === lang ? "bg-elev text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {l.label}
          </a>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {lang === "js" && (
          <>
            <Toggle label="Shorten names" checked={js.mangle} onChange={(v) => setJs({ ...js, mangle: v })} hint="Rename local variables to short names" />
            <Toggle label="Remove console.*" checked={js.dropConsole} onChange={(v) => setJs({ ...js, dropConsole: v })} />
            <Toggle label="ES module" checked={js.module} onChange={(v) => setJs({ ...js, module: v })} hint="Allows import/export and top-level optimisations" />
            <Toggle label="Keep license comments" checked={js.keepLicense} onChange={(v) => setJs({ ...js, keepLicense: v })} />
          </>
        )}
        {lang === "css" && (
          <>
            <Toggle label="Merge rules" checked={css.restructure} onChange={(v) => setCss({ ...css, restructure: v })} hint="Combine duplicate selectors and declarations" />
            <Toggle label="Keep /*! license */ comments" checked={css.keepLicense} onChange={(v) => setCss({ ...css, keepLicense: v })} />
          </>
        )}
        {lang === "html" && (
          <>
            <Toggle label="Minify inline CSS and JS" checked={html.minifyInline} onChange={(v) => setHtml({ ...html, minifyInline: v })} />
            <Toggle label="Remove comments" checked={html.removeComments} onChange={(v) => setHtml({ ...html, removeComments: v })} />
            <Toggle label="Shorten boolean attributes" checked={html.collapseBooleans} onChange={(v) => setHtml({ ...html, collapseBooleans: v })} />
          </>
        )}
        <label className="btn btn-sm ml-auto cursor-pointer">
          <Icon d={icons.file} /> Open file
          <input type="file" accept={info.accept} className="sr-only" onChange={(e) => void openFile(e.target.files?.[0])} />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <div className="mb-2 flex min-h-8 items-center justify-between">
            <p className="text-sm font-medium text-muted">{fileName || `Your ${info.label}`}</p>
            <div className="flex gap-1">
              {!code && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCode(SAMPLES[lang])}>
                  Try an example
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" disabled={!code} onClick={() => { setCode(""); setFileName(""); }}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            className="textarea h-[52vh] min-h-72 resize-none font-mono text-[13px] leading-relaxed"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`Paste ${info.label} here, or drop a .${info.ext} file`}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={`${info.label} input`}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="mb-2 flex min-h-8 items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-muted">
              Minified {busy && <Spinner className="size-3.5" />}
            </p>
            <div className="flex gap-1">
              <button type="button" className="btn btn-ghost btn-sm" disabled={!out.output} onClick={() => void copy(out.output)}>
                <Icon d={copied ? icons.check : icons.copy} /> {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!out.output} onClick={() => downloadBlob(new Blob([out.output], { type: info.mime }), outName)}>
                <Icon d={icons.download} /> Download
              </button>
            </div>
          </div>
          <textarea
            className={`textarea h-[52vh] min-h-72 resize-none font-mono text-[13px] leading-relaxed break-all ${out.error ? "text-danger" : ""}`}
            value={out.error ? `${out.error}${out.line ? `\n\nLine ${out.line}${out.column !== undefined ? `, column ${out.column + (lang === "js" ? 1 : 0)}` : ""}` : ""}` : out.output}
            readOnly
            aria-label="Minified output"
          />
        </div>
      </div>

      {out.output && !out.error && (
        <div className="fade-up mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[
            { label: "Original", value: formatBytes(before) },
            { label: "Minified", value: formatBytes(after) },
            { label: "Saved", value: `${saved}%`, accent: true },
            { label: "Gzipped", value: gz.after !== null ? `${formatBytes(gz.before ?? 0)} → ${formatBytes(gz.after)}` : "–" },
          ].map((s) => (
            <div key={s.label} className="bg-bg px-4 py-3">
              <p className="label">{s.label}</p>
              <p className={`mt-1 text-lg font-semibold tracking-tight ${s.accent ? "text-accent" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {out.error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-danger" role="status">
          <span className="size-2 rounded-full bg-danger" /> Couldn't minify: there's a syntax error in your {info.label}.
        </p>
      )}
    </div>
  );
}
