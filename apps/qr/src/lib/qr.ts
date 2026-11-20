// QR payloads and styled SVG rendering.
import qrcode from "qrcode-generator";

// The library's default encoder drops non-Latin characters; use UTF-8.
(qrcode as unknown as { stringToBytes: (s: string) => number[] }).stringToBytes = (s: string) =>
  Array.from(new TextEncoder().encode(s));

export type Kind = "url" | "text" | "wifi" | "contact" | "email" | "sms" | "whatsapp";

export type Fields = Record<string, string>;

const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export function payload(kind: Kind, f: Fields): string {
  switch (kind) {
    case "url": {
      const u = (f.url ?? "").trim();
      if (!u) return "";
      return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`;
    }
    case "text":
      return f.text ?? "";
    case "wifi": {
      if (!f.ssid) return "";
      const type = f.security === "none" ? "nopass" : f.security || "WPA";
      return `WIFI:T:${type};S:${esc(f.ssid)};${type !== "nopass" && f.password ? `P:${esc(f.password)};` : ""}${f.hidden === "true" ? "H:true;" : ""};`;
    }
    case "contact": {
      if (!f.first && !f.last && !f.phone && !f.email) return "";
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${esc(f.last ?? "")};${esc(f.first ?? "")};;;`,
        `FN:${esc([f.first, f.last].filter(Boolean).join(" "))}`,
        f.org && `ORG:${esc(f.org)}`,
        f.title && `TITLE:${esc(f.title)}`,
        f.phone && `TEL;TYPE=CELL:${f.phone}`,
        f.email && `EMAIL:${f.email}`,
        f.website && `URL:${f.website}`,
        "END:VCARD",
      ];
      return lines.filter(Boolean).join("\n");
    }
    case "email": {
      if (!f.to) return "";
      const q = new URLSearchParams();
      if (f.subject) q.set("subject", f.subject);
      if (f.body) q.set("body", f.body);
      const qs = q.toString().replace(/\+/g, "%20");
      return `mailto:${f.to}${qs ? `?${qs}` : ""}`;
    }
    case "sms": {
      if (!f.phone) return "";
      return `SMSTO:${f.phone}:${f.message ?? ""}`;
    }
    case "whatsapp": {
      const digits = (f.phone ?? "").replace(/[^\d]/g, "");
      if (!digits) return "";
      return `https://wa.me/${digits}${f.message ? `?text=${encodeURIComponent(f.message)}` : ""}`;
    }
  }
}

export type Ecc = "L" | "M" | "Q" | "H";
export type DotStyle = "square" | "rounded" | "dots";
export type EyeStyle = "square" | "rounded" | "circle";

export type Style = {
  fg: string;
  bg: string;
  transparent: boolean;
  dots: DotStyle;
  eyes: EyeStyle;
  margin: number; // in modules
  ecc: Ecc;
  logo?: string; // data URL
};

export function matrix(text: string, ecc: Ecc) {
  const qr = qrcode(0, ecc);
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return { n, dark: (r: number, c: number) => qr.isDark(r, c) };
}

// Alignment pattern centres per QR version (ISO/IEC 18004, Annex E).
const ALIGN: number[][] = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]];

/** Cells that belong to alignment patterns, which scanners need drawn as solid squares. */
function alignmentCells(n: number) {
  const version = (n - 17) / 4;
  const centres = ALIGN[version] ?? [];
  const set = new Set<number>();
  for (const r of centres)
    for (const c of centres) {
      if ((r < 9 && c < 9) || (r < 9 && c > n - 10) || (r > n - 10 && c < 9)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set.add((r + dr) * n + (c + dc));
    }
  return set;
}

const inEye = (r: number, c: number, n: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

function eye(x: number, y: number, style: EyeStyle, fg: string, bg: string) {
  // Outer 7x7 ring, 5x5 gap, inner 3x3.
  if (style === "circle") {
    return `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3" fill="none" stroke="${fg}" stroke-width="1"/><circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${fg}"/>`;
  }
  const r1 = style === "rounded" ? 2 : 0;
  const r2 = style === "rounded" ? 1.2 : 0;
  const r3 = style === "rounded" ? 0.8 : 0;
  return `<rect x="${x}" y="${y}" width="7" height="7" rx="${r1}" fill="${fg}"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="${r2}" fill="${bg}"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${r3}" fill="${fg}"/>`;
}

/** Builds a complete SVG document for the QR code. */
export function renderSvg(text: string, s: Style): { svg: string; modules: number } {
  const { n, dark } = matrix(text, s.ecc);
  const m = s.margin;
  const size = n + m * 2;
  const bg = s.transparent ? "none" : s.bg;
  // Areas cut out of the eyes need a solid colour; with a transparent background use a mask instead.
  const gapFill = s.transparent ? "#000" : s.bg;

  // Logo: clear a centred square of about 22% of the code.
  const logoSize = s.logo ? Math.round(n * 0.22) | 1 : 0;
  const logoStart = Math.floor((n - logoSize) / 2);
  const inLogo = (r: number, c: number) =>
    !!s.logo && r >= logoStart - 1 && r < logoStart + logoSize + 1 && c >= logoStart - 1 && c < logoStart + logoSize + 1;

  let body = "";
  if (s.dots === "square") {
    // One path is far smaller than thousands of rects.
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!dark(r, c) || inEye(r, c, n) || inLogo(r, c)) continue;
        d += `M${c + m} ${r + m}h1v1h-1z`;
      }
    }
    body = `<path d="${d}" fill="${s.fg}" shape-rendering="crispEdges"/>`;
  } else {
    const align = alignmentCells(n);
    const parts: string[] = [];
    let solid = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!dark(r, c) || inEye(r, c, n) || inLogo(r, c)) continue;
        if (align.has(r * n + c)) solid += `M${c + m} ${r + m}h1v1h-1z`;
        else if (s.dots === "dots") parts.push(`<circle cx="${c + m + 0.5}" cy="${r + m + 0.5}" r="0.48"/>`);
        else parts.push(`<rect x="${c + m}" y="${r + m}" width="1" height="1" rx="0.3"/>`);
      }
    }
    body = `<g fill="${s.fg}">${parts.join("")}<path d="${solid}"/></g>`;
  }

  let eyes = eye(m, m, s.eyes, s.fg, gapFill) + eye(m + n - 7, m, s.eyes, s.fg, gapFill) + eye(m, m + n - 7, s.eyes, s.fg, gapFill);
  if (s.transparent && s.eyes !== "circle") {
    // Punch the gap out with a mask so the background shows through.
    eyes = `<mask id="eye-gap"><rect width="${size}" height="${size}" fill="#fff"/>${[
      [m, m],
      [m + n - 7, m],
      [m, m + n - 7],
    ]
      .map(([x, y]) => `<rect x="${x! + 1}" y="${y! + 1}" width="5" height="5" rx="${s.eyes === "rounded" ? 1.2 : 0}" fill="#000"/>`)
      .join("")}</mask><g mask="url(#eye-gap)">${eye(m, m, s.eyes, s.fg, s.fg) + eye(m + n - 7, m, s.eyes, s.fg, s.fg) + eye(m, m + n - 7, s.eyes, s.fg, s.fg)}</g>${[
      [m, m],
      [m + n - 7, m],
      [m, m + n - 7],
    ]
      .map(([x, y]) => `<rect x="${x! + 2}" y="${y! + 2}" width="3" height="3" rx="${s.eyes === "rounded" ? 0.8 : 0}" fill="${s.fg}"/>`)
      .join("")}`;
  }

  let logo = "";
  if (s.logo) {
    const x = logoStart + m;
    const pad = 0.6;
    logo = `${s.transparent ? "" : `<rect x="${x - pad}" y="${x - pad}" width="${logoSize + pad * 2}" height="${logoSize + pad * 2}" rx="1.2" fill="${s.bg}"/>`}<image href="${s.logo}" x="${x}" y="${x}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 10}" height="${size * 10}">${
    bg !== "none" ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ""
  }${body}${eyes}${logo}</svg>`;
  return { svg, modules: n };
}

/** Rasterises the SVG to a PNG of `px` pixels square. */
export async function svgToPng(svg: string, px: number): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Couldn't draw the QR code."));
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = c.height = px;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, px, px);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("PNG export failed."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Relative luminance contrast ratio between two hex colours. */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const v = hex.replace("#", "");
    const rgb = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

/** True when the foreground is lighter than the background: many scanners fail on inverted codes. */
export const isInverted = (fg: string, bg: string) => {
  const l = (h: string) => parseInt(h.slice(1, 3), 16) * 0.299 + parseInt(h.slice(3, 5), 16) * 0.587 + parseInt(h.slice(5, 7), 16) * 0.114;
  return l(fg) > l(bg);
};
