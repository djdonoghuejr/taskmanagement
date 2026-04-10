import { useEffect, useRef, useState } from "react";

export default function FieldHint({
  label,
}: {
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span className={`st-tooltip${open ? " st-tooltip-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="st-tooltip-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !rootRef.current?.contains(nextTarget)) {
            setOpen(false);
          }
        }}
      >
        ?
      </button>
      <span className="st-tooltip-content" role="tooltip" aria-hidden={!open}>
        {label}
      </span>
    </span>
  );
}
