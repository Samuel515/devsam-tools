// Merges @astrojs/sitemap's shards into a single /sitemap.xml <urlset>.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

export function sitemapXml(): AstroIntegration {
  return {
    name: "sitemap-xml",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const shards = (await readdir(out)).filter((f) => /^sitemap-\d+\.xml$/.test(f)).sort();
        if (!shards.length) {
          logger.warn("No sitemap-N.xml files found; sitemap.xml not written.");
          return;
        }
        const urls: string[] = [];
        for (const f of shards) {
          const xml = await readFile(`${out}/${f}`, "utf8");
          urls.push(...(xml.match(/<url>[\s\S]*?<\/url>/g) ?? []));
        }
        const body =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls.map((u) => `  ${u}`).join("\n") +
          "\n</urlset>\n";
        await writeFile(`${out}/sitemap.xml`, body);
        logger.info(`sitemap.xml written with ${urls.length} URLs`);
      },
    },
  };
}
