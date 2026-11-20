import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = {
  onFiles: (files: File[]) => void;
  /** Value for the file input's accept attribute, e.g. "image/*,.heic". */
  accept?: string;
  multiple?: boolean;
  /** Main line, e.g. "Drop images here". */
  title: string;
  /** Second line, e.g. "PNG, JPG, WebP, AVIF, HEIC, GIF, BMP, SVG". */
  hint?: string;
  /** Also accept files pasted with Ctrl+V anywhere on the page. */
  listenPaste?: boolean;
  compact?: boolean;
  children?: ReactNode;
};

/** Filters dropped files using the same rules as the input's accept attribute. */
function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith(".")) return name.endsWith(rule);
      if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
      return type === rule;
    });
}

export function Dropzone({ onFiles, accept, multiple = true, title, hint, listenPaste = true, compact = false, children }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [rejected, setRejected] = useState(0);
  const depth = useRef(0);

  const take = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const all = Array.from(list);
      const ok = all.filter((f) => matchesAccept(f, accept));
      setRejected(all.length - ok.length);
      if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
    },
    [accept, multiple, onFiles],
  );

  useEffect(() => {
    if (!listenPaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        take(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [listenPaste, take]);

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`dropzone ${compact ? "px-4 py-6" : "px-6 py-14 sm:py-20"}`}
        data-active={active}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current++;
          setActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setActive(false);
          take(e.dataTransfer.files);
        }}
      >
        <span className={`grid place-items-center rounded-2xl bg-accent-soft text-accent ${compact ? "size-10" : "size-14"}`}>
          <svg className={compact ? "size-5" : "size-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
          </svg>
        </span>
        <span className={`font-medium ${compact ? "text-sm" : "text-base sm:text-lg"}`}>{title}</span>
        <span id={`${inputId}-hint`} className="text-sm text-muted">
          or <span className="text-accent underline underline-offset-4">browse your files</span>
          {listenPaste && !compact && (
            <span className="hidden sm:inline">
              {" "}· paste with <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">V</kbd>
            </span>
          )}
        </span>
        {hint && <span className="mt-1 font-mono text-xs text-subtle">{hint}</span>}
        {children}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          aria-describedby={`${inputId}-hint`}
          className="sr-only"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            take(e.currentTarget.files);
            e.currentTarget.value = "";
          }}
        />
      </label>
      {rejected > 0 && (
        <p className="mt-2 text-sm text-danger" role="status">
          {rejected === 1 ? "1 file was skipped" : `${rejected} files were skipped`} because the format isn't supported.
        </p>
      )}
    </div>
  );
}
