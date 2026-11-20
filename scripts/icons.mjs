// Generates PNG/ICO favicons for every tool from the same design as favicon.svg:
//   apps/<slug>/public/favicon.ico          16, 32 and 48 px (what crawlers request by default)
//   apps/<slug>/public/favicon-96x96.png    Google prefers multiples of 48 px
//   apps/<slug>/public/apple-touch-icon.png 180 px for iOS home screens
// Usage: node scripts/icons.mjs   (run locally; uses your system's monospace font)
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const src = await readFile("packages/ui/src/tools.ts", "utf8");
const tools = [...src.matchAll(/slug: "([^"]+)",[\s\S]*?hue: (\d+),\s*glyph: "([^"]+)"/g)].map(([, slug, hue, glyph]) => ({ slug, hue: Number(hue), glyph }));
if (!tools.length) throw new Error("No tools found in tools.ts");

function oklch(l, c, h) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr), b = c * Math.sin(hr);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return "#" + [4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S, -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S]
    .map((v) => { const x = Math.min(1, Math.max(0, v)); return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055) * 255).toString(16).padStart(2, "0"); })
    .join("");
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Same artwork as packages/ui/src/endpoints/favicon.ts. `square` fills the corners for iOS. */
function svg(t, square = false) {
  const bg = oklch(0.2, 0.025, t.hue);
  const fg = oklch(0.8, 0.15, t.hue);
  const size = t.glyph.length > 2 ? 20 : 26;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${square ? 0 : 14}" fill="${bg}"/>${square ? "" : `<rect x="1.5" y="1.5" width="61" height="61" rx="12.5" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="2"/>`}<text x="32" y="41" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="${size}" font-weight="700" fill="${fg}">${esc(t.glyph)}</text></svg>`;
}

export async function png(svgText, px) {
  return sharp(Buffer.from(svgText), { density: Math.max(72, (72 * px) / 64) }).resize(px, px).png({ compressionLevel: 9 }).toBuffer();
}

/** ICO container holding PNG images. */
export function ico(pngs) {
  const header = 6 + 16 * pngs.length;
  const out = Buffer.alloc(header + pngs.reduce((n, p) => n + p.data.length, 0));
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(pngs.length, 4);
  let offset = header;
  pngs.forEach((p, i) => {
    const e = 6 + i * 16;
    out.writeUInt8(p.size >= 256 ? 0 : p.size, e);
    out.writeUInt8(p.size >= 256 ? 0 : p.size, e + 1);
    out.writeUInt16LE(1, e + 4);
    out.writeUInt16LE(32, e + 6);
    out.writeUInt32LE(p.data.length, e + 8);
    out.writeUInt32LE(offset, e + 12);
    p.data.copy(out, offset);
    offset += p.data.length;
  });
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("icons.mjs")) {
  for (const t of tools) {
    const art = svg(t);
    const dir = `apps/${t.slug}/public`;
    const sizes = [16, 32, 48];
    await writeFile(`${dir}/favicon.ico`, ico(await Promise.all(sizes.map(async (s) => ({ size: s, data: await png(art, s) })))));
    await writeFile(`${dir}/favicon-96x96.png`, await png(art, 96));
    await writeFile(`${dir}/apple-touch-icon.png`, await png(svg(t, true), 180));
    console.log("icons for", t.slug);
  }
}
