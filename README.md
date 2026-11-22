# devsam tools

Browser-only utilities. Files are processed locally and never uploaded.

| Tool | Site | App |
| --- | --- | --- |
| Markdown Reader | [md.devsamc.xyz](https://md.devsamc.xyz) | `apps/md` |
| Image Converter | [image.devsamc.xyz](https://image.devsamc.xyz) | `apps/image` |
| PDF to Image | [pdf2img.devsamc.xyz](https://pdf2img.devsamc.xyz) | `apps/pdf2img` |
| Image Compressor | [compress.devsamc.xyz](https://compress.devsamc.xyz) | `apps/compress` |
| PDF Toolkit | [pdf.devsamc.xyz](https://pdf.devsamc.xyz) | `apps/pdf` |
| QR Code Generator | [qr.devsamc.xyz](https://qr.devsamc.xyz) | `apps/qr` |
| Dev Formatter | [dev.devsamc.xyz](https://dev.devsamc.xyz) | `apps/dev` |
| Code Minifier | [minify.devsamc.xyz](https://minify.devsamc.xyz) | `apps/minify` |
| JavaScript Obfuscator | [obfuscate.devsamc.xyz](https://obfuscate.devsamc.xyz) | `apps/obfuscate` |
| Background Remover | [bg.devsamc.xyz](https://bg.devsamc.xyz) | `apps/bg` |
| Image Resizer | [resize.devsamc.xyz](https://resize.devsamc.xyz) | `apps/resize` |
| PDF Compressor | [pdfcompress.devsamc.xyz](https://pdfcompress.devsamc.xyz) | `apps/pdfcompress` |
| Word Counter | [words.devsamc.xyz](https://words.devsamc.xyz) | `apps/words` |
| Password Generator | [password.devsamc.xyz](https://password.devsamc.xyz) | `apps/password` |

## Stack

- Astro (static) with React islands, Tailwind CSS v4
- npm workspaces: one app per tool in `apps/`, shared code in `packages/ui`
- WebAssembly codecs (mozjpeg, libwebp, libavif) in a Web Worker
- pdf.js and pdf-lib for PDFs
- transformers.js for background removal: BiRefNet (MIT) on WebGPU, U-2-Net (Apache-2.0) on CPU

```
apps/<tool>/          Astro site + wrangler.jsonc
packages/ui/src/
  tools.ts            tool registry (names, hues, related tools)
  config.ts           shared settings
  layouts/            ToolLayout (head, meta, JSON-LD, header/footer)
  components/         shared page sections
  react/              Dropzone, dialogs, small controls
  lib/                image codecs, PDF rendering, file helpers
  styles/base.css     tokens and component styles
scripts/              scaffolding, icons, OG images, checks
```

## Development

Node 22+.

```sh
npm install
npm run dev -w apps/md
npm run build -w apps/md
npm run build            # all apps
npm run seo              # titles, descriptions, H1s, canonicals, sitemaps
npm run lighthouse       # needs Edge
```

New tool: add it to `packages/ui/src/tools.ts`, run `node scripts/new-app.mjs <slug>`, `npm install`, then `npm run og` and `npm run icons`.

## Deploy

Each app is a separate Cloudflare Worker built from the repo root:

| | |
| --- | --- |
| Root directory | *(empty)* |
| Build | `npm run build -w apps/<tool>` |
| Deploy | `npx wrangler deploy --config apps/<tool>/wrangler.jsonc` |
| Watch paths | `apps/<tool>/*`, `packages/*`, `package-lock.json` |

The Worker name must match `name` in the app's `wrangler.jsonc`, which also defines the custom domain. Builds run `scripts/check-assets.mjs` to stay under the 25 MiB per-asset limit.

## License

MIT
