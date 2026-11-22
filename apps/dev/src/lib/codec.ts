// Pure helpers for the Dev Formatter. No network, no storage.

// ---------- JSON ----------

export type JsonError = { message: string; line: number; column: number; position: number };

function locate(text: string, position: number) {
  const before = text.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");
  return { line, column };
}

/**
 * A strict JSON scanner used only after JSON.parse fails, to find exactly where and why.
 * Browsers word (and sometimes omit) positions differently, so we don't rely on their messages.
 */
function findJsonError(text: string): { position: number; message: string } | null {
  let i = 0;
  const fail = (message: string, at = i): never => {
    throw { position: at, message };
  };
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i]!)) i++;
  };
  const describe = (c: string | undefined) => (c === undefined ? "the end of the input" : `'${c}'`);
  const value = (): void => {
    ws();
    const c = text[i];
    if (c === "{") return object();
    if (c === "[") return array();
    if (c === '"') return string();
    if (c === "-" || (c !== undefined && c >= "0" && c <= "9")) return number();
    for (const lit of ["true", "false", "null"]) if (text.startsWith(lit, i)) return void (i += lit.length);
    if (c === "'") fail("Strings must use double quotes, not single quotes");
    if (c === "}" || c === "]") fail(`Unexpected ${describe(c)}: a value is missing`);
    fail(`Unexpected ${describe(c)}: expected a value`);
  };
  const string = () => {
    i++;
    while (i < text.length) {
      const c = text[i]!;
      if (c === '"') return void i++;
      if (c === "\\") {
        const n = text[i + 1];
        if (n === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) fail("Invalid \\u escape: it needs four hex digits");
          i += 6;
          continue;
        }
        if (n === undefined || !'"\\/bfnrt'.includes(n)) fail(`Invalid escape sequence \\${n ?? ""}`);
        i += 2;
        continue;
      }
      if (c === "\n") fail("Strings can't contain a line break: use \\n instead");
      i++;
    }
    fail("This string is never closed: a closing \" is missing");
  };
  const number = () => {
    const m = text.slice(i).match(/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/);
    if (!m || !m[0] || m[0] === "-") fail("Invalid number");
    i += m![0].length;
  };
  const object = () => {
    i++;
    ws();
    if (text[i] === "}") return void i++;
    for (;;) {
      ws();
      if (text[i] === "}") fail("Trailing comma: remove the comma before '}'", i);
      if (text[i] !== '"') fail(text[i] === "'" ? "Keys must use double quotes, not single quotes" : `Expected a key in double quotes but found ${describe(text[i])}`);
      string();
      ws();
      if (text[i] !== ":") fail(`Expected ':' after the key but found ${describe(text[i])}`);
      i++;
      value();
      ws();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "}") return void i++;
      fail(text[i] === undefined ? "This object is never closed: a '}' is missing" : `Expected ',' or '}' but found ${describe(text[i])}. Is a comma missing?`);
    }
  };
  const array = () => {
    i++;
    ws();
    if (text[i] === "]") return void i++;
    for (;;) {
      ws();
      if (text[i] === "]") fail("Trailing comma: remove the comma before ']'", i);
      value();
      ws();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "]") return void i++;
      fail(text[i] === undefined ? "This array is never closed: a ']' is missing" : `Expected ',' or ']' but found ${describe(text[i])}. Is a comma missing?`);
    }
  };
  try {
    value();
    ws();
    if (i < text.length) fail(`Unexpected ${describe(text[i])} after the end of the JSON`);
    return null;
  } catch (e) {
    return e as { position: number; message: string };
  }
}

/** Parses JSON and turns errors into a friendly message with a line and column. */
export function parseJson(text: string): { value?: unknown; error?: JsonError } {
  if (!text.trim()) return { error: { message: "Paste some JSON to begin.", line: 0, column: 0, position: -1 } };
  try {
    return { value: JSON.parse(text) };
  } catch (e) {
    const found = findJsonError(text);
    if (found) {
      const { line, column } = locate(text, found.position);
      return { error: { message: found.message, line, column, position: found.position } };
    }
    const raw = (e as Error).message;
    let position = -1;
    const pos = raw.match(/position (\d+)/);
    const lc = raw.match(/line (\d+) column (\d+)/);
    if (pos) position = Number(pos[1]);
    let line = 0;
    let column = 0;
    if (lc) {
      line = Number(lc[1]);
      column = Number(lc[2]);
    } else if (position >= 0) {
      ({ line, column } = locate(text, position));
    } else if (/end of JSON input|Unterminated/i.test(raw)) {
      position = text.length;
      ({ line, column } = locate(text, position));
    }
    const message = raw
      .replace(/^JSON\.parse: /, "")
      .replace(/ in JSON at position \d+.*$/, "")
      .replace(/^SyntaxError: /, "");
    return { error: { message: message || "Invalid JSON", line, column, position } };
  }
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as object)
        .sort((a, b) => a.localeCompare(b))
        .map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function formatJson(value: unknown, indent: string | number, sort: boolean) {
  return JSON.stringify(sort ? sortDeep(value) : value, null, indent);
}

export function jsonStats(value: unknown) {
  let keys = 0;
  let depth = 0;
  const walk = (v: unknown, d: number) => {
    depth = Math.max(depth, d);
    if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1));
    else if (v && typeof v === "object") {
      for (const k of Object.keys(v)) {
        keys++;
        walk((v as Record<string, unknown>)[k], d + 1);
      }
    }
  };
  walk(value, 0);
  return { keys, depth };
}

// ---------- Base64 ----------

export function base64Encode(text: string, urlSafe: boolean) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes, urlSafe);
}

export function bytesToBase64(bytes: Uint8Array, urlSafe = false) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  const b64 = btoa(bin);
  return urlSafe ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}

export function base64ToBytes(input: string): Uint8Array {
  let s = input.trim().replace(/^data:[^,]*,/, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (/[^A-Za-z0-9+/=]/.test(s)) throw new Error("This isn't valid Base64: it contains characters Base64 doesn't use.");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Decodes to text if the bytes are valid UTF-8, otherwise reports binary. */
export function base64Decode(input: string): { text?: string; bytes: Uint8Array; binary: boolean } {
  const bytes = base64ToBytes(input);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Lots of control characters means it's probably binary data.
    const ctrl = (text.match(/[\u0000-\u0008\u000E-\u001F]/g) ?? []).length;
    if (ctrl > Math.max(2, text.length * 0.02)) return { bytes, binary: true };
    return { text, bytes, binary: false };
  } catch {
    return { bytes, binary: true };
  }
}

/** Guesses a file type from the first bytes, for naming decoded downloads. */
export function sniffBytes(b: Uint8Array): { ext: string; mime: string } {
  const h = (n: number) => Array.from(b.subarray(0, n)).map((x) => x.toString(16).padStart(2, "0")).join("");
  if (h(8) === "89504e470d0a1a0a") return { ext: "png", mime: "image/png" };
  if (h(3) === "ffd8ff") return { ext: "jpg", mime: "image/jpeg" };
  if (h(4) === "47494638") return { ext: "gif", mime: "image/gif" };
  if (h(4) === "25504446") return { ext: "pdf", mime: "application/pdf" };
  if (h(4) === "504b0304") return { ext: "zip", mime: "application/zip" };
  if (h(4) === "52494646" && h(12).endsWith("57454250")) return { ext: "webp", mime: "image/webp" };
  return { ext: "bin", mime: "application/octet-stream" };
}

// ---------- URL ----------

export function urlEncode(text: string, mode: "component" | "full") {
  return mode === "component" ? encodeURIComponent(text) : encodeURI(text);
}

export function urlDecode(text: string) {
  try {
    return decodeURIComponent(text.replace(/\+/g, " "));
  } catch {
    throw new Error("This text has a broken percent-encoding, such as a % that isn't followed by two hex digits.");
  }
}

export function parseUrl(text: string) {
  try {
    const u = new URL(text.trim());
    return {
      protocol: u.protocol.replace(/:$/, ""),
      host: u.hostname,
      port: u.port,
      path: decodeURIComponent(u.pathname),
      hash: u.hash ? decodeURIComponent(u.hash.slice(1)) : "",
      params: [...u.searchParams.entries()],
    };
  } catch {
    return null;
  }
}

// ---------- JWT ----------

export type DecodedJwt = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  times: { label: string; key: string; date: Date }[];
  expired: boolean | null;
};

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().replace(/^Bearer\s+/i, "").split(".");
  if (parts.length < 2) throw new Error("A JWT has three parts separated by dots: header.payload.signature.");
  const part = (s: string, name: string) => {
    try {
      return JSON.parse(new TextDecoder().decode(base64ToBytes(s))) as Record<string, unknown>;
    } catch {
      throw new Error(`The ${name} isn't valid Base64URL-encoded JSON.`);
    }
  };
  const header = part(parts[0]!, "header");
  const payload = part(parts[1]!, "payload");
  const times = (
    [
      ["Issued", "iat"],
      ["Not before", "nbf"],
      ["Expires", "exp"],
    ] as const
  )
    .filter(([, k]) => typeof payload[k] === "number")
    .map(([label, key]) => ({ label, key, date: new Date((payload[key] as number) * 1000) }));
  const exp = typeof payload.exp === "number" ? payload.exp * 1000 : null;
  return { header, payload, signature: parts[2] ?? "", times, expired: exp === null ? null : exp < Date.now() };
}

export function relativeTime(d: Date) {
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [86_400_000 * 365, "year"],
    [86_400_000 * 30, "month"],
    [86_400_000, "day"],
    [3_600_000, "hour"],
    [60_000, "minute"],
    [1000, "second"],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [ms, unit] of units) if (abs >= ms || unit === "second") return rtf.format(Math.round(diff / ms), unit);
  return "";
}
