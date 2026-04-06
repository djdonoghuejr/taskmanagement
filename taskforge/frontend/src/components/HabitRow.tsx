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
      className={`st-surface group flex w-full items-center justify-between gap-4 p-4 text-left transition ${
        disabled ? "cursor-not-allowed opacity-70" : "hover:-translate-y-0.5 hover:bg-white"
      } ${checked ? "border-[color:rgba(31,138,98,0.2)]" : ""}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className="min-w-0 flex-1"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-base font-bold ${checked ? "text-[color:var(--st-success)] line-through" : "text-[color:var(--st-ink)]"}`}>
            {habit.name}
          </p>
          <span className="st-badge st-badge-habit">Habit</span>
        </div>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--st-ink-muted)]">
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
        className={`st-complete-ring h-11 w-11 shrink-0 text-lg ${checked ? "st-complete-ring-success st-celebrate" : "text-[color:var(--st-ink-muted)]"}`}
        aria-pressed={checked}
        aria-label={checked ? "Undo completion" : "Complete"}
      >
        ✓
      </button>
    </div>
  );
}
