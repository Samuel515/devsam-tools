// Markdown -> safe HTML, plus a table of contents.
import { Marked, type Tokens } from "marked";
import DOMPurify from "dompurify";

export type TocItem = { id: string; text: string; depth: number };

type Highlighter = {
  highlight: (code: string, opts: { language: string }) => { value: string };
  highlightAuto: (code: string) => { value: string; language?: string };
  getLanguage: (name: string) => unknown;
};

let hljs: Highlighter | null = null;

/** Loads highlight.js on demand so the first paint stays fast. */
export async function loadHighlighter() {
  if (hljs) return;
  const mod = await import("highlight.js/lib/common");
  hljs = mod.default as unknown as Highlighter;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-") || "section"
  );
}

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // External links open in a new tab, safely.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") ?? "";
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
}

export function render(markdown: string): { html: string; toc: TocItem[] } {
  if (typeof window !== "undefined") installHooks();
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const base = slugify(text);
        const n = used.get(base) ?? 0;
        used.set(base, n + 1);
        const id = n ? `${base}-${n}` : base;
        toc.push({ id, text: inner.replace(/<[^>]+>/g, ""), depth });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? "").trim().split(/\s+/)[0] ?? "";
        let body = escapeHtml(text);
        let label = language;
        if (hljs) {
          try {
            if (language && hljs.getLanguage(language)) {
              body = hljs.highlight(text, { language }).value;
            } else if (!language && text.length < 20_000) {
              const auto = hljs.highlightAuto(text);
              body = auto.value;
            }
          } catch {
            /* fall back to plain text */
          }
        }
        return `<div class="code-block"><div class="code-head"><span>${escapeHtml(label || "text")}</span><button type="button" class="copy-code">Copy</button></div><pre><code class="hljs${language ? ` language-${escapeHtml(language)}` : ""}">${body}</code></pre></div>\n`;
      },
    },
  });

  const raw = (marked.parse(markdown, { async: false }) as string)
    // Task-list checkboxes need an accessible name.
    .replace(/<input checked="" disabled="" type="checkbox">/g, '<input checked="" disabled="" type="checkbox" aria-label="Done">')
    .replace(/<input disabled="" type="checkbox">/g, '<input disabled="" type="checkbox" aria-label="Not done">');
  // Prerendering on the server only ever renders the built-in sample, which is
  // trusted. Everything a visitor opens is rendered and sanitised in the browser.
  if (typeof window === "undefined") return { html: raw, toc };
  const html = DOMPurify.sanitize(raw, {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["button"],
  });
  return { html, toc };
}

export function stats(text: string) {
  const words = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
  return {
    words,
    chars: text.length,
    lines: text ? text.split("\n").length : 0,
    minutes: Math.max(1, Math.round(words / 230)),
  };
}

/** Turns GitHub/GitLab "blob" page links into raw file links that allow cross-origin fetches. */
export function toRawUrl(input: string): string {
  const url = new URL(input.trim());
  if (url.hostname === "github.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[2] === "blob" && parts.length > 4) {
      return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join("/")}`;
    }
  }
  if (url.hostname === "gitlab.com" && url.pathname.includes("/-/blob/")) {
    url.pathname = url.pathname.replace("/-/blob/", "/-/raw/");
  }
  return url.toString();
}

/** A standalone HTML file with readable built-in styles. */
export function toStandaloneHtml(title: string, bodyHtml: string) {
  const css = `
  :root{color-scheme:light dark}
  body{max-width:760px;margin:0 auto;padding:48px 24px;font:16px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2328;background:#fff}
  @media (prefers-color-scheme:dark){body{color:#e6edf3;background:#0d1117}pre,code{background:#161b22!important;border-color:#30363d!important}th{background:#161b22!important}th,td{border-color:#30363d!important}}
  h1,h2,h3,h4{line-height:1.25;margin:1.6em 0 .6em}h1{font-size:2em;margin-top:0}h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid #d0d7de55}
  a{color:#0969da}.anchor{display:none}
  code{font:.875em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;padding:.1em .35em}
  pre{background:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:14px 16px;overflow:auto}pre code{border:0;padding:0;background:none}
  .code-head{display:none}blockquote{margin:0;padding:.2em 1em;border-left:4px solid #d0d7de;color:#59636e}
  table{border-collapse:collapse;display:block;overflow:auto}th,td{border:1px solid #d0d7de;padding:6px 12px}th{background:#f6f8fa}
  img{max-width:100%}hr{border:0;border-top:1px solid #d0d7de;margin:2em 0}
  li:has(>input[type=checkbox]){list-style:none}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
${bodyHtml.replace(/<button type="button" class="copy-code">Copy<\/button>/g, "")}
</body>
</html>
`;
}
