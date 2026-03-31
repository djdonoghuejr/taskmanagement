import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listRecurring,
  completeRecurring,
  undoRecurringCompletion,
  listRecurringCompletions,
  createRecurring,
} from "../api/recurring";
import RecurringItemRow from "../components/RecurringItemRow";
import RecurringForm from "../components/forms/RecurringForm";
import { isDueOn } from "../utils/recurring";

export default function RecurringChecklist() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: recurring = [] } = useQuery({
    queryKey: ["recurring"],
    queryFn: listRecurring,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["recurring", "completions", today],
    queryFn: () => listRecurringCompletions(today),
  });

  const completionIds = new Set(completions.map((c) => c.recurring_item_id));
  const todayDate = new Date();

  const grouped = {
    daily: recurring.filter((r) => r.cadence_type === "daily"),
    weekly: recurring.filter((r) => r.cadence_type === "weekly"),
    monthly: recurring.filter((r) => r.cadence_type === "monthly"),
    custom: recurring.filter((r) => r.cadence_type === "custom"),
  };

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

  const addRecurring = useMutation({
    mutationFn: createRecurring,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring"] }),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Recurring Checklist</h2>
      <RecurringForm onSubmit={(payload) => addRecurring.mutate(payload)} />
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </h3>
          <div className="grid gap-2">
            {items.map((item) => {
              const dueToday = isDueOn(todayDate, item);
              return (
                <div key={item.id} className={dueToday ? "" : "opacity-60"}>
                  <RecurringItemRow
                    item={item}
                    checked={completionIds.has(item.id)}
                    onToggle={() => dueToday && toggleCompletion.mutate(item.id)}
                    disabled={!dueToday}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
