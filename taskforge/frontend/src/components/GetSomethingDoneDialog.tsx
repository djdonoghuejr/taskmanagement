import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getSomethingDone } from "../api/tasks";
import { TaskSuggestion } from "../types";
import Modal from "./Modal";

export default function GetSomethingDoneDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState("");
  const [suggestion, setSuggestion] = useState<TaskSuggestion | null>(null);
  const [seenTaskIds, setSeenTaskIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const suggest = useMutation({
    mutationFn: (exclude_ids: string[] = []) =>
      getSomethingDone({ minutes: Number(minutes), exclude_ids }),
    onSuccess: (next) => {
      setSuggestion(next);
      setSeenTaskIds((prev) => (prev.includes(next.task.id) ? prev : [...prev, next.task.id]));
      setError(null);
    },
    onError: (err: Error) => {
      setSuggestion(null);
      setError(err.message || "No matching tasks found.");
    },
  });

  const reset = () => {
    setMinutes("");
    setSuggestion(null);
    setSeenTaskIds([]);
    setError(null);
    onClose();
  };

  const canSubmit = Number(minutes) > 0;

  const requestSuggestion = async (excludeIds: string[]) => {
    setError(null);
    setSuggestion(null);
    if (excludeIds.length === 0) {
      setSeenTaskIds([]);
    }
    await suggest.mutateAsync(excludeIds);
  };

  return (
    <Modal open={open} title="Get Something Done" onClose={reset}>
      <div className="grid gap-5">
        <div className="section-card">
          <p className="st-kicker text-[color:var(--st-brand)]">Quick focus</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">
            Tell SecreTerry how many minutes you have and it will pull a task that fits. If there are no estimated tasks in range, it will still nudge you toward something useful.
          </p>
        </div>

        <label className="text-sm">
          <span className="st-label">How much time do you have?</span>
          <div className="relative">
            <input
              type="number"
              min={1}
              className="st-input pr-20"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              placeholder="20"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[color:var(--st-ink-muted)]">
              minutes
            </span>
          </div>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            className="st-button-primary w-full disabled:opacity-50 sm:w-auto"
            disabled={!canSubmit || suggest.isPending}
            onClick={() => void requestSuggestion([])}
          >
            Find a task
          </button>
          {suggestion ? (
            <button
              className="st-button-secondary w-full sm:w-auto"
              disabled={suggest.isPending}
              onClick={() => void requestSuggestion(seenTaskIds)}
            >
              Give me another option
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-[color:rgba(179,74,74,0.18)] bg-[color:var(--st-danger-soft)] px-4 py-3 text-sm text-[color:var(--st-danger)]">
            {error === "No matching tasks found" ? "No non-completed tasks fit that request right now." : error}
          </div>
        ) : null}

        {suggestion ? (
          <div className="section-card">
            <p className="st-kicker text-[color:var(--st-accent)]">Suggested next step</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--st-ink)]">
              {suggestion.task.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">{suggestion.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={suggestion.selection_mode === "estimated" ? "st-badge st-badge-brand" : "st-badge"}>
                {suggestion.selection_mode === "estimated" ? "Matched to your time" : "Fallback suggestion"}
              </span>
              {suggestion.task.expected_minutes ? (
                <span className="st-badge">{suggestion.task.expected_minutes} min expected</span>
              ) : null}
              {suggestion.task.project_id ? <span className="st-badge">Project task</span> : null}
              <span
                className={
                  suggestion.task.status === "blocked"
                    ? "st-badge st-badge-warning"
                    : "st-badge"
                }
              >
                {suggestion.task.status}
              </span>
            </div>
            {suggestion.task.description ? (
              <p className="mt-4 text-sm leading-6 text-[color:var(--st-ink-soft)]">{suggestion.task.description}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
