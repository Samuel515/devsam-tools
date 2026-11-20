import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropzone } from "@devsam/ui/react/Dropzone";
import { Icon, icons, Segmented, Spinner, useCopy } from "@devsam/ui/react/ui";
import { baseName, downloadBlob } from "@devsam/ui/lib/files";
import { loadHighlighter, render, stats, toRawUrl, toStandaloneHtml } from "../lib/render";
import { SAMPLE } from "../lib/sample";

type View = "read" | "split" | "edit";
type Doc = { name: string; text: string };

const STORE_KEY = "md:doc";
const VIEW_KEY = "md:view";
const SIZE_KEY = "md:size";
const ACCEPT = ".md,.markdown,.mdown,.mkd,.mkdn,.mdx,.txt,text/markdown,text/plain";

export default function MarkdownApp() {
  const [doc, setDoc] = useState<Doc>({ name: "welcome.md", text: SAMPLE });
  const [view, setView] = useState<View>("read");
  const [size, setSize] = useState(17);
  const [ready, setReady] = useState(false);
  const [hlReady, setHlReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const { copied, copy } = useCopy();

  // Restore the last document, view and text size.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) setDoc(JSON.parse(saved) as Doc);
      const v = localStorage.getItem(VIEW_KEY) as View | null;
      if (v === "read" || v === "split" || v === "edit") setView(v);
      const s = Number(localStorage.getItem(SIZE_KEY));
      if (s >= 14 && s <= 22) setSize(s);
    } catch {}
    setReady(true);
    loadHighlighter().then(() => setHlReady(true));

    // Shareable links: md.devsamc.xyz/?url=https://github.com/...
    const remote = new URLSearchParams(location.search).get("url");
    if (remote) void openUrl(remote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (debounced).
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(doc));
      } catch {
        /* storage full: skip */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [doc, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(VIEW_KEY, view);
      localStorage.setItem(SIZE_KEY, String(size));
    } catch {}
  }, [view, size, ready]);

  // Rendering can be expensive for huge files, so defer it a little while typing.
  const [renderText, setRenderText] = useState(doc.text);
  useEffect(() => {
    const t = setTimeout(() => setRenderText(doc.text), doc.text.length > 50_000 ? 250 : 60);
    return () => clearTimeout(t);
  }, [doc.text]);

  const { html, toc } = useMemo(() => render(renderText), [renderText, hlReady]);
  const s = useMemo(() => stats(doc.text), [doc.text]);

  // Highlight the TOC entry for the heading currently in view.
  useEffect(() => {
    if (view !== "read" || !articleRef.current) return;
    const heads = Array.from(articleRef.current.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id]"));
    if (!heads.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [html, view]);

  const openFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError("");
    const text = await f.text();
    setDoc({ name: f.name, text });
    setView((v) => (v === "edit" ? "read" : v));
    window.scrollTo({ top: (document.getElementById("tool")?.offsetTop ?? 0) - 72, behavior: "smooth" });
  }, []);

  // Accept files dropped anywhere on the page.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) void openFiles(files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [openFiles]);

  async function openUrl(input: string) {
    setError("");
    let target: string;
    try {
      target = toRawUrl(input);
    } catch {
      setError("That doesn't look like a valid link.");
      return;
    }
    setLoadingUrl(true);
    try {
      const res = await fetch(target);
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      const text = await res.text();
      const name = decodeURIComponent(new URL(target).pathname.split("/").pop() || "remote.md");
      setDoc({ name, text });
      setUrlOpen(false);
      setUrl("");
      setView("read");
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "That site doesn't allow other pages to read its files. Try a GitHub, GitLab or raw file link, or download the file and open it."
          : `Couldn't open that link. ${(e as Error).message}`,
      );
    } finally {
      setLoadingUrl(false);
    }
  }

  // Copy buttons inside code blocks.
  const onArticleClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".copy-code");
    if (!btn) return;
    const code = btn.closest(".code-block")?.querySelector("code")?.textContent ?? "";
    void navigator.clipboard.writeText(code).then(() => {
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy"), 1400);
    });
  };

  // Keep the preview roughly in step with the editor in split view.
  const onEditorScroll = () => {
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (!ed || !pv || view !== "split") return;
    const ratio = ed.scrollTop / Math.max(1, ed.scrollHeight - ed.clientHeight);
    pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight);
  };

  // Tab inserts two spaces instead of leaving the editor.
  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    const next = doc.text.slice(0, a) + "  " + doc.text.slice(b);
    setDoc((d) => ({ ...d, text: next }));
    requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
  };

  const exportMd = () => downloadBlob(new Blob([doc.text], { type: "text/markdown;charset=utf-8" }), ensureExt(doc.name, "md"));
  const exportHtml = () =>
    downloadBlob(
      new Blob([toStandaloneHtml(baseName(doc.name), html)], { type: "text/html;charset=utf-8" }),
      `${baseName(doc.name)}.html`,
    );

  const isEmpty = !doc.text.trim();

  const article = (
    <article
      ref={articleRef}
      id="md-print"
      className="prose md-doc mx-auto max-w-[72ch]"
      style={{ fontSize: `${size}px` }}
      onClick={onArticleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  return (
    <div className="relative">
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-bg/80 backdrop-blur-sm">
          <div className="dropzone pointer-events-none px-16 py-12" data-active="true">
            <span className="text-lg font-medium">Drop to open</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <label className="btn btn-primary btn-sm cursor-pointer">
          <Icon d={icons.file} />
          Open file
          <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { void openFiles(Array.from(e.currentTarget.files ?? [])); e.currentTarget.value = ""; }} />
        </label>
        <button type="button" className="btn btn-sm" onClick={() => setUrlOpen((o) => !o)} aria-expanded={urlOpen}>
          Open URL
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            if (doc.text && !confirm("Start a new document? Your current text will be replaced.")) return;
            setDoc({ name: "untitled.md", text: "" });
            setView("edit");
            requestAnimationFrame(() => editorRef.current?.focus());
          }}
        >
          New
        </button>

        <div className="mx-auto order-last w-full sm:order-none sm:w-auto">
          <Segmented<View>
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "read", label: "Read" },
              { value: "split", label: <span><span className="hidden sm:inline">Split</span><span className="sm:hidden">Split</span></span> },
              { value: "edit", label: "Edit" },
            ]}
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-sm btn-icon hidden sm:inline-flex" aria-label="Smaller text" onClick={() => setSize((v) => Math.max(14, v - 1))}>
            <span className="text-xs">A−</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon hidden sm:inline-flex" aria-label="Larger text" onClick={() => setSize((v) => Math.min(22, v + 1))}>
            <span className="text-sm">A+</span>
          </button>
          <div className="relative">
            <button type="button" className="btn btn-sm" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu">
              <Icon d={icons.download} />
              Export
            </button>
            {menuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10 cursor-default" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} />
                <div role="menu" className="card fade-up absolute right-0 z-20 mt-2 w-56 p-1.5">
                  {[
                    { label: "Download .md", run: exportMd },
                    { label: "Download HTML", run: exportHtml },
                    { label: "Print or save as PDF", run: () => window.print() },
                    { label: copied ? "Copied" : "Copy HTML", run: () => void copy(html) },
                  ].map((item) => (
                    <button
                      key={item.label}
                      role="menuitem"
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-hover"
                      onClick={() => {
                        item.run();
                        if (!item.label.startsWith("Cop")) setMenuOpen(false);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {urlOpen && (
        <form
          className="no-print fade-up mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) void openUrl(url);
          }}
        >
          <input
            className="input"
            type="url"
            required
            placeholder="https://github.com/user/repo/blob/main/README.md"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            aria-label="Markdown file URL"
          />
          <button className="btn btn-primary" type="submit" disabled={loadingUrl}>
            {loadingUrl ? <Spinner /> : null}
            Open
          </button>
        </form>
      )}

      {error && (
        <p className="no-print mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* File name and stats */}
      <div className="no-print mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-subtle">
        <input
          className="min-w-0 max-w-[16rem] truncate rounded-md bg-transparent px-1 py-0.5 text-fg hover:bg-hover focus:bg-sunken focus:outline-none"
          value={doc.name}
          onChange={(e) => setDoc((d) => ({ ...d, name: e.target.value }))}
          aria-label="File name"
          spellCheck={false}
        />
        <span>{s.words.toLocaleString()} words</span>
        <span>{s.chars.toLocaleString()} characters</span>
        <span>{s.minutes} min read</span>
        <span className="ml-auto hidden sm:inline">Saved in this browser</span>
      </div>

      {/* Body */}
      <div className="mt-4">
        {view === "read" &&
          (isEmpty ? (
            <Dropzone onFiles={openFiles} accept={ACCEPT} multiple={false} title="Drop a Markdown file to read it" hint=".md · .markdown · .txt" />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
              <aside className="no-print hidden lg:block">
                {toc.length > 1 && (
                  <nav className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2" aria-label="Table of contents">
                    <p className="label mb-3">On this page</p>
                    <ul className="space-y-1 border-l border-line text-sm">
                      {toc
                        .filter((t) => t.depth <= 3)
                        .map((t) => (
                          <li key={t.id}>
                            <a
                              href={`#${t.id}`}
                              className={`-ml-px block border-l py-1 transition-colors ${
                                activeId === t.id ? "border-accent text-fg" : "border-transparent text-subtle hover:text-fg"
                              }`}
                              style={{ paddingLeft: `${(t.depth - 1) * 12 + 12}px` }}
                            >
                              {t.text}
                            </a>
                          </li>
                        ))}
                    </ul>
                  </nav>
                )}
              </aside>
              <div className="min-w-0 py-2">{article}</div>
            </div>
          ))}

        {view !== "read" && (
          <div className={`grid gap-4 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
            <textarea
              ref={editorRef}
              className="textarea h-[70vh] min-h-[420px] resize-none font-mono text-[14px]"
              value={doc.text}
              onChange={(e) => setDoc((d) => ({ ...d, text: e.target.value }))}
              onScroll={onEditorScroll}
              onKeyDown={onEditorKey}
              placeholder="# Start writing Markdown…"
              spellCheck={false}
              aria-label="Markdown editor"
            />
            {view === "split" && (
              <div ref={previewRef} className="h-[70vh] min-h-[420px] overflow-y-auto rounded-[0.65rem] border border-line bg-bg px-5 py-4">
                {article}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ensureExt(name: string, ext: string) {
  return /\.[a-z0-9]+$/i.test(name) ? name : `${name}.${ext}`;
}
