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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Habits</h2>
          <p className="text-slate-600">Daily rhythms, calmly executed.</p>
        </div>
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => setCreateOpen(true)}
        >
          Add Habit
        </button>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Due Today</h3>
        <div className="grid gap-2">
          {grouped.dueToday.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
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
        <section key={group} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group}</h3>
          <div className="grid gap-2">
            {grouped[group].length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
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

