import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeHabit,
  listHabits,
  listHabitCompletions,
  undoHabitCompletion,
} from "../api/habits";
import HabitDialog from "../components/HabitDialog";
import HabitRow from "../components/HabitRow";
import { isDueOn } from "../utils/habits";
import { Habit } from "../types";

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: listHabits,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["habits", "completions", today],
    queryFn: () => listHabitCompletions(today),
  });

  const completionIds = useMemo(() => new Set(completions.map((c) => c.habit_id)), [completions]);

  const toggleCompletion = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      if (completionIds.has(id)) {
        return undoHabitCompletion(id, today);
      }
      return completeHabit(id, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", "completions", today] });
    },
  });

  const grouped = useMemo(() => {
    return {
      dueToday: habits.filter((h) => isDueOn(new Date(), h)),
      daily: habits.filter((h) => h.cadence_type === "daily"),
      weekly: habits.filter((h) => h.cadence_type === "weekly"),
      monthly: habits.filter((h) => h.cadence_type === "monthly"),
      custom: habits.filter((h) => h.cadence_type === "custom"),
    };
  }, [habits]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="st-kicker text-[color:var(--st-habit)]">Rhythm builder</p>
          <h2 className="page-title mt-2">Habits</h2>
          <p className="page-subtitle">Recurring commitments with a cleaner cadence, stronger status cues, and better daily momentum.</p>
        </div>
        <button className="st-button-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          Add Habit
        </button>
      </div>

      <section className="section-card space-y-4">
        <div>
          <p className="st-kicker text-[color:var(--st-habit)]">Today&apos;s rhythm</p>
          <h3 className="section-title mt-2">Due Today</h3>
        </div>
        <div className="grid gap-2">
          {grouped.dueToday.length === 0 && (
            <div className="st-surface p-4 text-sm text-[color:var(--st-ink-soft)]">
              No habits due today.
            </div>
          )}
          {grouped.dueToday.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              checked={completionIds.has(habit.id)}
              onToggle={() => toggleCompletion.mutate({ id: habit.id })}
              onOpen={() => setSelectedHabit(habit)}
            />
          ))}
        </div>
      </section>

      {(["daily", "weekly", "monthly", "custom"] as const).map((group) => (
        <section key={group} className="section-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="section-title capitalize">{group}</h3>
            <span className="st-badge st-badge-habit">{grouped[group].length} items</span>
          </div>
          <div className="grid gap-2">
            {grouped[group].length === 0 && (
              <div className="st-surface p-4 text-sm text-[color:var(--st-ink-soft)]">
                No habits.
              </div>
            )}
            {grouped[group].map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                checked={completionIds.has(habit.id)}
                onToggle={() => toggleCompletion.mutate({ id: habit.id })}
                onOpen={() => setSelectedHabit(habit)}
                disabled={!isDueOn(new Date(), habit)}
              />
            ))}
          </div>
        </section>
      ))}

      <HabitDialog
        open={createOpen}
        habit={null}
        today={today}
        completedToday={false}
        onClose={() => setCreateOpen(false)}
      />
      <HabitDialog
        open={Boolean(selectedHabit)}
        habit={selectedHabit}
        today={today}
        completedToday={selectedHabit ? completionIds.has(selectedHabit.id) : false}
        onClose={() => setSelectedHabit(null)}
      />
    </div>
  );
}
