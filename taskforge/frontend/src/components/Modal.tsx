import { useEffect, type ReactNode } from "react";

export default function Modal({
  open,
  title,
  onClose,
  backButton,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  backButton?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="st-modal-shell">
      <button
        className="st-modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="st-modal-card">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--st-border)] px-5 py-4 md:px-6">
          <div className="flex items-center gap-2">
            {backButton && (
              <button
                className="st-button-secondary px-3 py-2 text-sm"
                onClick={backButton.onClick}
              >
                {backButton.label}
              </button>
            )}
            <div>
              <p className="st-kicker text-[color:var(--st-brand)]">SecreTerry</p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight">{title}</h3>
            </div>
          </div>
          <button className="rounded-2xl px-3 py-2 text-sm font-semibold text-[color:var(--st-ink-soft)] hover:bg-black/5" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}
