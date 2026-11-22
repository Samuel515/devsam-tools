// Generates the 1200x630 social share card for every tool: apps/<slug>/public/og.png
// Usage: node scripts/og.mjs
// Reads names, taglines and hues from packages/ui/src/tools.ts.
import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const src = await readFile("packages/ui/src/tools.ts", "utf8");
const tools = [...src.matchAll(/slug: "([^"]+)",\s*name: "([^"]+)",\s*short: "[^"]*",\s*tagline: "([^"]+)",\s*hue: (\d+),\s*glyph: "([^"]+)"/g)].map(
  ([, slug, name, tagline, hue, glyph]) => ({ slug, name, tagline, hue: Number(hue), glyph }),
);
if (!tools.length) throw new Error("No tools found in tools.ts");

// OKLCH -> hex (same maths as packages/ui/src/lib/color.ts).
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

/** Splits a tagline into at most two lines of ~38 characters. */
function wrap(text, max = 38) {
  const words = text.split(" ");
  const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + w).trim().length > max && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = (cur + " " + w).trim();
  }
  return lines;
}

for (const t of tools) {
  const bg = oklch(0.16, 0.012, t.hue);
  const accent = oklch(0.8, 0.15, t.hue);
  const lines = wrap(t.tagline);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#fff" stroke-opacity="0.05"/></pattern>
    <radialGradient id="glow" cx="0.85" cy="0" r="0.85"><stop offset="0" stop-color="${accent}" stop-opacity="0.25"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${bg}"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="80" y="80" width="96" height="96" rx="24" fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/>
  <text x="128" y="${t.glyph.length > 2 ? 140 : 143}" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="${t.glyph.length > 2 ? 30 : 38}" font-weight="700" fill="${accent}">${esc(t.glyph)}</text>
  <text x="80" y="320" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="84" font-weight="700" letter-spacing="-2" fill="#f3f5f4">${esc(t.name)}</text>
  ${lines.map((l, i) => `<text x="80" y="${392 + i * 52}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="40" fill="#aab3ae">${esc(l)}</text>`).join("\n  ")}
  <circle cx="88" cy="540" r="7" fill="${accent}"/>
  <text x="108" y="549" font-family="Consolas, Menlo, monospace" font-size="26" fill="#8a948f">${t.slug}.devsamc.xyz · free · private · no uploads</text>
</svg>`;
  await mkdir(`apps/${t.slug}/public`, { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`apps/${t.slug}/public/og.png`);
  console.log("wrote", `apps/${t.slug}/public/og.png`);
}
