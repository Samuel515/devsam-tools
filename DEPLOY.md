# Deploying devsam tools to Cloudflare

Every tool is its own website on its own subdomain, so **each tool is its own Cloudflare Worker**. All of them are built from this one repository.

## Why the first deploy failed

The first Cloudflare project pointed at the whole repository and ran `npx wrangler deploy` from the root. The root holds many sites in one npm workspace, so Wrangler couldn't tell which one to deploy:

```
✘ [ERROR] The Cloudflare application detection logic has been run in the root of a workspace
instead of targeting a specific project.
```

The fix is one Worker per tool. Each Worker builds only its own app and deploys with that app's `wrangler.jsonc`.

## The tools

| Tool | Worker name | App folder | Subdomain |
| --- | --- | --- | --- |
| Markdown Reader | `devsam-md` | `apps/md` | md.devsamc.xyz |
| Image Converter | `devsam-image` | `apps/image` | image.devsamc.xyz |
| PDF to Image | `devsam-pdf2img` | `apps/pdf2img` | pdf2img.devsamc.xyz |
| Image Compressor | `devsam-compress` | `apps/compress` | compress.devsamc.xyz |
| PDF Toolkit | `devsam-pdf` | `apps/pdf` | pdf.devsamc.xyz |
| QR Code Generator | `devsam-qr` | `apps/qr` | qr.devsamc.xyz |
| Dev Formatter | `devsam-dev` | `apps/dev` | dev.devsamc.xyz |
| Code Minifier | `devsam-minify` | `apps/minify` | minify.devsamc.xyz |
| JavaScript Obfuscator | `devsam-obfuscate` | `apps/obfuscate` | obfuscate.devsamc.xyz |
| Background Remover | `devsam-bg` | `apps/bg` | bg.devsamc.xyz |
| Image Resizer | `devsam-resize` | `apps/resize` | resize.devsamc.xyz |
| PDF Compressor | `devsam-pdfcompress` | `apps/pdfcompress` | pdfcompress.devsamc.xyz |
| Word Counter | `devsam-words` | `apps/words` | words.devsamc.xyz |
| Password Generator | `devsam-password` | `apps/password` | password.devsamc.xyz |

In the steps below, replace `md` with the tool's short name from the App folder column.

## 1. Fix the existing project

The Worker you already created deploys from the root, so it will keep failing. Either:

- **Delete it.** Open it under **Workers & Pages**, then **Settings → Delete**. This is simplest.
- **Or reuse it for one tool.** Rename it to a Worker name from the table, such as `devsam-md`, and change its build settings as in step 2.

The Worker name in Cloudflare **must match** the `name` in that app's `wrangler.jsonc`, or the deploy fails.

## 2. Create one Worker per tool

Repeat for each tool. This example is the Markdown Reader.

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Workers → Import a repository**.
2. Choose GitHub and pick **Samuel515/devsam-tools**.
3. Set **Project name** to `devsam-md`.
4. Open **Advanced settings** or **Build settings** and enter exactly:

| Setting | Value |
| --- | --- |
| Root directory | leave empty: the repository root |
| Build command | `npm run build -w apps/md` |
| Deploy command | `npx wrangler deploy --config apps/md/wrangler.jsonc` |
| Non-production branch deploy command | `npx wrangler versions upload --config apps/md/wrangler.jsonc` |

5. Click **Create and deploy**.

**Keep the root directory empty.** The apps share one `package-lock.json` and the shared `packages/ui` folder at the repository root. If the root directory is set to `apps/md`, the install step can't find them.

### The subdomain is automatic

Each `wrangler.jsonc` contains:

```jsonc
"routes": [{ "pattern": "md.devsamc.xyz", "custom_domain": true }]
```

On the first deploy, Cloudflare creates the DNS record and SSL certificate for `md.devsamc.xyz` itself. This works because `devsamc.xyz` is in the same Cloudflare account.

**If that subdomain already has a DNS record**, for example a CNAME you made by hand, delete it first under **DNS → Records**. Otherwise the deploy fails with a "record already exists" error.

## 3. Only rebuild the tool that changed

By default every push rebuilds every Worker. To rebuild a tool only when its own code changes:

1. Open the Worker, then go to **Settings → Build → Build watch paths**.
2. Under **Include paths**, enter:

```
apps/md/*
packages/*
package-lock.json
```

Changes to `packages/ui` affect every tool, so they still rebuild all of them, which is what you want.

## Deploying from your computer instead

You can also deploy without the dashboard:

```sh
npx wrangler login                                    # once
npm run build -w apps/md
npx wrangler deploy --config apps/md/wrangler.jsonc
```

## Using Cloudflare Pages instead of Workers

Workers are recommended because the subdomain is set up automatically. If you prefer Pages, create a Pages project per tool with:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build -w apps/md` |
| Build output directory | `apps/md/dist` |
| Root directory | leave empty |

Then add `md.devsamc.xyz` under the project's **Custom domains** tab. Pages ignores `wrangler.jsonc`.

## After deploying

- **Check each site.** Open the subdomain, and also `/privacy`, `/ads.txt` and `/sitemap-index.xml`.
- **Submit to Google.** Add each subdomain in Google Search Console and submit its `sitemap-index.xml`.
- **Apply for AdSense.** Apply once the sites are live and have been indexed for a few weeks. When approved, put your publisher ID and ad slot IDs in `packages/ui/src/config.ts` and push. Every tool picks them up, and `ads.txt` updates automatically.

## Troubleshooting

**"The directory specified by the assets.directory field … does not exist"**

The build command built a different tool than the deploy command deploys. Both commands must use the same tool name. For the Background Remover:

```
Build command:   npm run build -w apps/bg
Deploy command:  npx wrangler deploy --config apps/bg/wrangler.jsonc
```

Check the build log line `Executing user build command:`. It must show exactly one `npm run build -w apps/<tool>`.

**"The Cloudflare application detection logic has been run in the root of a workspace"**

The deploy command is missing `--config apps/<tool>/wrangler.jsonc`.

**"A DNS record already exists"**

Delete the existing record for that subdomain under **DNS → Records**, then retry the deployment.

**The Worker name doesn't match**

The project name in Cloudflare must equal the `name` in the app's `wrangler.jsonc`, for example `devsam-bg`.

**"Asset too large … up to 25 MiB"**

Workers reject any single file over 25 MiB. Every app's build now ends with `scripts/check-assets.mjs`, which fails the build early if a file is too large. The Background Remover's build also drops ONNX Runtime's 25.6 MiB WebAssembly file, which Vite copies in but the page never uses: transformers.js loads that engine from the jsDelivr CDN at runtime.
