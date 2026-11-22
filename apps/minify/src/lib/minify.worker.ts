/// <reference path="./shims.d.ts" />
// Minifies code off the main thread. Each language's library loads only when first used.
export type Lang = "js" | "css" | "html" | "json";

export type JsOptions = { mangle: boolean; dropConsole: boolean; keepLicense: boolean; module: boolean };
export type CssOptions = { restructure: boolean; keepLicense: boolean };
export type HtmlOptions = { minifyInline: boolean; removeComments: boolean; collapseBooleans: boolean };

export type Job = {
  id: number;
  lang: Lang;
  code: string;
  js: JsOptions;
  css: CssOptions;
  html: HtmlOptions;
};

export type Result = { id: number; output?: string; error?: string; line?: number; column?: number };

async function minifyJs(code: string, o: JsOptions) {
  const { minify } = await import("terser");
  const out = await minify(code, {
    module: o.module,
    compress: { drop_console: o.dropConsole, passes: 2 },
    mangle: o.mangle,
    format: { comments: o.keepLicense ? /@license|@preserve|^!/ : false },
  });
  return out.code ?? "";
}

async function minifyCss(code: string, o: CssOptions) {
  const { minify } = await import("csso");
  return minify(code, { restructure: o.restructure, comments: o.keepLicense ? "exclamation" : false }).css;
}

async function minifyHtml(code: string, o: HtmlOptions) {
  // The browser bundle: the package entry point pulls in Node-only code.
  const { minify } = await import("html-minifier-terser/dist/htmlminifier.esm.bundle");
  return minify(code, {
    collapseWhitespace: true,
    conservativeCollapse: false,
    removeComments: o.removeComments,
    collapseBooleanAttributes: o.collapseBooleans,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: o.minifyInline,
    minifyJS: o.minifyInline,
    sortAttributes: true,
    sortClassName: false,
  });
}

self.onmessage = async (e: MessageEvent<Job>) => {
  const job = e.data;
  const reply = (r: Omit<Result, "id">) => (self as unknown as Worker).postMessage({ id: job.id, ...r });
  try {
    let output = "";
    if (job.lang === "js") output = await minifyJs(job.code, job.js);
    else if (job.lang === "css") output = await minifyCss(job.code, job.css);
    else if (job.lang === "html") output = await minifyHtml(job.code, job.html);
    else output = JSON.stringify(JSON.parse(job.code));
    reply({ output });
  } catch (err) {
    const x = err as { message?: string; line?: number; col?: number; column?: number };
    reply({
      error: (x.message || "Couldn't minify this code.").replace(/^Error: /, ""),
      line: x.line,
      column: x.col ?? x.column,
    });
  }
};
