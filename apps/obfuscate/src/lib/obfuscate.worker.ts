// Runs javascript-obfuscator off the main thread: high settings on big files can take seconds.
// The library's browser build is a classic (non-module) script that relies on sloppy-mode globals,
// so it's served as a plain asset and evaluated as a script rather than bundled as a module.
import bundleUrl from "javascript-obfuscator/dist/index.browser.js?url";

type Api = typeof import("javascript-obfuscator");
let api: Api | null = null;
async function loadApi(): Promise<Api> {
  if (api) return api;
  const src = await (await fetch(bundleUrl)).text();
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(src).call(self);
  api = (self as unknown as { JavaScriptObfuscator: Api }).JavaScriptObfuscator;
  if (!api) throw new Error("The obfuscator failed to load. Please reload the page.");
  return api;
}
export type Level = "low" | "medium" | "high";

export type Options = {
  level: Level;
  selfDefending: boolean;
  disableConsole: boolean;
  debugProtection: boolean;
  /** Comma-separated domains the code is allowed to run on. Empty = any. */
  domainLock: string;
  /** Rename top-level functions and variables too (breaks code that others call by name). */
  renameGlobals: boolean;
};

export type Job = { id: number; code: string; options: Options };
export type Result = { id: number; output?: string; error?: string; ms?: number };

const PRESET: Record<Level, string> = {
  low: "low-obfuscation",
  medium: "medium-obfuscation",
  high: "high-obfuscation",
};

self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, code, options: o } = e.data;
  const t0 = performance.now();
  try {
    const JavaScriptObfuscator = await loadApi();
    const domains = o.domainLock
      .split(/[\s,]+/)
      .map((d) => d.trim())
      .filter(Boolean);
    const result = JavaScriptObfuscator.obfuscate(code, {
      optionsPreset: PRESET[o.level] as "default",
      selfDefending: o.selfDefending,
      disableConsoleOutput: o.disableConsole,
      debugProtection: o.debugProtection,
      domainLock: domains,
      renameGlobals: o.renameGlobals,
      // Keep output deterministic within a session but different from other people's.
      seed: Math.floor(Math.random() * 1e9),
      sourceMap: false,
    });
    (self as unknown as Worker).postMessage({ id, output: result.getObfuscatedCode(), ms: Math.round(performance.now() - t0) });
  } catch (err) {
    const msg = (err as Error).message || "Couldn't obfuscate this code.";
    (self as unknown as Worker).postMessage({ id, error: msg.replace(/^Error: /, "") });
  }
};
