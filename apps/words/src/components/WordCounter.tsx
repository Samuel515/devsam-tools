import { useDeferredValue, useMemo, useState } from "react";
import { Icon, icons, useCopy, useStored } from "@devsam/ui/react/ui";
import { analyse, changeCase, formatDuration, keywords, LIMITS, type Case } from "../lib/count";

export default function WordCounter() {
  const [text, setText] = useStored("words:text", "");
  const [skipCommon, setSkipCommon] = useState(true);
  const deferred = useDeferredValue(text);
  const s = useMemo(() => analyse(deferred), [deferred]);
  const kw = useMemo(() => keywords(deferred, skipCommon), [deferred, skipCommon]);
  const { copied, copy } = useCopy();

  const big = [
    { label: "Words", value: s.words.toLocaleString() },
    { label: "Characters", value: s.chars.toLocaleString() },
    { label: "Sentences", value: s.sentences.toLocaleString() },
    { label: "Paragraphs", value: s.paragraphs.toLocaleString() },
  ];
  const small = [
    { label: "Characters without spaces", value: s.noSpaces.toLocaleString() },
    { label: "Reading time", value: formatDuration(s.readMin) },
    { label: "Speaking time", value: formatDuration(s.speakMin) },
    { label: "Average word length", value: s.avgWord ? `${s.avgWord.toFixed(1)} letters` : "–" },
    { label: "Average sentence", value: s.avgSentence ? `${s.avgSentence.toFixed(1)} words` : "–" },
    { label: "Lines", value: s.lines.toLocaleString() },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        {big.map((b) => (
          <div key={b.label} className="bg-bg px-4 py-3">
            <p className="label">{b.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{b.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {(
              [
                ["upper", "UPPERCASE"],
                ["lower", "lowercase"],
                ["title", "Title Case"],
                ["sentence", "Sentence case"],
              ] as [Case, string][]
            ).map(([c, label]) => (
              <button key={c} type="button" className="btn btn-ghost btn-sm" disabled={!text} onClick={() => setText(changeCase(text, c))}>
                {label}
              </button>
            ))}
            <span className="ml-auto flex gap-1">
              <button type="button" className="btn btn-ghost btn-sm" disabled={!text} onClick={() => void copy(text)}>
                <Icon d={copied ? icons.check : icons.copy} /> {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!text} onClick={() => setText("")}>
                Clear
              </button>
            </span>
          </div>
          <textarea
            className="textarea h-[50vh] min-h-72 resize-y text-[15px] leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here…"
            aria-label="Text to count"
            autoFocus
          />
          <p className="mt-2 text-xs text-subtle">Saved automatically in this browser. Nothing is sent anywhere.</p>
        </div>

        <aside className="space-y-6">
          <dl className="divide-y divide-line rounded-xl border border-line">
            {small.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <dt className="text-muted">{r.label}</dt>
                <dd className="font-medium tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="label mb-3">Limits</p>
            <ul className="space-y-2.5">
              {LIMITS.map((l) => {
                const pct = Math.min(100, (s.chars / l.max) * 100);
                const over = s.chars > l.max;
                return (
                  <li key={l.label}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">{l.label}</span>
                      <span className={`tabular-nums ${over ? "font-medium text-danger" : "text-subtle"}`}>
                        {s.chars.toLocaleString()} / {l.max.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-hover">
                      <div className={`h-full transition-[width] ${over ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="label">Top words</p>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" checked={skipCommon} onChange={(e) => setSkipCommon(e.target.checked)} /> Skip common words
              </label>
            </div>
            {kw.length ? (
              <ol className="space-y-1.5">
                {kw.map((k) => (
                  <li key={k.word} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{k.word}</span>
                    <span className="font-mono text-xs text-subtle tabular-nums">
                      {k.count} · {k.pct.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-subtle">Your most-used words will appear here.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
