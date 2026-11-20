import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon, icons, Segmented, useCopy, useStored } from "@devsam/ui/react/ui";
import { downloadBlob, formatBytes } from "@devsam/ui/lib/files";
import {
  base64Decode,
  base64Encode,
  bytesToBase64,
  decodeJwt,
  formatJson,
  jsonStats,
  parseJson,
  parseUrl,
  relativeTime,
  sniffBytes,
  urlDecode,
  urlEncode,
} from "../lib/codec";

export type Mode = "json" | "base64" | "url" | "jwt";

export const MODES: { value: Mode; label: string; href: string }[] = [
  { value: "json", label: "JSON", href: "/" },
  { value: "base64", label: "Base64", href: "/base64/" },
  { value: "url", label: "URL encode", href: "/url-encode/" },
  { value: "jwt", label: "JWT", href: "/jwt-decoder/" },
];

// ---------- Shared editor panes ----------

function Pane({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{title}</p>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <textarea
      className="textarea h-[52vh] min-h-72 resize-none font-mono text-[13px] leading-relaxed"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      aria-label={label}
    />
  );
}

function Output({ value, label, error }: { value: string; label: string; error?: boolean }) {
  return (
    <textarea
      className={`textarea h-[52vh] min-h-72 resize-none font-mono text-[13px] leading-relaxed ${error ? "text-danger" : ""}`}
      value={value}
      readOnly
      spellCheck={false}
      aria-label={label}
    />
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button type="button" className="btn btn-ghost btn-sm" disabled={!text} onClick={() => void copy(text)}>
      <Icon d={copied ? icons.check : icons.copy} /> {copied ? "Copied" : label}
    </button>
  );
}

function ClearButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onClick} disabled={disabled}>
      Clear
    </button>
  );
}

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p className={`mt-3 flex items-center gap-2 text-sm ${ok ? "text-success" : "text-danger"}`} role="status">
      <span className={`size-2 rounded-full ${ok ? "bg-success" : "bg-danger"}`} />
      {children}
    </p>
  );
}

// ---------- JSON ----------

const JSON_SAMPLE = `{"name":"devsam tools","free":true,"tools":["json","base64","url","jwt"],"version":1.2,"author":{"name":"Samuel Ogbodo","site":"https://devsamc.xyz"}}`;

function JsonTool() {
  const [input, setInput] = useStored("dev:json", "");
  const [indent, setIndent] = useState<"2" | "4" | "tab" | "min">("2");
  const [sort, setSort] = useState(false);
  const parsed = useMemo(() => parseJson(input), [input]);
  const output = useMemo(() => {
    if (parsed.error) return "";
    return indent === "min" ? formatJson(parsed.value, 0, sort) : formatJson(parsed.value, indent === "tab" ? "\t" : Number(indent), sort);
  }, [parsed, indent, sort]);
  const stats = useMemo(() => (parsed.error ? null : jsonStats(parsed.value)), [parsed]);
  const empty = !input.trim();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Indentation"
          value={indent}
          onChange={setIndent}
          options={[
            { value: "2", label: "2 spaces" },
            { value: "4", label: "4 spaces" },
            { value: "tab", label: "Tabs" },
            { value: "min", label: "Minify" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />
          Sort keys
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Pane
          title="Input"
          actions={
            <>
              {empty && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInput(JSON_SAMPLE)}>
                  Try an example
                </button>
              )}
              <ClearButton onClick={() => setInput("")} disabled={empty} />
            </>
          }
        >
          <Input value={input} onChange={setInput} placeholder="Paste JSON here" label="JSON input" />
        </Pane>
        <Pane
          title="Output"
          actions={
            <>
              <CopyButton text={output} />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!output}
                onClick={() => downloadBlob(new Blob([output], { type: "application/json" }), "formatted.json")}
              >
                <Icon d={icons.download} /> Save
              </button>
            </>
          }
        >
          <Output
            value={parsed.error && !empty ? `${parsed.error.message}${parsed.error.line ? `\n\nLine ${parsed.error.line}, column ${parsed.error.column}` : ""}` : output}
            label="Formatted JSON"
            error={!!parsed.error && !empty}
          />
        </Pane>
      </div>
      {!empty &&
        (parsed.error ? (
          <Status ok={false}>
            Invalid JSON{parsed.error.line ? ` at line ${parsed.error.line}, column ${parsed.error.column}` : ""}: {parsed.error.message}
          </Status>
        ) : (
          <Status ok>
            Valid JSON · {stats!.keys.toLocaleString()} keys · depth {stats!.depth} · {formatBytes(new Blob([output]).size)}
          </Status>
        ))}
    </div>
  );
}

// ---------- Base64 ----------

function Base64Tool() {
  const [dir, setDir] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useStored("dev:b64", "");
  const [urlSafe, setUrlSafe] = useState(false);
  const [fileOut, setFileOut] = useState<{ name: string; b64: string; size: number } | null>(null);

  const result = useMemo(() => {
    if (!input) return { text: "", error: "", binary: null as Uint8Array | null };
    try {
      if (dir === "encode") return { text: base64Encode(input, urlSafe), error: "", binary: null };
      const d = base64Decode(input);
      return d.binary ? { text: "", error: "", binary: d.bytes } : { text: d.text!, error: "", binary: null };
    } catch (e) {
      return { text: "", error: (e as Error).message, binary: null };
    }
  }, [input, dir, urlSafe]);

  const onFile = async (f?: File) => {
    if (!f) return;
    const b64 = bytesToBase64(new Uint8Array(await f.arrayBuffer()), urlSafe);
    setFileOut({ name: f.name, b64: `data:${f.type || "application/octet-stream"};base64,${b64}`, size: f.size });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Direction" value={dir} onChange={(v) => { setDir(v); setFileOut(null); }} options={[{ value: "encode", label: "Encode" }, { value: "decode", label: "Decode" }]} />
        {dir === "encode" && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
            URL-safe
          </label>
        )}
        {dir === "encode" && (
          <label className="btn btn-sm ml-auto cursor-pointer">
            <Icon d={icons.file} /> Encode a file
            <input type="file" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        )}
      </div>

      {fileOut ? (
        <div className="fade-up">
          <Pane
            title={`${fileOut.name} · ${formatBytes(fileOut.size)} → ${formatBytes(fileOut.b64.length)} as a data URL`}
            actions={
              <>
                <CopyButton text={fileOut.b64} label="Copy data URL" />
                <CopyButton text={fileOut.b64.replace(/^data:[^,]*,/, "")} label="Copy Base64" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFileOut(null)}>
                  Close
                </button>
              </>
            }
          >
            <Output value={fileOut.b64.length > 400_000 ? `${fileOut.b64.slice(0, 400_000)}\n\n… (preview shortened; use Copy for the full value)` : fileOut.b64} label="Base64 output" />
          </Pane>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Pane title={dir === "encode" ? "Text" : "Base64"} actions={<ClearButton onClick={() => setInput("")} disabled={!input} />}>
            <Input value={input} onChange={setInput} placeholder={dir === "encode" ? "Type or paste text to encode" : "Paste Base64 or a data: URL to decode"} label="Input" />
          </Pane>
          <Pane
            title={dir === "encode" ? "Base64" : "Decoded"}
            actions={
              result.binary ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const t = sniffBytes(result.binary!);
                    downloadBlob(new Blob([result.binary! as BlobPart], { type: t.mime }), `decoded.${t.ext}`);
                  }}
                >
                  <Icon d={icons.download} /> Download file
                </button>
              ) : (
                <CopyButton text={result.text} />
              )
            }
          >
            <Output
              value={result.error || (result.binary ? `This decodes to binary data (${formatBytes(result.binary.length)}, looks like .${sniffBytes(result.binary).ext}).\n\nUse Download file to save it.` : result.text)}
              label="Output"
              error={!!result.error}
            />
          </Pane>
        </div>
      )}
    </div>
  );
}

// ---------- URL ----------

function UrlTool() {
  const [dir, setDir] = useState<"encode" | "decode">("encode");
  const [scope, setScope] = useState<"component" | "full">("component");
  const [input, setInput] = useStored("dev:url", "");
  const out = useMemo(() => {
    if (!input) return { text: "", error: "" };
    try {
      return { text: dir === "encode" ? urlEncode(input, scope) : urlDecode(input), error: "" };
    } catch (e) {
      return { text: "", error: (e as Error).message };
    }
  }, [input, dir, scope]);
  const parsed = useMemo(() => parseUrl(dir === "decode" ? out.text || input : input), [input, out.text, dir]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Direction" value={dir} onChange={setDir} options={[{ value: "encode", label: "Encode" }, { value: "decode", label: "Decode" }]} />
        {dir === "encode" && (
          <Segmented
            label="What to encode"
            value={scope}
            onChange={setScope}
            options={[
              { value: "component", label: "Query value" },
              { value: "full", label: "Whole URL" },
            ]}
          />
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Pane title="Input" actions={<ClearButton onClick={() => setInput("")} disabled={!input} />}>
          <Input value={input} onChange={setInput} placeholder={dir === "encode" ? "Text or URL to encode" : "Encoded text, like hello%20world"} label="Input" />
        </Pane>
        <Pane title="Output" actions={<CopyButton text={out.text} />}>
          <Output value={out.error || out.text} label="Output" error={!!out.error} />
        </Pane>
      </div>
      {parsed && (
        <div className="fade-up mt-6">
          <p className="label mb-3">URL breakdown</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {[
                  ["Protocol", parsed.protocol],
                  ["Host", parsed.host],
                  ["Port", parsed.port],
                  ["Path", parsed.path],
                  ["Fragment", parsed.hash],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k}>
                      <th className="w-32 bg-sunken px-3 py-2 font-medium text-muted">{k}</th>
                      <td className="px-3 py-2 font-mono text-[13px] break-all">{v}</td>
                    </tr>
                  ))}
                {parsed.params.map(([k, v], i) => (
                  <tr key={`${k}-${i}`}>
                    <th className="w-32 bg-sunken px-3 py-2 font-mono text-[13px] font-normal text-accent">?{k}</th>
                    <td className="px-3 py-2 font-mono text-[13px] break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- JWT ----------

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <Pane title={title} actions={<CopyButton text={text} />}>
      <pre className="max-h-[40vh] overflow-auto rounded-[0.65rem] border border-line bg-sunken p-3 font-mono text-[13px] leading-relaxed">{text}</pre>
    </Pane>
  );
}

function JwtTool() {
  // Tokens are credentials: never persist them.
  const [token, setToken] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const result = useMemo(() => {
    if (!token.trim()) return null;
    try {
      return { jwt: decodeJwt(token), error: "" };
    } catch (e) {
      return { jwt: null, error: (e as Error).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, now]);

  return (
    <div>
      <Pane title="Token" actions={<ClearButton onClick={() => setToken("")} disabled={!token} />}>
        <textarea
          className="textarea h-32 resize-none font-mono text-[13px] break-all"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste a JWT: eyJhbGciOi…"
          spellCheck={false}
          aria-label="JWT"
        />
      </Pane>
      {result?.error && <Status ok={false}>{result.error}</Status>}
      {result?.jwt && (
        <div className="fade-up mt-5">
          <div className="flex flex-wrap gap-2">
            {result.jwt.expired === true && <span className="pill border-danger/50 text-danger">Expired</span>}
            {result.jwt.expired === false && <span className="pill border-success/50 text-success">Not expired</span>}
            {typeof result.jwt.header.alg === "string" && <span className="pill">alg: {result.jwt.header.alg}</span>}
            {result.jwt.times.map((t) => (
              <span key={t.key} className="pill" title={t.date.toISOString()}>
                {t.label}: {t.date.toLocaleString()} ({relativeTime(t.date)})
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
            <JsonBlock title="Header" value={result.jwt.header} />
            <JsonBlock title="Payload" value={result.jwt.payload} />
          </div>
          <p className="mt-4 text-xs text-subtle">
            The signature isn't verified: that needs the secret or public key, which should never be pasted into a website. Decoding happens only in your browser.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Shell ----------

export default function DevTools({ mode }: { mode: Mode }) {
  return (
    <div>
      <nav className="seg mb-5 flex w-full overflow-x-auto sm:inline-flex sm:w-auto" aria-label="Developer tools">
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
      {mode === "json" && <JsonTool />}
      {mode === "base64" && <Base64Tool />}
      {mode === "url" && <UrlTool />}
      {mode === "jwt" && <JwtTool />}
    </div>
  );
}
