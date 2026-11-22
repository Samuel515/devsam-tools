// Builds a tool's SVG favicon from its glyph and accent hue.
// In an app: `export const GET = faviconRoute("md");` at src/pages/favicon.svg.ts
import { getTool, type ToolSlug } from "../tools";
import { oklchToHex } from "../lib/color";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function faviconRoute(slug: ToolSlug) {
  return () => {
    const t = getTool(slug);
    const bg = oklchToHex(0.2, 0.025, t.hue);
    const fg = oklchToHex(0.8, 0.15, t.hue);
    const size = t.glyph.length > 2 ? 20 : 26;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><rect x="1.5" y="1.5" width="61" height="61" rx="12.5" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="2"/><text x="32" y="41" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="${size}" font-weight="700" fill="${fg}">${esc(t.glyph)}</text></svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  };
}
