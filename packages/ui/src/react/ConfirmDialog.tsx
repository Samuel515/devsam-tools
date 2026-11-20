// A styled confirmation dialog built on the native <dialog> element, which gives a real
// modal for free: focus stays inside, Escape cancels, and the page behind is inert.
import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a warning, for actions that discard work. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      // Escape key and the browser's own close both count as cancelling.
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      // A click on the backdrop (outside the panel) cancels too.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="confirm-dialog m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-elev p-0 text-fg shadow-2xl"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {children && (
          <div id={bodyId} className="mt-2 text-sm leading-relaxed text-muted">
            {children}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          {/* The safe choice gets focus first, so Enter never discards work by accident. */}
          <button type="button" className="btn" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? "border-transparent bg-danger text-white hover:opacity-90" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
