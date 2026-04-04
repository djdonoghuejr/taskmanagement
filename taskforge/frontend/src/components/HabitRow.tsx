import { Habit } from "../types";

export default function HabitRow({
  habit,
  checked,
  onToggle,
  onOpen,
  disabled = false,
}: {
  habit: Habit;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`group flex w-full items-center justify-between gap-3 rounded-xl border bg-white p-4 text-left transition ${
        disabled ? "cursor-not-allowed opacity-70" : "hover:bg-slate-50"
      } ${checked ? "border-emerald-200" : "border-slate-200"}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className="min-w-0 flex-1"
      >
        <p className={`font-semibold ${checked ? "text-emerald-900 line-through" : "text-slate-900"}`}>
          {habit.name}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
          {habit.cadence_type}
        </p>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg ${
          checked
            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
            : "border-slate-300 text-slate-500"
        }`}
        aria-pressed={checked}
        aria-label={checked ? "Undo completion" : "Complete"}
      >
        ✓
      </button>
    </div>
  );
}
