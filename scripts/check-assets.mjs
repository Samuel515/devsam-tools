// Post-build guard for Cloudflare Workers, which reject any single asset over 25 MiB.
// Usage: node ../../scripts/check-assets.mjs <distDir> [--drop <regex> ...]
//
// --drop removes build files that are never loaded at runtime. The Background Remover
// uses it for ONNX Runtime's WebAssembly engine: Vite copies it into the build, but
// transformers.js loads it from the jsDelivr CDN (a pinned version) at runtime.
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

const LIMIT = 25 * 1024 * 1024;
const [dir, ...rest] = process.argv.slice(2);
if (!dir) {
  console.error("Usage: check-assets.mjs <distDir> [--drop <regex> ...]");
  process.exit(1);
}
const drops = [];
for (let i = 0; i < rest.length; i++) if (rest[i] === "--drop" && rest[i + 1]) drops.push(new RegExp(rest[++i]));

async function* walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const tooBig = [];
for await (const file of walk(dir)) {
  const name = file.replace(/\\/g, "/");
  if (drops.some((r) => r.test(name))) {
    await unlink(file);
    console.log("dropped", name);
    continue;
  }
  const { size } = await stat(file);
  if (size > LIMIT) tooBig.push(`${name} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
}

if (tooBig.length) {
  console.error("These files exceed Cloudflare's 25 MiB per-asset limit:\n  " + tooBig.join("\n  "));
  process.exit(1);
}
console.log("assets ok: every file is under 25 MiB");
