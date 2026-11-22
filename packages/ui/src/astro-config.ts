// Shared Astro config for every tool app: `export default toolConfig("md")`.
import { defineConfig, type AstroUserConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { sitemapXml } from "./sitemap-xml";
import { toolUrl, type ToolSlug } from "./tools";

export function toolConfig(slug: ToolSlug, extra: AstroUserConfig = {}) {
  return defineConfig({
    site: toolUrl(slug),
    integrations: [react(), sitemap({ lastmod: new Date() }), sitemapXml()],
    build: { inlineStylesheets: "always" },
    ...extra,
    vite: {
      ...extra.vite,
      plugins: [tailwindcss(), ...((extra.vite?.plugins as never[]) ?? [])],
      worker: { format: "es", ...extra.vite?.worker },
      build: { chunkSizeWarningLimit: 4000, ...extra.vite?.build },
    },
  });
}
