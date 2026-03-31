import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTasks } from "../api/tasks";
import {
  listRecurring,
  completeRecurring,
  undoRecurringCompletion,
  getRecurringMetrics,
  listRecurringCompletions,
} from "../api/recurring";
import RecurringItemRow from "../components/RecurringItemRow";
import TaskCard from "../components/TaskCard";
import MetricsCard from "../components/MetricsCard";
import { isDueOn } from "../utils/recurring";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const { data: recurring = [] } = useQuery({
    queryKey: ["recurring"],
    queryFn: listRecurring,
  });
  const { data: completions = [] } = useQuery({
    queryKey: ["recurring", "completions", today],
    queryFn: () => listRecurringCompletions(today),
  });
  const { data: metrics = [] } = useQuery({
    queryKey: ["recurring", "metrics"],
    queryFn: getRecurringMetrics,
  });

  const completionIds = new Set(completions.map((c) => c.recurring_item_id));
  const todayDate = new Date();
  const dueToday = recurring.filter((item) => isDueOn(todayDate, item));

  const toggleCompletion = useMutation({
    mutationFn: async (id: string) => {
      if (completionIds.has(id)) {
        return undoRecurringCompletion(id, today);
      }
      return completeRecurring(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", "completions", today] });
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
        <h3 className="text-lg font-semibold">Today's Recurring Items</h3>
        <div className="grid gap-2">
          {dueToday.map((item) => (
            <RecurringItemRow
              key={item.id}
              item={item}
              checked={completionIds.has(item.id)}
              onToggle={() => toggleCompletion.mutate(item.id)}
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
        <h3 className="text-lg font-semibold">Recurring Metrics</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <MetricsCard
              key={metric.recurring_item_id}
              title={metric.recurring_item_id.slice(0, 8)}
              metrics={metric}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
