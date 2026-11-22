// A lazily rendered PDF page thumbnail: it renders only when scrolled into view.
import { useEffect, useRef, useState } from "react";
import { renderThumb, type PDFDocumentProxy } from "../lib/pdf";

export function PdfThumb({
  doc,
  pageNumber,
  width = 160,
  rotation = 0,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width?: number;
  /** Extra rotation in degrees, applied visually. */
  rotation?: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        try {
          const page = await doc.getPage(pageNumber);
          const vp = page.getViewport({ scale: 1 });
          if (!cancelled) setRatio(vp.height / vp.width);
          const canvas = await renderThumb(page, width);
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
          if (blob && !cancelled) {
            url = URL.createObjectURL(blob);
            setSrc(url);
          }
        } catch {
          /* leave the placeholder */
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc, pageNumber, width]);

  const sideways = rotation % 180 !== 0;
  return (
    <div
      ref={holder}
      className="grid w-full place-items-center overflow-hidden"
      style={{ aspectRatio: `1 / ${Math.max(ratio, 1)}` }}
    >
      {src ? (
        <img
          src={src}
          alt={`Page ${pageNumber}`}
          className="max-h-full max-w-full bg-white shadow-sm transition-transform duration-300"
          style={{
            transform: `rotate(${rotation}deg)`,
            // A sideways page must fit the box's width with its height, and the box's height with its width.
            width: sideways ? `${100 * Math.min(1 / ratio, Math.max(ratio, 1))}%` : "100%",
          }}
          draggable={false}
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded bg-hover" />
      )}
    </div>
  );
}
