import { useEffect } from "react";

export default function FloatingNotice({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="st-toast" role="status" aria-live="polite">
      <div className="st-toast-icon">✓</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[color:var(--st-ink)]">Task created</p>
        <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">{message}</p>
      </div>
      <button type="button" className="st-toast-close" onClick={onClose} aria-label="Dismiss success message">
        Close
      </button>
    </div>
  );
}
