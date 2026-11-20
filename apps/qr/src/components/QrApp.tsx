import { useMemo, useState, type ReactNode } from "react";
import { Icon, icons, Segmented, useCopy } from "@devsam/ui/react/ui";
import { downloadBlob } from "@devsam/ui/lib/files";
import { contrast, isInverted, payload, renderSvg, svgToPng, type DotStyle, type Ecc, type EyeStyle, type Fields, type Kind, type Style } from "../lib/qr";

const KINDS: { value: Kind; label: string }[] = [
  { value: "url", label: "Link" },
  { value: "text", label: "Text" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "contact", label: "Contact" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const PRESETS = ["#111111", "#1d4ed8", "#7c3aed", "#be185d", "#b45309", "#047857"];

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}

export default function QrApp({ defaultKind = "url" }: { defaultKind?: Kind }) {
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [fields, setFields] = useState<Fields>({ url: "", security: "WPA" });
  const [style, setStyle] = useState<Style>({
    fg: "#111111",
    bg: "#ffffff",
    transparent: false,
    dots: "square",
    eyes: "square",
    margin: 3,
    ecc: "M",
  });
  const [showStyle, setShowStyle] = useState(false);
  const [px, setPx] = useState(1024);
  const { copied, copy } = useCopy();

  const set = (k: string) => (e: { target: { value: string } }) => setFields((f) => ({ ...f, [k]: e.target.value }));
  const setS = <K extends keyof Style>(k: K, v: Style[K]) => setStyle((s) => ({ ...s, [k]: v }));

  const text = payload(kind, fields);
  const sample = "https://devsamc.xyz";
  const shown = text || sample;

  const result = useMemo(() => {
    try {
      // A logo covers modules, so it needs the strongest error correction.
      return { ...renderSvg(shown, { ...style, ecc: style.logo ? "H" : style.ecc }), error: "" };
    } catch {
      return { svg: "", modules: 0, error: "That's too much content for one QR code. Try shortening it." };
    }
  }, [shown, style]);

  // A data URL renders the same on the server and in the browser (blob URLs made while
  // prerendering don't exist in the visitor's browser).
  const svgUrl = useMemo(() => (result.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}` : ""), [result.svg]);

  const lowContrast = !style.transparent && contrast(style.fg, style.bg) < 3;
  const inverted = !style.transparent && isInverted(style.fg, style.bg);
  const fileBase = `qr-${kind}`;

  const onLogo = (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setS("logo", String(r.result));
    r.readAsDataURL(file);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
      {/* Content */}
      <div className="min-w-0">
        <div className="seg flex max-w-full overflow-x-auto" role="tablist" aria-label="QR code type">
          {KINDS.map((k) => (
            <button key={k.value} type="button" role="tab" aria-selected={kind === k.value} onClick={() => setKind(k.value)}>
              {k.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          {kind === "url" && (
            <Field label="Website or link">
              <input className="input" type="url" inputMode="url" placeholder="https://example.com" value={fields.url ?? ""} onChange={set("url")} autoFocus />
            </Field>
          )}
          {kind === "text" && (
            <Field label="Text">
              <textarea className="textarea min-h-32" placeholder="Any text, up to a few hundred characters" value={fields.text ?? ""} onChange={set("text")} />
            </Field>
          )}
          {kind === "wifi" && (
            <>
              <Field label="Network name (SSID)">
                <input className="input" value={fields.ssid ?? ""} onChange={set("ssid")} autoComplete="off" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Password">
                  <input className="input" value={fields.password ?? ""} onChange={set("password")} disabled={fields.security === "none"} autoComplete="off" />
                </Field>
                <Field label="Security">
                  <select className="select" value={fields.security ?? "WPA"} onChange={set("security")}>
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="none">None (open network)</option>
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={fields.hidden === "true"} onChange={(e) => setFields((f) => ({ ...f, hidden: String(e.target.checked) }))} />
                Hidden network
              </label>
            </>
          )}
          {kind === "contact" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name"><input className="input" value={fields.first ?? ""} onChange={set("first")} /></Field>
              <Field label="Last name"><input className="input" value={fields.last ?? ""} onChange={set("last")} /></Field>
              <Field label="Phone"><input className="input" type="tel" value={fields.phone ?? ""} onChange={set("phone")} /></Field>
              <Field label="Email"><input className="input" type="email" value={fields.email ?? ""} onChange={set("email")} /></Field>
              <Field label="Company"><input className="input" value={fields.org ?? ""} onChange={set("org")} /></Field>
              <Field label="Job title"><input className="input" value={fields.title ?? ""} onChange={set("title")} /></Field>
              <div className="sm:col-span-2">
                <Field label="Website"><input className="input" type="url" value={fields.website ?? ""} onChange={set("website")} /></Field>
              </div>
            </div>
          )}
          {kind === "whatsapp" && (
            <>
              <Field label="WhatsApp number" hint="Include the country code, e.g. +234 801 234 5678">
                <input className="input" type="tel" value={fields.phone ?? ""} onChange={set("phone")} />
              </Field>
              <Field label="Pre-filled message (optional)">
                <textarea className="textarea min-h-24" value={fields.message ?? ""} onChange={set("message")} />
              </Field>
            </>
          )}
          {kind === "email" && (
            <>
              <Field label="Email address"><input className="input" type="email" value={fields.to ?? ""} onChange={set("to")} /></Field>
              <Field label="Subject (optional)"><input className="input" value={fields.subject ?? ""} onChange={set("subject")} /></Field>
              <Field label="Message (optional)"><textarea className="textarea min-h-24" value={fields.body ?? ""} onChange={set("body")} /></Field>
            </>
          )}
          {kind === "sms" && (
            <>
              <Field label="Phone number"><input className="input" type="tel" value={fields.phone ?? ""} onChange={set("phone")} /></Field>
              <Field label="Message (optional)"><textarea className="textarea min-h-24" value={fields.message ?? ""} onChange={set("message")} /></Field>
            </>
          )}
        </div>

        {/* Style */}
        <button type="button" className="btn btn-ghost btn-sm mt-5 -ml-2" onClick={() => setShowStyle((v) => !v)} aria-expanded={showStyle}>
          Customise design
          <Icon d="m6 9 6 6 6-6" className={`size-3.5 transition-transform ${showStyle ? "rotate-180" : ""}`} />
        </button>
        {showStyle && (
          <div className="fade-up mt-3 grid gap-5 rounded-xl border border-line bg-sunken p-4 sm:grid-cols-2">
            <div>
              <p className="field-label">Colour</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`size-7 rounded-full border-2 ${style.fg === c ? "border-accent" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`Colour ${c}`}
                    onClick={() => setS("fg", c)}
                  />
                ))}
                <input type="color" value={style.fg} onChange={(e) => setS("fg", e.target.value)} aria-label="Custom colour" />
              </div>
            </div>
            <div>
              <p className="field-label">Background</p>
              <div className="flex items-center gap-3">
                <input type="color" value={style.bg} disabled={style.transparent} onChange={(e) => setS("bg", e.target.value)} aria-label="Background colour" />
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={style.transparent} onChange={(e) => setS("transparent", e.target.checked)} />
                  Transparent
                </label>
              </div>
            </div>
            <div>
              <p className="field-label">Pattern</p>
              <Segmented<DotStyle> label="Pattern" value={style.dots} onChange={(v) => setS("dots", v)} options={[{ value: "square", label: "Square" }, { value: "rounded", label: "Rounded" }, { value: "dots", label: "Dots" }]} />
            </div>
            <div>
              <p className="field-label">Corners</p>
              <Segmented<EyeStyle> label="Corners" value={style.eyes} onChange={(v) => setS("eyes", v)} options={[{ value: "square", label: "Square" }, { value: "rounded", label: "Rounded" }, { value: "circle", label: "Circle" }]} />
            </div>
            <div>
              <p className="field-label">Logo in the middle</p>
              {style.logo ? (
                <div className="flex items-center gap-3">
                  <img src={style.logo} alt="" className="size-10 rounded-md border border-line bg-white object-contain p-1" />
                  <button type="button" className="btn btn-sm" onClick={() => setS("logo", undefined)}>Remove</button>
                </div>
              ) : (
                <label className="btn btn-sm cursor-pointer">
                  <Icon d={icons.plus} /> Add logo
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
                </label>
              )}
            </div>
            <div>
              <p className="field-label">Error correction</p>
              <Segmented<Ecc>
                label="Error correction"
                value={style.logo ? "H" : style.ecc}
                onChange={(v) => setS("ecc", v)}
                options={[{ value: "L", label: "Low" }, { value: "M", label: "Medium" }, { value: "Q", label: "High" }, { value: "H", label: "Max" }]}
              />
              <p className="mt-1 text-xs text-subtle">{style.logo ? "Max is used automatically with a logo." : "Higher survives damage but makes a denser code."}</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="checker grid aspect-square place-items-center overflow-hidden rounded-2xl border border-line p-6">
          {result.error ? (
            <p className="text-center text-sm text-danger">{result.error}</p>
          ) : (
            <img src={svgUrl} alt="QR code preview" className={`h-full w-full object-contain transition-opacity ${text ? "" : "opacity-30"}`} style={{ imageRendering: "pixelated" }} />
          )}
        </div>
        <p className="mt-2 min-h-5 text-center text-xs text-subtle">
          {text ? `${result.modules}×${result.modules} modules · scan to test before printing` : "Fill in the details to create your code"}
        </p>
        {(lowContrast || inverted) && text && (
          <p className="mt-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {inverted ? "Light codes on dark backgrounds don't scan on many phones. Use a darker colour on a lighter background." : "Low contrast: this code may be hard to scan."}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!text || !!result.error}
            onClick={async () => downloadBlob(await svgToPng(result.svg, px), `${fileBase}.png`)}
          >
            <Icon d={icons.download} /> PNG
          </button>
          <button type="button" className="btn" disabled={!text || !!result.error} onClick={() => downloadBlob(new Blob([result.svg], { type: "image/svg+xml" }), `${fileBase}.svg`)}>
            <Icon d={icons.download} /> SVG
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <select className="select h-8 w-auto text-xs" value={px} onChange={(e) => setPx(Number(e.target.value))} aria-label="PNG size">
            {[512, 1024, 2048, 4096].map((s) => (
              <option key={s} value={s}>
                PNG {s}×{s}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" disabled={!text} onClick={() => void copy(text)}>
            <Icon d={copied ? icons.check : icons.copy} /> {copied ? "Copied" : "Copy content"}
          </button>
        </div>
      </aside>
    </div>
  );
}
