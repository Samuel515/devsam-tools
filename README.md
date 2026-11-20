# devsam tools

Free, open-source tools that run entirely in the browser. Files never leave the visitor's device, and there's no backend to run or pay for.

| Tool | Live site | Folder |
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

Built by [Samuel Ogbodo](https://devsamc.xyz). MIT licensed.

## How it's built

- **Astro** for static pages, with **React** islands for the tools themselves.
- **Tailwind CSS v4** with one shared design system. Each tool has its own accent colour.
- **npm workspaces.** Every tool is an app in `apps/`, and shared code lives in `packages/ui`.
- **WebAssembly codecs** such as mozjpeg, libwebp and libavif run in a Web Worker so pages stay responsive.
- **In-browser AI** for background removal: BiRefNet (MIT) on capable GPUs and U-2-Net (Apache-2.0) elsewhere, via transformers.js. Models download from Hugging Face once and are cached.

```
apps/<tool>/           one Astro site per tool, with its own wrangler.jsonc
packages/ui/src/
  tools.ts             the list of tools: names, taglines, accent hues
  config.ts            AdSense settings and shared links
  layouts/             ToolLayout: head, SEO, header, footer, theme
  components/          ToolHero, Explainer (how-to + FAQ), AdSlot, PrivacyPage, NotFoundPage
  react/               Dropzone, PdfThumb and small shared controls
  lib/                 image codecs, PDF rendering, file helpers
  styles/base.css      design tokens and component styles
scripts/new-app.mjs    scaffolds a new tool
```

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev -w apps/md            # http://localhost:4321
npm run build -w apps/md          # type-check and build one tool
npm run build                     # build every tool
```

## Add a new tool

1. Add an entry to `packages/ui/src/tools.ts` with a slug, name, tagline, hue and glyph.
2. Run `node scripts/new-app.mjs <slug>`. This creates the app with its privacy page, 404 page, favicon, ads.txt, robots.txt, headers and Worker config.
3. Run `npm install` to link the new workspace.
4. Write `src/pages/index.astro` and the tool's React component.
5. Run `npm run og` to generate its social share card at `public/og.png`.
6. Deploy it as described in [DEPLOY.md](DEPLOY.md).

## Ads

Ad slots are built in but stay hidden until AdSense is configured. Set the publisher ID and slot IDs in `packages/ui/src/config.ts`. The ad script, ad slots, `ads.txt` and the privacy policy's advertising section all switch on together.

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for exact Cloudflare settings. Each tool is its own Cloudflare Worker, built from this repository.
