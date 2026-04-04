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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/30"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            {backButton && (
              <button
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                onClick={backButton.onClick}
              >
                {backButton.label}
              </button>
            )}
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button className="rounded-md px-2 py-1 text-sm text-slate-600" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
