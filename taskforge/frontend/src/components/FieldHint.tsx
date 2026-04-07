export default function FieldHint({
  label,
}: {
  label: string;
}) {
  return (
    <span className="st-tooltip">
      <button
        type="button"
        className="st-tooltip-trigger"
        aria-label={label}
      >
        ?
      </button>
      <span className="st-tooltip-content" role="tooltip">
        {label}
      </span>
    </span>
  );
}
