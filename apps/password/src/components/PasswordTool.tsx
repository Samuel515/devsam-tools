import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, icons, Segmented, useCopy } from "@devsam/ui/react/ui";
import { WORDS } from "../data/words";
import { crackTime, estimate, passphrase, password, passwordEntropy, phraseEntropy, strength, type PhraseOptions, type PwOptions } from "../lib/gen";

type Mode = "password" | "phrase";

function Meter({ bits }: { bits: number }) {
  const s = strength(bits);
  const color = s.tone === "danger" ? "bg-danger" : s.tone === "warn" ? "bg-amber-500" : "bg-success";
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-hover">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${s.pct}%` }} />
      </div>
      <p className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
        <span className={s.tone === "danger" ? "text-danger" : s.tone === "warn" ? "text-amber-500" : "text-success"}>{s.label}</span>
        <span className="text-subtle">
          {Math.round(bits)} bits · cracked {crackTime(bits)}
        </span>
      </p>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function PasswordTool({ defaultMode = "password" }: { defaultMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [pw, setPw] = useState<PwOptions>({ length: 20, lower: true, upper: true, digits: true, symbols: true, avoidAmbiguous: false });
  const [ph, setPh] = useState<PhraseOptions>({ words: 6, separator: "-", capitalize: true, number: true });
  const [value, setValue] = useState("");
  const [batch, setBatch] = useState<string[]>([]);
  const [check, setCheck] = useState("");
  const [show, setShow] = useState(false);
  const { copied, copy } = useCopy();

  const make = useCallback(() => (mode === "password" ? password(pw) : passphrase(WORDS, ph)), [mode, pw, ph]);

  // Generate on load and whenever settings change. Never during prerendering.
  useEffect(() => {
    setValue(make());
    setBatch([]);
  }, [make]);

  const bits = mode === "password" ? passwordEntropy(pw) : phraseEntropy(WORDS.length, ph);
  const checkBits = useMemo(() => estimate(check), [check]);

  return (
    <div>
      <Segmented<Mode> label="Type" value={mode} onChange={setMode} options={[{ value: "password", label: "Password" }, { value: "phrase", label: "Passphrase" }]} />

      {/* Result */}
      <div className="mt-5 rounded-2xl border border-line bg-sunken p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <output className="min-w-0 flex-1 font-mono text-lg break-all sm:text-2xl" aria-live="polite" aria-label="Generated password">
            {value || " "}
          </output>
          <button type="button" className="btn btn-ghost btn-icon shrink-0" onClick={() => setValue(make())} aria-label="Generate another" title="Generate another">
            <Icon d={icons.rotate} />
          </button>
          <button type="button" className="btn btn-primary shrink-0" onClick={() => void copy(value)} disabled={!value}>
            <Icon d={copied ? icons.check : icons.copy} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-4">
          <Meter bits={bits} />
        </div>
      </div>

      {/* Options */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {mode === "password" ? (
          <>
            <div>
              <label className="field-label" htmlFor="len">
                Length <span className="font-mono text-fg">{pw.length}</span>
              </label>
              <input id="len" type="range" min={8} max={64} value={pw.length} onChange={(e) => setPw({ ...pw, length: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Check label="a–z" checked={pw.lower} onChange={(v) => setPw({ ...pw, lower: v })} />
              <Check label="A–Z" checked={pw.upper} onChange={(v) => setPw({ ...pw, upper: v })} />
              <Check label="0–9" checked={pw.digits} onChange={(v) => setPw({ ...pw, digits: v })} />
              <Check label="!@#$" checked={pw.symbols} onChange={(v) => setPw({ ...pw, symbols: v })} />
              <div className="col-span-2">
                <Check label="Avoid look-alikes (I l 1 O 0)" checked={pw.avoidAmbiguous} onChange={(v) => setPw({ ...pw, avoidAmbiguous: v })} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="field-label" htmlFor="words">
                Words <span className="font-mono text-fg">{ph.words}</span>
              </label>
              <input id="words" type="range" min={3} max={10} value={ph.words} onChange={(e) => setPh({ ...ph, words: Number(e.target.value) })} />
              <p className="mt-1 text-xs text-subtle">Easy to type and remember, hard to guess.</p>
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm">
                Separator
                <select className="select h-8 w-24" value={ph.separator} onChange={(e) => setPh({ ...ph, separator: e.target.value })}>
                  <option value="-">- dash</option>
                  <option value=" ">space</option>
                  <option value=".">. dot</option>
                  <option value="_">_ underscore</option>
                  <option value="">none</option>
                </select>
              </label>
              <Check label="Capitalise words" checked={ph.capitalize} onChange={(v) => setPh({ ...ph, capitalize: v })} />
              <Check label="Add a number" checked={ph.number} onChange={(v) => setPh({ ...ph, number: v })} />
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setBatch(Array.from({ length: 10 }, make))}>
          Generate 10
        </button>
        {batch.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy(batch.join("\n"))}>
            <Icon d={icons.copy} /> Copy all
          </button>
        )}
      </div>
      {batch.length > 0 && (
        <ul className="fade-up mt-3 divide-y divide-line rounded-xl border border-line font-mono text-sm">
          {batch.map((b, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 break-all">{b}</span>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => void copy(b)} aria-label="Copy">
                <Icon d={icons.copy} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Checker */}
      <div className="mt-8 border-t border-line pt-6">
        <p className="font-medium">How strong is my password?</p>
        <p className="mt-1 text-sm text-muted">Type a password to estimate its strength. It never leaves this page.</p>
        <div className="mt-3 flex gap-2">
          <input
            className="input font-mono"
            type={show ? "text" : "password"}
            value={check}
            onChange={(e) => setCheck(e.target.value)}
            placeholder="Type a password to test"
            autoComplete="off"
            spellCheck={false}
            aria-label="Password to check"
          />
          <button type="button" className="btn btn-icon" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
            <Icon d={icons.eye} />
          </button>
        </div>
        {check && (
          <div className="mt-3">
            <Meter bits={checkBits} />
          </div>
        )}
      </div>
    </div>
  );
}
