import { RecurringItem } from "../types";

export default function RecurringItemRow({
  item,
  checked,
  onToggle,
  disabled = false,
}: {
  item: RecurringItem;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`group flex w-full items-center justify-between gap-3 rounded-xl border bg-white p-4 text-left transition ${
        disabled ? "cursor-not-allowed opacity-70" : "hover:bg-slate-50"
      } ${checked ? "border-emerald-200" : "border-slate-200"}`}
      aria-pressed={checked}
    >
      <div className="min-w-0">
        <p className={`font-semibold ${checked ? "text-emerald-900 line-through" : "text-slate-900"}`}>
          {item.name}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
          {item.cadence_type}
        </p>
      </div>
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg ${
          checked
            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
            : "border-slate-300 text-slate-500"
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
    </button>
  );
}
