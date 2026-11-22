// Scaffolds the shared files for a tool app.
// Usage: node scripts/new-app.mjs <slug>
// The slug must already exist in packages/ui/src/tools.ts.
// Existing files are never overwritten.
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/new-app.mjs <slug>");
  process.exit(1);
}
const root = join("apps", slug);

const files = {
  "package.json": JSON.stringify(
    {
      name: `@devsam/${slug}`,
      private: true,
      type: "module",
      scripts: {
        dev: "astro dev",
        build: "astro check && astro build && node ../../scripts/check-assets.mjs dist",
        preview: "astro preview",
        check: "astro check",
      },
      dependencies: { "@devsam/ui": "*" },
    },
    null,
    2,
  ) + "\n",
  "astro.config.mjs": `import { toolConfig } from "@devsam/ui/astro-config.ts";\n\nexport default toolConfig("${slug}");\n`,
  "tsconfig.json": JSON.stringify(
    {
      extends: "astro/tsconfigs/strict",
      include: [".astro/types.d.ts", "**/*"],
      exclude: ["dist"],
      compilerOptions: { jsx: "react-jsx", jsxImportSource: "react" },
    },
    null,
    2,
  ) + "\n",
  "src/pages/privacy.astro": `---\nimport PrivacyPage from "@devsam/ui/components/PrivacyPage.astro";\n---\n\n<PrivacyPage slug="${slug}" />\n`,
  "src/pages/favicon.svg.ts": `import { faviconRoute } from "@devsam/ui/endpoints/favicon.ts";\n\nexport const GET = faviconRoute("${slug}");\n`,
  "src/pages/404.astro": `---
import NotFoundPage from "@devsam/ui/components/NotFoundPage.astro";
---

<NotFoundPage slug="${slug}" />
`,
  "wrangler.jsonc": `// Static assets Worker. Deploy settings: README.md
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "devsam-${slug}",
  "compatibility_date": "2026-11-01",
  "assets": {
    "directory": "./dist",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  },
  "routes": [{ "pattern": "${slug}.devsamc.xyz", "custom_domain": true }]
}
`,
  "src/pages/ads.txt.ts": `export { GET } from "@devsam/ui/endpoints/ads-txt.ts";\n`,
  "public/robots.txt": `User-agent: *\nAllow: /\n\nSitemap: https://${slug}.devsamc.xyz/sitemap.xml\n`,
  "public/_headers": `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
};

for (const [rel, content] of Object.entries(files)) {
  const path = join(root, rel);
  try {
    await access(path);
    console.log("skip  ", path);
    continue;
  } catch {}
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  console.log("create", path);
}
