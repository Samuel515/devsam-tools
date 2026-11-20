// SEO sanity check over every built page: unique titles, descriptions and H1s,
// sensible lengths, one H1, a canonical and the page in its sitemap.
// Usage: npm run build && node scripts/seo-check.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
const pages = [];

for (const app of readdirSync("apps")) {
  const dist = join("apps", app, "dist");
  if (!existsSync(dist)) continue;
  const sitemap = existsSync(join(dist, "sitemap.xml")) ? readFileSync(join(dist, "sitemap.xml"), "utf8") : "";
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "index.html") {
        const html = readFileSync(p, "utf8");
        const url = "/" + p.slice(dist.length + 1).replace(/\\/g, "/").replace(/index\.html$/, "");
        pages.push({
          app,
          url,
          title: strip(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
          description: html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "",
          h1s: [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => strip(m[1])),
          canonical: html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? "",
          noindex: /<meta name="robots" content="noindex"/.test(html),
          inSitemap: sitemap.includes(`${url}</loc>`),
          words: strip(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")).split(/\s+/).length,
        });
      }
    }
  };
  walk(dist);
}

const problems = [];
const dupes = (key) => {
  const seen = new Map();
  for (const p of pages.filter((x) => !x.noindex)) {
    const k = key(p);
    if (!k) continue;
    seen.set(k, [...(seen.get(k) ?? []), `${p.app}${p.url}`]);
  }
  return [...seen].filter(([, v]) => v.length > 1);
};
for (const [k, v] of dupes((p) => p.title)) problems.push(`duplicate title "${k}": ${v.join(", ")}`);
for (const [k, v] of dupes((p) => p.description)) problems.push(`duplicate description: ${v.join(", ")}`);
for (const [k, v] of dupes((p) => `${p.app}|${p.h1s[0]}`)) problems.push(`duplicate H1 "${k.split("|")[1]}": ${v.join(", ")}`);
for (const p of pages) {
  const id = `${p.app}${p.url}`;
  if (p.noindex) continue;
  if (p.h1s.length !== 1) problems.push(`${id}: ${p.h1s.length} H1s`);
  if (p.title.length > 70) problems.push(`${id}: title ${p.title.length} chars`);
  if (p.description.length < 70 || p.description.length > 170) problems.push(`${id}: description ${p.description.length} chars`);
  if (!p.canonical.endsWith(p.url)) problems.push(`${id}: canonical ${p.canonical}`);
  if (!p.inSitemap) problems.push(`${id}: missing from sitemap`);
}

const indexable = pages.filter((p) => !p.noindex);
console.log(`${indexable.length} indexable pages across ${new Set(pages.map((p) => p.app)).size} tools`);
console.log(`words per page: min ${Math.min(...indexable.map((p) => p.words))}, median ${indexable.map((p) => p.words).sort((a, b) => a - b)[Math.floor(indexable.length / 2)]}`);
console.log(problems.length ? `${problems.length} problems:\n  ` + problems.join("\n  ") : "no problems found");
process.exit(problems.length ? 1 : 0);
