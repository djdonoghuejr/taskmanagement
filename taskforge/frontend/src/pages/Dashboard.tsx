import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTasks } from "../api/tasks";
import {
  listHabits,
  completeHabit,
  undoHabitCompletion,
  getHabitMetrics,
  listHabitCompletions,
} from "../api/habits";
import HabitRow from "../components/HabitRow";
import TaskCard from "../components/TaskCard";
import MetricsCard from "../components/MetricsCard";
import { isDueOn } from "../utils/habits";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: listHabits,
  });
  const { data: completions = [] } = useQuery({
    queryKey: ["habits", "completions", today],
    queryFn: () => listHabitCompletions(today),
  });
  const { data: metrics = [] } = useQuery({
    queryKey: ["habits", "metrics"],
    queryFn: getHabitMetrics,
  });

  const completionIds = new Set(completions.map((c) => c.habit_id));
  const todayDate = new Date();
  const dueToday = habits.filter((item) => isDueOn(todayDate, item));

  const toggleCompletion = useMutation({
    mutationFn: async (id: string) => {
      if (completionIds.has(id)) {
        return undoHabitCompletion(id, today);
      }
      return completeHabit(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", "completions", today] });
    },
  });

  const overdue = useMemo(() => {
    const now = new Date();
    return tasks.filter(
      (t) => t.status === "pending" && t.due_date && new Date(t.due_date) < now
    );
  }, [tasks]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    return tasks.filter(
      (t) =>
        t.status === "pending" &&
        t.due_date &&
        new Date(t.due_date) >= now &&
        new Date(t.due_date) <= nextWeek
    );
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="text-slate-500">Today is {new Date().toLocaleDateString()}</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Today's Habits</h3>
        <div className="grid gap-2">
          {dueToday.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              checked={completionIds.has(habit.id)}
              onToggle={() => toggleCompletion.mutate(habit.id)}
              onOpen={() => {}}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Overdue Tasks</h3>
          <div className="grid gap-2">
            {overdue.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
          <div className="grid gap-2">
            {upcoming.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Habit Metrics</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <MetricsCard
              key={metric.habit_id}
              title={metric.habit_id.slice(0, 8)}
              metrics={metric}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
