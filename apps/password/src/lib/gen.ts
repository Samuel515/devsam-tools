// Password generation with the browser's cryptographic random number generator.
// Rejection sampling keeps every character equally likely (no modulo bias).

export function randomInt(max: number): number {
  if (max <= 0) throw new Error("max must be positive");
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/~",
};
const AMBIGUOUS = /[Il1O0o|`'"]/g;

export type PwOptions = { length: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean; avoidAmbiguous: boolean };

export function pools(o: PwOptions) {
  const chosen = (["lower", "upper", "digits", "symbols"] as const).filter((k) => o[k]).map((k) => (o.avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]));
  return chosen.length ? chosen : [SETS.lower];
}

/** Guarantees at least one character from each chosen set, then shuffles. */
export function password(o: PwOptions): string {
  const ps = pools(o);
  const all = ps.join("");
  const chars = ps.map((p) => p[randomInt(p.length)]!);
  while (chars.length < o.length) chars.push(all[randomInt(all.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.slice(0, o.length).join("");
}

export const passwordEntropy = (o: PwOptions) => o.length * Math.log2(pools(o).join("").length);

export type PhraseOptions = { words: number; separator: string; capitalize: boolean; number: boolean };

export function passphrase(list: string[], o: PhraseOptions): string {
  const ws = Array.from({ length: o.words }, () => {
    const w = list[randomInt(list.length)]!;
    return o.capitalize ? w[0]!.toUpperCase() + w.slice(1) : w;
  });
  if (o.number) {
    const i = randomInt(ws.length);
    ws[i] = ws[i] + String(randomInt(10));
  }
  return ws.join(o.separator);
}

export const phraseEntropy = (listSize: number, o: PhraseOptions) => o.words * Math.log2(listSize) + (o.number ? Math.log2(10) + Math.log2(o.words) : 0);

/**
 * Rough strength estimate for a typed password: character-pool entropy, reduced for
 * repeats, sequences and very common passwords. It's a guide, not a guarantee.
 */
const COMMON = new Set(
  "password 123456 123456789 12345678 12345 qwerty abc123 111111 1234567 password1 iloveyou admin welcome monkey dragon letmein football 123123 000000 qwerty123 1q2w3e4r sunshine princess master baseball shadow superman trustno1".split(
    " ",
  ),
);

export function estimate(pw: string): number {
  if (!pw) return 0;
  if (COMMON.has(pw.toLowerCase())) return 4;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;
  let bits = pw.length * Math.log2(Math.max(pool, 2));
  // Penalise repeated characters and simple sequences like "abcd" or "4321".
  let penalty = 0;
  for (let i = 1; i < pw.length; i++) {
    const a = pw.charCodeAt(i - 1);
    const b = pw.charCodeAt(i);
    if (a === b || Math.abs(a - b) === 1) penalty += Math.log2(Math.max(pool, 2)) * 0.75;
  }
  if (/^[A-Z]?[a-z]+\d{0,4}[!@#$]?$/.test(pw)) bits *= 0.6; // word + digits pattern
  bits -= penalty;
  return Math.max(1, bits);
}

export function strength(bits: number) {
  if (bits < 36) return { label: "Weak", tone: "danger" as const, pct: 15 };
  if (bits < 60) return { label: "Fair", tone: "warn" as const, pct: 45 };
  if (bits < 80) return { label: "Strong", tone: "ok" as const, pct: 75 };
  return { label: "Very strong", tone: "ok" as const, pct: 100 };
}

/** Time to guess at 10 billion guesses per second (offline attack on a fast hash). */
export function crackTime(bits: number) {
  const seconds = 2 ** bits / 2 / 1e10;
  const units: [number, string][] = [
    [31_557_600 * 1e9, "billion years"],
    [31_557_600 * 1e6, "million years"],
    [31_557_600 * 1e3, "thousand years"],
    [31_557_600, "years"],
    [86_400, "days"],
    [3600, "hours"],
    [60, "minutes"],
    [1, "seconds"],
  ];
  if (seconds < 1) return "instantly";
  if (seconds > 31_557_600 * 1e12) return "longer than the age of the universe";
  for (const [s, name] of units) if (seconds >= s) return `about ${Math.round(seconds / s).toLocaleString()} ${name}`;
  return "instantly";
}
