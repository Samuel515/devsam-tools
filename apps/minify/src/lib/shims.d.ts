// Types for libraries that don't ship their own.
declare module "csso" {
  export function minify(css: string, options?: { restructure?: boolean; comments?: boolean | "exclamation" | "first-exclamation" }): { css: string };
}

declare module "html-minifier-terser/dist/htmlminifier.esm.bundle" {
  export function minify(html: string, options?: Record<string, unknown>): Promise<string>;
}
